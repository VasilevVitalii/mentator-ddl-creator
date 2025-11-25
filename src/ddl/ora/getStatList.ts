import type { TSchemaOra } from './getSchemaList'

export type TOraStat = {
    schema: string
	objectList: {
		kind: string
		count: number
        isIgnore: boolean
	}[]
}

export function getStat(objectList: TSchemaOra[], dirList: Record<string, string | undefined>): TOraStat[] {
	const statList = [] as TOraStat[]
	objectList.forEach(item => {
		statList.push({ schema: item.name, objectList: [] })
		const uniqueKindList = Array.from(new Set(item.objectList.map(m => m.kind)))
		uniqueKindList.forEach(kind => {
			statList.at(-1)?.objectList.push({
				kind: kind,
				count: item.objectList.filter(f => f.kind === kind).length,
                isIgnore: !dirList[kind]
			})
		})
	})
	return statList
}
