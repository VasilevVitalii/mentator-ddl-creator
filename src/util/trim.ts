export function trim(text: string): string {
	if (!text) return text
	return (
		text
			.replace(/^(?:[\t ]*(?:\r?\n|\r))+/g, '')
			.replace(/(?:[\t ]*(?:\r?\n|\r))+$/g, '')
            .trim()
	)
}
