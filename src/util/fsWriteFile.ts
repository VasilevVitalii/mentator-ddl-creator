import { dirname } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { mkdirSync, writeFileSync, existsSync } from 'fs'

export async function fsWriteFile(fullFileName: string, text: string): Promise<{ error?: string }> {
	try {
		const dir = dirname(fullFileName)
		await mkdir(dir, { recursive: true })
		await writeFile(fullFileName, text, { encoding: 'utf8' })
		return {}
	} catch (err) {
		return { error: `on write "${fullFileName}": ${err}` }
	}
}

export function fsWriteFileSync(fullFileName: string, text: string): { error?: string } {
	try {
		const dir = dirname(fullFileName)
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true })
		}
		writeFileSync(fullFileName, text, { encoding: 'utf8' })
		return {}
	} catch (err) {
		return { error: `on write "${fullFileName}": ${err}` }
	}
}
