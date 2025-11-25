import type { TSchemaMssql } from './getSchemaList'

export type TMssqlStat = {
    schema: string
	objectList: {
		kind: string
		count: number
        isIgnore: boolean
	}[]
}

export function getStat(objectList: TSchemaMssql[], dirList: Record<string, string | undefined>): TMssqlStat[] {
	const statList = [] as TMssqlStat[]
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
