import oracledb from 'oracledb'
import { Type, type Static } from 'vv-config-jsonc'
import { Sleep } from '../util/sleep'
import type { TResult } from '../tresult'
import { secret } from '../util/crypt'

const ERROR_CONNECTION_LOST = ['ORA-03113', 'ORA-03114', 'ORA-03135', 'DPI-1010']
const MAX_RETRIES = 3

export const SConnectionOra = Type.Object(
	{
		host: Type.String({ default: 'localhost' }),
		port: Type.Integer({ default: 1521 }),
		service: Type.String({ default: 'XEPDB1' }),
		login: Type.String({ default: 'USER' }),
		password: Type.String({ default: '123456' }),
		passwordCrypted: Type.Boolean({ default: false, description: 'use this app with arg --crypt <your_pass> for simple crypt pasword' }),
	},
	{ description: 'connection to Oracle' },
)
export type TConnectionOra = Static<typeof SConnectionOra>

export class DbOra {
	private _busyScript = undefined as string | undefined
	private _connectionParams?: TConnectionOra
	private _connection?: oracledb.Connection
	private _initScript = undefined as string | undefined

	private _isErrorConnectionLost(errMsg: string): boolean {
		if (!errMsg) return false
		const msg = errMsg.toUpperCase()
		for (const e of ERROR_CONNECTION_LOST) {
			if (msg.includes(e)) return true
		}
		return false
	}

	private async _exec<T>(script: string, count: number): Promise<TResult<T>> {
		if (this._busyScript) {
			return { error: 'parallel exec not allowed', ok: false }
		}
		this._busyScript = script
		try {
			if (!this._connection) {
				if (!this._connectionParams) return { error: 'use "open" for connect to database', ok: false }
				const openRes = await this.open(this._connectionParams, this._initScript)
				if (openRes.error) return { error: openRes.error, ok: false }
			}
			try {
				const result = await this._connection!.execute<T>(script, [], { outFormat: oracledb.OUT_FORMAT_OBJECT })
				const rows = result.rows ? await replaceClobs(result.rows) : undefined
				return { result: (rows as T) ?? (result as T), ok: true }
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

	async open(connectionParams: TConnectionOra, initScript?: string): Promise<{ error?: string }> {
		await this.close()
		this._connectionParams = connectionParams
		this._initScript = initScript
		try {
			const connectString = `${connectionParams.host}:${connectionParams.port}/${connectionParams.service}`
			this._connection = await oracledb.getConnection({
				user: connectionParams.login,
				password: connectionParams.passwordCrypted ? secret.decrypt(connectionParams.password) : connectionParams.password,
				connectString,
				privilege: connectionParams.login?.toLowerCase() === 'sys' ? oracledb.SYSDBA : undefined,
			})
			if (this._initScript) {
				const resInitExec = await this._exec(this._initScript, MAX_RETRIES + 1)
				if (!resInitExec.ok) {
					return { error: resInitExec.error }
				}
			}
			return {}
		} catch (err: any) {
			this._connection = undefined
			return { error: `error connect to Oracle: ${err.message}` }
		}
	}

	async exec<T>(script: string): Promise<TResult<T>> {
		const res = await this._exec<T>(script, 0)
		return res
	}

	async close(): Promise<void> {
		if (!this._connection) return
		try {
			await this._connection.close()
		} catch {}
		this._connection = undefined
	}
}

async function clobToString(clob: any): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = ''
		if (clob && typeof clob === 'object' && typeof clob.pipe === 'function') {
			clob.setEncoding('utf8')
			clob.on('data', (chunk: string) => (data += chunk))
			clob.on('end', () => resolve(data))
			clob.on('error', (err: any) => reject(err))
		} else {
			resolve(clob)
		}
	})
}

async function replaceClobs(obj: any, visited = new WeakSet()): Promise<any> {
	if (obj === null || obj === undefined) {
		return obj
	}
	if (Array.isArray(obj)) {
		if (visited.has(obj)) {
			return '[Circular]'
		}
		visited.add(obj)
		return Promise.all(obj.map(item => replaceClobs(item, visited)))
	}
	if (obj instanceof Date) {
		if (visited.has(obj)) {
			return '[Circular]'
		}
		return obj
	}
	if (typeof obj === 'object') {
		if (visited.has(obj)) {
			return '[Circular]'
		}
		if (typeof (obj as any).pipe === 'function') {
			return await clobToString(obj)
		}
		visited.add(obj)
		const entries = await Promise.all(
			Object.entries(obj).map(async ([key, value]) => {
				if (value === null || value === undefined) {
					return [key, value]
				}
				if (typeof value === 'object') {
					return [key, await replaceClobs(value, visited)]
				}
				return [key, value]
			}),
		)
		return Object.fromEntries(entries)
	}
	return obj
}
