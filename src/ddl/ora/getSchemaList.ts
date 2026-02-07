import { EFilterTableFill, EUseMode, type TConfigOra } from '../../config'
import { DbOra } from '../../db/ora'
import type { TResult } from '../../tresult'
import { matchPattern } from '../../util/matchPattern'

export type TObjectOra = {
	kind: string
	name: string
	state: 'unprocessed' | 'nochange' | 'insert' | 'update' | 'error' | 'ignore'
}

export type TLinkOra = {
	parentKind: string
	parentName: string
	kind: string
	name: string
}

export type TTableFill = {
	name: string
	pklist: string[]
	fill: 'full' | 'demo'
	count: number
	state: 'unprocessed' | 'nochange' | 'insert' | 'update' | 'error' | 'ignore'
}

export type TSchemaOra = {
	name: string
	objectList: TObjectOra[]
	linkList: TLinkOra[]
	tableFillList: TTableFill[]
}

export async function getSchemaList(server: DbOra, config: TConfigOra): Promise<TResult<TSchemaOra[]>> {
	const resExecSchemas = await server.exec<{ SCHEMANAME: string }[]>(
		`SELECT USERNAME AS SCHEMANAME FROM ALL_USERS WHERE ORACLE_MAINTAINED = 'N' ORDER BY USERNAME`,
	)
	if (!resExecSchemas.ok) {
		return { error: resExecSchemas.error, ok: false }
	}
	const schemaListFilter = config.objects.schema.list.map(m => m.toUpperCase())
	const schemaNameList =
		config.objects.schema.mode === EUseMode.INCLUDE
			? resExecSchemas.result!.map(m => m.SCHEMANAME).filter(f => schemaListFilter.includes(f.toUpperCase()))
			: config.objects.schema.mode === EUseMode.EXCEPT
			? resExecSchemas.result!.map(m => m.SCHEMANAME).filter(f => !schemaListFilter.includes(f.toUpperCase()))
			: []
	if (schemaNameList.length <= 0) {
		return { result: [], ok: true }
	}

	const schemaList: TSchemaOra[] = schemaNameList.map(m => {
		return {
			name: m,
			objectList: [],
			linkList: [],
			tableFillList: [],
		}
	})
	const schemaListScriptFilter = `'${schemaList.map(m => m.name).join(`','`)}'`

	const ignoreObjectKindList = [`'INDEX'`]
	if (!config.objects.package_body.dir) ignoreObjectKindList.push(`'PACKAGE BODY'`)
	if (!config.objects.type_body.dir) ignoreObjectKindList.push(`'TYPE BODY'`)
	const ignoreObjectKind = ignoreObjectKindList.join(',')

	const resExecAllObjects = await server.exec<{ OWNER: string; OBJECT_TYPE: string; OBJECT_NAME: string }[]>(
		[
			`SELECT OWNER, REPLACE(OBJECT_TYPE,' ','_') AS OBJECT_TYPE, OBJECT_NAME`,
			`FROM ALL_OBJECTS`,
			`WHERE TEMPORARY = 'N' AND STATUS = 'VALID' AND OBJECT_TYPE NOT IN (${ignoreObjectKind}) AND OWNER IN (${schemaListScriptFilter})`,
			`AND OBJECT_NAME NOT LIKE 'SYS_IOT_OVER_%' AND OBJECT_NAME NOT LIKE 'SYS_IL%' AND OBJECT_NAME NOT LIKE 'SYS_PLSQL_%' AND OBJECT_NAME NOT LIKE 'BIN$%'`,
			`ORDER BY`,
			`CASE WHEN OBJECT_TYPE = 'TABLE' THEN 1 ELSE 2 END,`,
			`CASE WHEN OBJECT_TYPE = 'VIEW' THEN 1 ELSE 2 END,`,
			`CASE WHEN OBJECT_TYPE = 'PACKAGE BODY' THEN 2 ELSE 1 END,`,
			`CASE WHEN OBJECT_TYPE = 'PACKAGE' THEN 2 ELSE 1 END`,
		].join('\n'),
	)
	if (!resExecAllObjects.ok) {
		return { error: resExecAllObjects.error, ok: false }
	}

	const resExecIndexLink = await server.exec<{ TABLE_OWNER: string; TABLE_NAME: string; INDEX_NAME: string }[]>(
		[
			`SELECT i.TABLE_OWNER, i.TABLE_NAME, i.INDEX_NAME`,
			`FROM ALL_INDEXES i`,
			`LEFT JOIN ALL_CONSTRAINTS c ON i.TABLE_OWNER = c.OWNER AND i.TABLE_NAME = c.TABLE_NAME AND i.INDEX_NAME = c.INDEX_NAME`,
			`WHERE i.TABLE_OWNER IN (${schemaListScriptFilter}) AND i.STATUS = 'VALID'`,
			`AND (c.CONSTRAINT_TYPE IS NULL OR c.CONSTRAINT_TYPE NOT IN ('P', 'U'))`,
		].join('\n'),
	)
	if (!resExecIndexLink.ok) {
		return { error: resExecIndexLink.error, ok: false }
	}
	resExecAllObjects.result.push(
		...resExecIndexLink.result.map(m => {
			return {
				OWNER: m.TABLE_OWNER,
				OBJECT_TYPE: 'INDEX',
				OBJECT_NAME: m.INDEX_NAME,
			}
		}),
	)

	const resExecTriggerLink = await server.exec<{ TABLE_OWNER: string; TABLE_NAME: string; TRIGGER_NAME: string }[]>(
		[`SELECT TABLE_OWNER, TABLE_NAME, TRIGGER_NAME`, `FROM ALL_TRIGGERS`, `WHERE TABLE_OWNER IN (${schemaListScriptFilter})`].join('\n'),
	)
	if (!resExecTriggerLink.ok) {
		return { error: resExecTriggerLink.error, ok: false }
	}

	if (config.objects.table_fill_full.dir || (config.objects.table_fill_demo.dir && config.objects.table_fill_demo.count)) {
		const tableFillFullList = config.objects.table_fill_full.list || []
		const scriptFindPk = [
			`SELECT cons.OWNER, cons.TABLE_NAME, cols.COLUMN_NAME`,
			`FROM all_constraints cons`,
			`JOIN all_cons_columns cols ON cons.owner = cols.owner AND cons.constraint_name = cols.constraint_name`,
			`WHERE cons.constraint_type = 'P' AND cons.owner IN (${schemaListScriptFilter}) AND cols.table_name NOT LIKE 'BIN$%'`,
			`ORDER BY cons.OWNER, cons.TABLE_NAME, cols.position`,
		].join('\n')
		const resExecFindPk = await server.exec<{ OWNER: string, TABLE_NAME: string, COLUMN_NAME: string }[]>(scriptFindPk)
		if (!resExecFindPk.ok) {
			return { error: resExecFindPk.error, ok: false }
		}
		for (const pk of resExecFindPk.result) {
			const fndSchema = schemaList.find(f => f.name === pk.OWNER)
			if (!fndSchema) continue
			const fndTable = fndSchema.tableFillList.find(f => f.name === pk.TABLE_NAME)
			if (fndTable) {
				fndTable.pklist.push(pk.COLUMN_NAME)
			} else {
				// Check if table matches any pattern in table_fill_full list
				const isFull = tableFillFullList.some(pattern => {
					const schemaMatch = matchPattern(fndSchema.name, pattern.schema)
					const tableMatch = matchPattern(pk.TABLE_NAME, pattern.table)
					return schemaMatch && tableMatch
				})

				const newTable: TTableFill = {
					name: pk.TABLE_NAME,
					fill: isFull ? 'full' : 'demo',
					count: config.objects.table_fill_demo.count || 3,
					state: 'unprocessed',
					pklist: [pk.COLUMN_NAME]
				}
				fndSchema.tableFillList.push(newTable)
			}
		}

		// Apply filter for demo tables if configured
		if (config.objects.table_fill_demo.filter?.list && config.objects.table_fill_demo.filter.list.length > 0) {
			const filterList = config.objects.table_fill_demo.filter.list
			const filterMode = config.objects.table_fill_demo.filter.mode

			for (const schema of schemaList) {
				schema.tableFillList = schema.tableFillList.filter(table => {
					// Skip full tables - filter only applies to demo tables
					if (table.fill === 'full') return true

					// Check if table matches any pattern in the filter list
					const matchesAnyPattern = filterList.some(pattern => {
						const schemaMatch = matchPattern(schema.name, pattern.schema)
						const tableMatch = matchPattern(table.name, pattern.table)
						return schemaMatch && tableMatch
					})

					// WHITELIST: keep only matching tables; BLACKLIST: keep only non-matching tables
					return filterMode === EFilterTableFill.WHITELIST ? matchesAnyPattern : !matchesAnyPattern
				})
			}
		}
	}

	resExecAllObjects.result.forEach(item => {
		const fnd = schemaList.find(f => f.name === item.OWNER)
		fnd?.objectList.push({
			kind: item.OBJECT_TYPE,
			name: item.OBJECT_NAME,
			state: 'unprocessed',
		})
	})
	resExecIndexLink.result.forEach(item => {
		const fnd = schemaList.find(f => f.name === item.TABLE_OWNER)
		fnd?.linkList.push({
			parentName: item.TABLE_NAME,
			parentKind: 'TABLE',
			kind: 'INDEX',
			name: item.INDEX_NAME,
		})
	})
	resExecTriggerLink.result.forEach(item => {
		const fnd = schemaList.find(f => f.name === item.TABLE_OWNER)
		fnd?.linkList.push({
			parentName: item.TABLE_NAME,
			parentKind: 'TABLE',
			kind: 'INDEX',
			name: item.TRIGGER_NAME,
		})
	})

	return { result: schemaList, ok: true }
}
