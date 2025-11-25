import sql from 'mssql'
import { Type, type Static } from 'vv-config-jsonc'
import { Sleep } from '../util/sleep'
import type { TResult } from '../tresult'
import { secret } from '../util/crypt'

const ERROR_CONNECTION_LOST = ['ESOCKET', 'ECONNRESET', 'ETIMEDOUT', 'ConnectionError']
const MAX_RETRIES = 3

export const SConnectionMssql = Type.Object(
	{
		host: Type.String({ default: 'localhost' }),
		port: Type.Integer({ default: 1433 }),
		database: Type.String({ default: 'tempdb' }),
		login: Type.String({ default: 'USER' }),
		password: Type.String({ default: '123456' }),
		passwordCrypted: Type.Boolean({ default: false, description: 'use this app with arg --crypt <your_pass> for simple crypt pasword' }),
	},
	{ description: 'connection to Microsoft SQL' },
)
export type TConnectionMssql = Static<typeof SConnectionMssql>

export class DbMssql {
	private _busyScript = undefined as string | undefined
	private _connectionParams?: TConnectionMssql
	private _pool?: sql.ConnectionPool
	private _initScript = undefined as string | undefined

	private _isErrorConnectionLost(errMsg: string): boolean {
		if (!errMsg) return false
		const msg = errMsg.toUpperCase()
		for (const e of ERROR_CONNECTION_LOST) {
			if (msg.includes(e.toUpperCase())) return true
		}
		return false
	}

	private async _exec<T>(script: string, count: number): Promise<TResult<T>> {
		if (this._busyScript) {
			return { error: 'parallel exec not allowed', ok: false }
		}
		this._busyScript = script
		try {
			if (!this._pool || !this._pool.connected) {
				if (!this._connectionParams) return { error: 'use "open" for connect to database', ok: false }
				const openRes = await this.open(this._connectionParams, this._initScript)
				if (openRes.error) return { error: openRes.error, ok: false }
			}
			try {
				const result = await this._pool!.request().query<T>(script)
				return { result: result.recordset as T, ok: true }
			} catch (err: any) {
				const errMsg = err.message || ''
				if (!this._isErrorConnectionLost(errMsg) || count > MAX_RETRIES) {
					return { error: `error execute: ${errMsg}`, ok: false }
				}
				count++
				await Sleep(1000 * count)
				await this.close()
				return await this._exec(script, count)
			}
		} finally {
			this._busyScript = undefined
		}
	}

	constructor() {}

	async open(connectionParams: TConnectionMssql, initScript?: string): Promise<{ error?: string }> {
		await this.close()
		this._connectionParams = connectionParams
		this._initScript = initScript
		try {
			const config: sql.config = {
				server: connectionParams.host,
				port: connectionParams.port,
				database: connectionParams.database,
				user: connectionParams.login,
				password: connectionParams.passwordCrypted ? secret.decrypt(connectionParams.password) : connectionParams.password,
				options: {
					encrypt: false,
					trustServerCertificate: true,
				},
			}
			this._pool = new sql.ConnectionPool(config)
			await this._pool.connect()
			if (this._initScript) {
				const resInitExec = await this._exec(this._initScript, MAX_RETRIES + 1)
				if (!resInitExec.ok) {
					return { error: resInitExec.error }
				}
			}
			return {}
		} catch (err: any) {
			this._pool = undefined
			return { error: `error connect to MSSQL: ${err.message}` }
		}
	}

	async exec<T>(script: string): Promise<TResult<T>> {
		const res = await this._exec<T>(script, 0)
		return res
	}

	async close(): Promise<void> {
		if (!this._pool) return
		try {
			await this._pool.close()
		} catch {}
		this._pool = undefined
	}
}
