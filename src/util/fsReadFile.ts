import { dirname } from 'path'
import { readFile, access } from 'fs/promises'
import { readFileSync, accessSync } from 'fs'
import type { TResult } from '../tresult'

export async function fsReadFile(fullFileName: string): Promise<TResult<string>> {
	let fileExists = false
	try {
		await access(fullFileName)
		fileExists = true
	} catch {
		fileExists = false
	}
	if (!fileExists) {
		return {result: '', ok: true}
	}

	try {
		const text = await readFile(fullFileName, { encoding: 'utf8' })
		return { result: text, ok: true }
	} catch (err) {
		return { error: `on read "${fullFileName}": ${err}`, ok: false }
	}
}

export function fsReadFileSync(fullFileName: string, text: string): TResult<string> {
	let fileExists = false
	try {
		accessSync(fullFileName)
		fileExists = true
	} catch {
		fileExists = false
	}
	if (!fileExists) {
		return {result: '', ok: true}
	}

	try {
		const text = readFileSync(fullFileName, { encoding: 'utf8' })
		return { result: text, ok: true }
	} catch (err) {
		return { error: `on read "${fullFileName}": ${err}`, ok: false }
	}
}
