import { mkdirSync, existsSync, unlinkSync, createWriteStream, WriteStream } from 'fs'
import { join } from 'path'

export enum ELoggerMode {
	REWRITE = 'REWRITE',
	APPEND = 'APPEND',
}

export function GetLogger(prefix: string, logDir: string, mode: ELoggerMode): { error?: string; logger?: Logger } {
	try {
		const logger = new Logger(prefix, logDir, mode)
		return { logger }
	} catch (err) {
		return { error: `error init logger (mode ${mode}) on dir "${logDir}": ${err}` }
	}
}

export class Logger {
	private _streamError: WriteStream
	private _streamDebug: WriteStream
	private _errCount = 0

	constructor(prefix: string, logDir: string, mode: ELoggerMode) {
		if (!existsSync(logDir)) {
			mkdirSync(logDir, { recursive: true })
		}

		let errorFile: string
		let debugFile: string

		if (mode === ELoggerMode.REWRITE) {
			errorFile = join(logDir, `${prefix}.error.log`)
			debugFile = join(logDir, `${prefix}.debug.log`)
		} else {
			const stamp = getDateTimeFile()
			errorFile = join(logDir, `${prefix}.${stamp}.error.log`)
			debugFile = join(logDir, `${prefix}.${stamp}.debug.log`)
		}

		;[errorFile, debugFile].forEach(f => {
			if (existsSync(f)) {
				unlinkSync(f)
			}
		})

		this._streamError = createWriteStream(errorFile, { flags: 'a', encoding: 'utf8' })
		this._streamDebug = createWriteStream(debugFile, { flags: 'a', encoding: 'utf8' })
	}

	private formatMessage(level: 'DEBUG' | 'ERROR', message: string, additional?: string): string {
		const lines = []
		lines.push(`[${getDateTimeIso()}] [${level}] ${message}`)
		if (additional) {
			const additionalLines = additional.split('\n')
			additionalLines.forEach(item => {
				lines.push('        ' + item)
			})
		}
		return lines.join('\n') + '\n'
	}

	debug(message: string, additional?: string) {
		const formatted = this.formatMessage('DEBUG', message, additional)
		console.log(formatted.trim())
		try {
			this._streamDebug.write(formatted)
		} catch (err) {}
	}

	error(message: string, additional?: string) {
		this._errCount++
		const formatted = this.formatMessage('ERROR', message, additional)
		console.error(formatted.trim())
		try {
			this._streamDebug.write(formatted)
		} catch (err) {}
		try {
			this._streamError.write(formatted)
		} catch (err) {}
	}

	close(callback: () => void) {
		const errLogFile = this._streamError.path
		this._streamError.close(() => {
			if (this._errCount <= 0) {
				try {
					unlinkSync(errLogFile)
				} catch (err) {}
			}
			this._streamDebug.close(() => {
				callback()
			})
		})
	}
}

function pad(n: number) {
	return n < 10 ? '0' + n : n.toString()
}

function getDateTimeFile() {
	const d = new Date()
	return d.getFullYear().toString() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
}

function getDateTimeIso() {
	const d = new Date()
	return (
		d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
	)
}
