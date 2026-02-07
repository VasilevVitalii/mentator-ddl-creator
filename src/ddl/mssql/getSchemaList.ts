import { EFilterTableFill, EUseMode, type TConfigMssql } from '../../config'
import { DbMssql } from '../../db/mssql'
import type { TResult } from '../../tresult'
import { matchPattern } from '../../util/matchPattern'

export type TObjectMssql = {
	kind: string
	name: string
	state: 'unprocessed' | 'nochange' | 'insert' | 'update' | 'error' | 'ignore'
}

export type TLinkMssql = {
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

export type TSchemaMssql = {
	name: string
	objectList: TObjectMssql[]
	linkList: TLinkMssql[]
	tableFillList: TTableFill[]
}

export async function getSchemaList(server: DbMssql, config: TConfigMssql): Promise<TResult<TSchemaMssql[]>> {
	const resExecSchemas = await server.exec<{ SCHEMANAME: string }[]>(
		`SELECT name AS SCHEMANAME FROM sys.schemas WHERE principal_id = 1 ORDER BY name`,
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

	const schemaList: TSchemaMssql[] = schemaNameList.map(m => {
		return {
			name: m,
			objectList: [],
			linkList: [],
			tableFillList: [],
		}
	})
	const schemaListScriptFilter = `'${schemaList.map(m => m.name).join(`','`)}'`

	const resExecAllObjects = await server.exec<{ OWNER: string; OBJECT_TYPE: string; OBJECT_NAME: string }[]>(
		[
			`SELECT`,
			`    s.name AS OWNER,`,
			`    CASE o.type`,
			`        WHEN 'U' THEN 'TABLE'`,
			`        WHEN 'V' THEN 'VIEW'`,
			`        WHEN 'P' THEN 'PROCEDURE'`,
			`        WHEN 'FN' THEN 'FUNCTION'`,
			`        WHEN 'IF' THEN 'FUNCTION'`,
			`        WHEN 'TF' THEN 'FUNCTION'`,
			`        WHEN 'TR' THEN 'TRIGGER'`,
			`        WHEN 'SO' THEN 'SEQUENCE'`,
			`        WHEN 'SN' THEN 'SYNONYM'`,
			`    END AS OBJECT_TYPE,`,
			`    o.name AS OBJECT_NAME`,
			`FROM sys.objects o`,
			`JOIN sys.schemas s ON o.schema_id = s.schema_id`,
			`WHERE o.type IN ('U', 'V', 'P', 'FN', 'IF', 'TF', 'TR', 'SO', 'SN')`,
			`  AND s.name IN (${schemaListScriptFilter})`,
			`  AND o.is_ms_shipped = 0`,
			`ORDER BY`,
			`    CASE WHEN o.type = 'U' THEN 1 ELSE 2 END,`,
			`    CASE WHEN o.type = 'V' THEN 1 ELSE 2 END,`,
			`    s.name, o.name`,
		].join('\n'),
	)
	if (!resExecAllObjects.ok) {
		return { error: resExecAllObjects.error, ok: false }
	}

	const resExecIndexLink = await server.exec<{ SCHEMA_NAME: string; TABLE_NAME: string; INDEX_NAME: string }[]>(
		[
			`SELECT`,
			`    s.name AS SCHEMA_NAME,`,
			`    t.name AS TABLE_NAME,`,
			`    i.name AS INDEX_NAME`,
			`FROM sys.indexes i`,
			`JOIN sys.tables t ON i.object_id = t.object_id`,
			`JOIN sys.schemas s ON t.schema_id = s.schema_id`,
			`LEFT JOIN sys.key_constraints kc ON i.object_id = kc.parent_object_id AND i.index_id = kc.unique_index_id`,
			`WHERE s.name IN (${schemaListScriptFilter})`,
			`  AND i.type > 0`,
			`  AND (kc.type IS NULL OR kc.type NOT IN ('PK', 'UQ'))`,
		].join('\n'),
	)
	if (!resExecIndexLink.ok) {
		return { error: resExecIndexLink.error, ok: false }
	}
	resExecAllObjects.result.push(
		...resExecIndexLink.result.map(m => {
			return {
				OWNER: m.SCHEMA_NAME,
				OBJECT_TYPE: 'INDEX',
				OBJECT_NAME: m.INDEX_NAME,
			}
		}),
	)

	const resExecTriggerLink = await server.exec<{ SCHEMA_NAME: string; TABLE_NAME: string; TRIGGER_NAME: string }[]>(
		[
			`SELECT`,
			`    s.name AS SCHEMA_NAME,`,
			`    OBJECT_NAME(tr.parent_id) AS TABLE_NAME,`,
			`    tr.name AS TRIGGER_NAME`,
			`FROM sys.triggers tr`,
			`JOIN sys.objects o ON tr.object_id = o.object_id`,
			`JOIN sys.schemas s ON o.schema_id = s.schema_id`,
			`WHERE s.name IN (${schemaListScriptFilter})`,
			`  AND tr.parent_class = 1`,
		].join('\n'),
	)
	if (!resExecTriggerLink.ok) {
		return { error: resExecTriggerLink.error, ok: false }
	}

	if (config.objects.table_fill_full.dir || (config.objects.table_fill_demo.dir && config.objects.table_fill_demo.count)) {
		const tableFillFullList = config.objects.table_fill_full.list || []
		const scriptFindPk = [
			`SELECT`,
			`    s.name AS OWNER,`,
			`    t.name AS TABLE_NAME,`,
			`    c.name AS COLUMN_NAME`,
			`FROM sys.key_constraints kc`,
			`JOIN sys.tables t ON kc.parent_object_id = t.object_id`,
			`JOIN sys.schemas s ON t.schema_id = s.schema_id`,
			`JOIN sys.index_columns ic ON kc.parent_object_id = ic.object_id AND kc.unique_index_id = ic.index_id`,
			`JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id`,
			`WHERE kc.type = 'PK' AND s.name IN (${schemaListScriptFilter})`,
			`ORDER BY s.name, t.name, ic.key_ordinal`,
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
		const fnd = schemaList.find(f => f.name === item.SCHEMA_NAME)
		fnd?.linkList.push({
			parentName: item.TABLE_NAME,
			parentKind: 'TABLE',
			kind: 'INDEX',
			name: item.INDEX_NAME,
		})
	})
	resExecTriggerLink.result.forEach(item => {
		const fnd = schemaList.find(f => f.name === item.SCHEMA_NAME)
		fnd?.linkList.push({
			parentName: item.TABLE_NAME,
			parentKind: 'TABLE',
			kind: 'TRIGGER',
			name: item.TRIGGER_NAME,
		})
	})

	// Apply filter for table_fill_demo
	if (config.objects.table_fill_demo.filter?.list && config.objects.table_fill_demo.filter.list.length > 0) {
		const filterMode = config.objects.table_fill_demo.filter.mode
		const filterList = config.objects.table_fill_demo.filter.list

		for (const schema of schemaList) {
			// Filter only demo tables (full tables should not be affected)
			schema.tableFillList = schema.tableFillList.filter(table => {
				// Skip full tables - they are not affected by filter
				if (table.fill === 'full') {
					return true
				}

				// Check if table matches any pattern in filter list
				const matchesAnyPattern = filterList.some(pattern => {
					const schemaMatch = matchPattern(schema.name, pattern.schema)
					const tableMatch = matchPattern(table.name, pattern.table)
					return schemaMatch && tableMatch
				})

				// WHITELIST: keep only matching tables
				// BLACKLIST: exclude matching tables
				return filterMode === EFilterTableFill.WHITELIST ? matchesAnyPattern : !matchesAnyPattern
			})
		}
	}

	return { result: schemaList, ok: true }
}
