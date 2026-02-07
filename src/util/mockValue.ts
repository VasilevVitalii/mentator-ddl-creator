/**
 * Mocks a value according to specific rules:
 * - Numbers: each digit is replaced with a random digit
 * - Strings: digits replaced per rule 1, letters (any alphabet) replaced with random English letter preserving case
 * - Dates: shifted by random -5 to +5 days
 * - Times: shifted by random -30 to +30 minutes
 * - null: remains null
 * - Complex objects: recursively apply rules to nested properties
 */

function randomDigit(): string {
	return Math.floor(Math.random() * 10).toString()
}

function randomLetter(isUpperCase: boolean): string {
	const letters = 'abcdefghijklmnopqrstuvwxyz'
	const randomChar = letters[Math.floor(Math.random() * letters.length)]!
	return isUpperCase ? randomChar.toUpperCase() : randomChar
}

function isLetter(char: string): boolean {
	// Check if character is a letter from any alphabet
	return /\p{L}/u.test(char)
}

function mockString(value: string): string {
	return value
		.split('')
		.map(char => {
			// If digit, replace with random digit
			if (/\d/.test(char)) {
				return randomDigit()
			}
			// If letter, replace with random English letter preserving case
			if (isLetter(char)) {
				const isUpperCase = char === char.toUpperCase()
				return randomLetter(isUpperCase)
			}
			// Keep other characters as is
			return char
		})
		.join('')
}

function mockNumber(value: number): number {
	const str = value.toString()
	const hasDecimal = str.includes('.')

	if (hasDecimal) {
		const parts = str.split('.')
		const intPart = parts[0]!
		const decPart = parts[1]!
		const mockedInt = intPart.split('').map(() => randomDigit()).join('')
		const mockedDec = decPart.split('').map(() => randomDigit()).join('')
		return parseFloat(`${mockedInt}.${mockedDec}`)
	} else {
		const mocked = str.split('').map(() => randomDigit()).join('')
		return parseInt(mocked, 10)
	}
}

function mockDate(value: Date): Date {
	const randomDays = Math.floor(Math.random() * 11) - 5 // -5 to +5
	const newDate = new Date(value)
	newDate.setDate(newDate.getDate() + randomDays)
	return newDate
}

function mockTime(value: Date): Date {
	const randomMinutes = Math.floor(Math.random() * 61) - 30 // -30 to +30
	const newDate = new Date(value)
	newDate.setMinutes(newDate.getMinutes() + randomMinutes)
	return newDate
}

export function mockValue(value: any, isTimeOnly: boolean = false): any {
	// Rule 5: null remains null
	if (value === null || value === undefined) {
		return value
	}

	// Rule 6: Complex objects - recursively apply rules
	if (typeof value === 'object' && !(value instanceof Date)) {
		if (Array.isArray(value)) {
			return value.map(item => mockValue(item, isTimeOnly))
		} else {
			const mocked: Record<string, any> = {}
			for (const key in value) {
				if (value.hasOwnProperty(key)) {
					mocked[key] = mockValue(value[key], isTimeOnly)
				}
			}
			return mocked
		}
	}

	// Rule 3 & 4: Date/DateTime or Time
	if (value instanceof Date) {
		if (isTimeOnly) {
			return mockTime(value) // Rule 4: Time +/- 30 minutes
		} else {
			return mockDate(value) // Rule 3: Date +/- 5 days
		}
	}

	// Rule 1: Numbers
	if (typeof value === 'number') {
		return mockNumber(value)
	}

	// Rule 2: Strings
	if (typeof value === 'string') {
		return mockString(value)
	}

	// For other types (boolean, bigint), return as is
	return value
}
