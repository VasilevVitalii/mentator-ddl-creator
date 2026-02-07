/**
 * Checks if a string matches a pattern with wildcards (*).
 * The asterisk (*) can be used at the beginning or end of the pattern.
 * Comparison is case-insensitive.
 *
 * @param value - The string to check
 * @param pattern - The pattern with optional * at the beginning or end
 * @returns true if the value matches the pattern
 *
 * @example
 * matchPattern('MyTable', 'MyTable') // true
 * matchPattern('MyTable', 'my*') // true
 * matchPattern('MyTable', '*table') // true
 * matchPattern('MyTable', '*Tab*') // true
 * matchPattern('MyTable', 'Other*') // false
 */
export function matchPattern(value: string, pattern: string): boolean {
	if (!value || !pattern) return true
	if (pattern === '*') {
		return true
	}

	const valueLower = value.toLowerCase()
	const patternLower = pattern.toLowerCase()

	if (!patternLower.includes('*')) {
		return valueLower === patternLower
	}
	const escapedPattern = patternLower.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
	const regexPattern = '^' + escapedPattern.replace(/\*/g, '.*') + '$'

	const regex = new RegExp(regexPattern)
	return regex.test(valueLower)
}
