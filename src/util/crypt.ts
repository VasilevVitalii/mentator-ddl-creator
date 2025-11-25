import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const KEY = crypto.createHash('sha256').update('mentator--CRYPT-KEY!').digest()
const IV = Buffer.alloc(16, 0)

function crypt(text: string): string {
	const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV)
	let encrypted = cipher.update(text, 'utf8', 'base64')
	encrypted += cipher.final('base64')
	return encrypted
}

function decrypt(encrypted: string): string {
	const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV)
	let decrypted = decipher.update(encrypted, 'base64', 'utf8')
	decrypted += decipher.final('utf8')
	return decrypted
}

export const secret = {
	crypt,
	decrypt,
}
