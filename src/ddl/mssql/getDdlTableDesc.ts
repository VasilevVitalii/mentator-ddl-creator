import type { DbMssql } from '../../db/mssql'
import type { TResult } from '../../tresult'
import type { TObjectMssql } from './getSchemaList'
import type { TStampParam, TStampForeignKey, TStampUses } from '../../util/makeStamp'

export type TTableDescData = {
	tableDesc: string
	columnDescs: { columnName: string; desc: string }[]
	columnSpecs: { columnName: string; spec: string }[]
}

type TMssqlTableColumnRow = {
	COLUMN_NAME: string
	TYPE_NAME: string
	MAX_LENGTH: number
	PRECISION: number
	SCALE: number
	IS_NULLABLE: boolean
	IS_IDENTITY: boolean
	IDENTITY_SEED: string | null
	IDENTITY_INCR: string | null
	IS_COMPUTED: number
	COMPUTED_DEFINITION: string | null
}

type TMssqlViewColumnRow = {
	COLUMN_NAME: string
	TYPE_NAME: string
	MAX_LENGTH: number
	PRECISION: number
	SCALE: number
	IS_NULLABLE: boolean
}

function buildTableColumnSpec(row: TMssqlTableColumnRow): string {
	if (row.IS_COMPUTED && row.COMPUTED_DEFINITION) return `AS (${row.COMPUTED_DEFINITION})`
	const typeName = row.TYPE_NAME.toLowerCase()
	let spec = row.TYPE_NAME
	if (['varchar', 'char', 'varbinary', 'binary'].includes(typeName)) {
		spec += row.MAX_LENGTH === -1 ? '(MAX)' : `(${row.MAX_LENGTH})`
	} else if (['nvarchar', 'nchar'].includes(typeName)) {
		spec += row.MAX_LENGTH === -1 ? '(MAX)' : `(${Math.floor(row.MAX_LENGTH / 2)})`
	} else if (['decimal', 'numeric'].includes(typeName)) {
		spec += `(${row.PRECISION}, ${row.SCALE})`
	} else if (['datetime2', 'datetimeoffset', 'time'].includes(typeName)) {
		spec += `(${row.SCALE})`
	}
	if (row.IS_IDENTITY && row.IDENTITY_SEED !== null && row.IDENTITY_INCR !== null) {
		spec += ` IDENTITY(${row.IDENTITY_SEED}, ${row.IDENTITY_INCR})`
	}
	spec += row.IS_NULLABLE ? ' NULL' : ' NOT NULL'
	return spec
}

function buildViewColumnSpec(row: TMssqlViewColumnRow): string {
	const typeName = row.TYPE_NAME.toLowerCase()
	let spec = row.TYPE_NAME
	if (['varchar', 'char', 'varbinary', 'binary'].includes(typeName)) {
		spec += row.MAX_LENGTH === -1 ? '(MAX)' : `(${row.MAX_LENGTH})`
	} else if (['nvarchar', 'nchar'].includes(typeName)) {
		spec += row.MAX_LENGTH === -1 ? '(MAX)' : `(${Math.floor(row.MAX_LENGTH / 2)})`
	} else if (['decimal', 'numeric'].includes(typeName)) {
		spec += `(${row.PRECISION}, ${row.SCALE})`
	} else if (['datetime2', 'datetimeoffset', 'time'].includes(typeName)) {
		spec += `(${row.SCALE})`
	}
	spec += row.IS_NULLABLE ? ' NULL' : ' NOT NULL'
	return spec
}

export async function getDdlTableDesc(server: DbMssql, schema: string, object: TObjectMssql): Promise<TResult<TTableDescData>> {
	const scriptTableComment = [
		`SELECT CAST(ep.value AS NVARCHAR(MAX)) AS COMMENTS`,
		`FROM sys.extended_properties ep`,
		`JOIN sys.objects o ON ep.major_id = o.object_id`,
		`JOIN sys.schemas s ON o.schema_id = s.schema_id`,
		`WHERE s.name = '${schema}' AND o.name = '${object.name}'`,
		`  AND ep.minor_id = 0`,
		`  AND ep.name = 'MS_Description'`,
	].join('\n')

	const resExec1 = await server.exec<{ COMMENTS: string }[]>(scriptTableComment)
	if (!resExec1.ok) {
		return { error: resExec1.error, ok: false }
	}

	const scriptColumnComments = [
		`SELECT`,
		`    c.name AS COLUMN_NAME,`,
		`    CAST(ep.value AS NVARCHAR(MAX)) AS COMMENTS`,
		`FROM sys.extended_properties ep`,
		`JOIN sys.objects o ON ep.major_id = o.object_id`,
		`JOIN sys.schemas s ON o.schema_id = s.schema_id`,
		`JOIN sys.columns c ON ep.major_id = c.object_id AND ep.minor_id = c.column_id`,
		`WHERE s.name = '${schema}' AND o.name = '${object.name}'`,
		`  AND ep.name = 'MS_Description'`,
		`  AND ep.minor_id > 0`,
		`ORDER BY c.column_id`,
	].join('\n')

	const resExec2 = await server.exec<{ COLUMN_NAME: string; COMMENTS: string }[]>(scriptColumnComments)
	if (!resExec2.ok) {
		return { error: resExec2.error, ok: false }
	}

	let columnSpecs: { columnName: string; spec: string }[] = []

	if (object.kind === 'TABLE') {
		const scriptTableColSpecs = [
			`SELECT`,
			`    c.name AS COLUMN_NAME,`,
			`    tp.name AS TYPE_NAME,`,
			`    c.max_length AS MAX_LENGTH,`,
			`    c.precision AS PRECISION,`,
			`    c.scale AS SCALE,`,
			`    c.is_nullable AS IS_NULLABLE,`,
			`    c.is_identity AS IS_IDENTITY,`,
			`    CASE WHEN c.is_identity = 1 THEN CAST(IDENT_SEED(QUOTENAME(s.name) + '.' + QUOTENAME(tb.name)) AS NVARCHAR(50)) ELSE NULL END AS IDENTITY_SEED,`,
			`    CASE WHEN c.is_identity = 1 THEN CAST(IDENT_INCR(QUOTENAME(s.name) + '.' + QUOTENAME(tb.name)) AS NVARCHAR(50)) ELSE NULL END AS IDENTITY_INCR,`,
			`    CASE WHEN cc.definition IS NOT NULL THEN 1 ELSE 0 END AS IS_COMPUTED,`,
			`    cc.definition AS COMPUTED_DEFINITION`,
			`FROM sys.columns c`,
			`JOIN sys.tables tb ON c.object_id = tb.object_id`,
			`JOIN sys.schemas s ON tb.schema_id = s.schema_id`,
			`JOIN sys.types tp ON c.user_type_id = tp.user_type_id`,
			`LEFT JOIN sys.computed_columns cc ON c.object_id = cc.object_id AND c.column_id = cc.column_id`,
			`WHERE s.name = '${schema}' AND tb.name = '${object.name}'`,
			`ORDER BY c.column_id`,
		].join('\n')

		const resExec3 = await server.exec<TMssqlTableColumnRow[]>(scriptTableColSpecs)
		if (!resExec3.ok) {
			return { error: resExec3.error, ok: false }
		}
		columnSpecs = resExec3.result.map(row => ({ columnName: row.COLUMN_NAME, spec: buildTableColumnSpec(row) }))
	} else if (object.kind === 'VIEW') {
		const scriptViewColSpecs = [
			`SELECT`,
			`    c.name AS COLUMN_NAME,`,
			`    tp.name AS TYPE_NAME,`,
			`    c.max_length AS MAX_LENGTH,`,
			`    c.precision AS PRECISION,`,
			`    c.scale AS SCALE,`,
			`    c.is_nullable AS IS_NULLABLE`,
			`FROM sys.columns c`,
			`JOIN sys.views v ON c.object_id = v.object_id`,
			`JOIN sys.schemas s ON v.schema_id = s.schema_id`,
			`JOIN sys.types tp ON c.user_type_id = tp.user_type_id`,
			`WHERE s.name = '${schema}' AND v.name = '${object.name}'`,
			`ORDER BY c.column_id`,
		].join('\n')

		const resExec3 = await server.exec<TMssqlViewColumnRow[]>(scriptViewColSpecs)
		if (!resExec3.ok) {
			return { error: resExec3.error, ok: false }
		}
		columnSpecs = resExec3.result.map(row => ({ columnName: row.COLUMN_NAME, spec: buildViewColumnSpec(row) }))
	}

	return {
		result: {
			tableDesc: resExec1.result[0]?.COMMENTS || '',
			columnDescs: resExec2.result.map(m => ({ columnName: m.COLUMN_NAME, desc: m.COMMENTS })),
			columnSpecs,
		},
		ok: true,
	}
}

type TMssqlParamRow = {
	PARAM_NAME: string
	TYPE_NAME: string
	MAX_LENGTH: number
	PRECISION: number
	SCALE: number
	IS_OUTPUT: boolean
}

function buildParamSpec(row: TMssqlParamRow): string {
	const typeName = row.TYPE_NAME.toLowerCase()
	let spec = row.TYPE_NAME
	if (['varchar', 'char', 'varbinary', 'binary'].includes(typeName)) {
		spec += row.MAX_LENGTH === -1 ? '(MAX)' : `(${row.MAX_LENGTH})`
	} else if (['nvarchar', 'nchar'].includes(typeName)) {
		spec += row.MAX_LENGTH === -1 ? '(MAX)' : `(${Math.floor(row.MAX_LENGTH / 2)})`
	} else if (['decimal', 'numeric'].includes(typeName)) {
		spec += `(${row.PRECISION}, ${row.SCALE})`
	} else if (['datetime2', 'datetimeoffset', 'time'].includes(typeName)) {
		spec += `(${row.SCALE})`
	}
	if (row.IS_OUTPUT) {
		spec += ' OUTPUT'
	}
	return spec
}

export async function getDdlParamList(server: DbMssql, schema: string, objectName: string): Promise<TResult<TStampParam[]>> {
	const script = [
		`SELECT`,
		`    p.name AS PARAM_NAME,`,
		`    tp.name AS TYPE_NAME,`,
		`    p.max_length AS MAX_LENGTH,`,
		`    p.precision AS PRECISION,`,
		`    p.scale AS SCALE,`,
		`    p.is_output AS IS_OUTPUT`,
		`FROM sys.parameters p`,
		`JOIN sys.objects o ON p.object_id = o.object_id`,
		`JOIN sys.schemas s ON o.schema_id = s.schema_id`,
		`JOIN sys.types tp ON p.user_type_id = tp.user_type_id`,
		`WHERE s.name = '${schema}' AND o.name = '${objectName}'`,
		`  AND p.parameter_id > 0`,
		`ORDER BY p.parameter_id`,
	].join('\n')

	const resExec = await server.exec<TMssqlParamRow[]>(script)
	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}

	return {
		result: resExec.result.map(row => ({
			object_name: row.PARAM_NAME,
			spec: buildParamSpec(row),
		})),
		ok: true,
	}
}

type TMssqlFKRow = {
	FK_NAME: string
	COLUMN_MY: string
	COLUMN_REF: string
	REF_SCHEMA: string
	REF_TABLE: string
}

export async function getDdlForeignList(server: DbMssql, schema: string, objectName: string): Promise<TResult<TStampForeignKey[]>> {
	const script = [
		`SELECT`,
		`    fk.name AS FK_NAME,`,
		`    cc.name AS COLUMN_MY,`,
		`    rc.name AS COLUMN_REF,`,
		`    rs.name AS REF_SCHEMA,`,
		`    rt.name AS REF_TABLE`,
		`FROM sys.foreign_keys fk`,
		`JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id`,
		`JOIN sys.tables t ON fk.parent_object_id = t.object_id`,
		`JOIN sys.schemas s ON t.schema_id = s.schema_id`,
		`JOIN sys.columns cc ON fkc.parent_object_id = cc.object_id AND fkc.parent_column_id = cc.column_id`,
		`JOIN sys.tables rt ON fk.referenced_object_id = rt.object_id`,
		`JOIN sys.schemas rs ON rt.schema_id = rs.schema_id`,
		`JOIN sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id`,
		`WHERE s.name = '${schema}' AND t.name = '${objectName}'`,
		`ORDER BY fk.name, fkc.constraint_column_id`,
	].join('\n')

	const resExec = await server.exec<TMssqlFKRow[]>(script)
	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}

	const map = new Map<string, TStampForeignKey>()
	for (const row of resExec.result) {
		if (!map.has(row.FK_NAME)) {
			map.set(row.FK_NAME, { ref: { schema_name: row.REF_SCHEMA, object_name: row.REF_TABLE }, column_list: [] })
		}
		map.get(row.FK_NAME)!.column_list.push({ column_my: row.COLUMN_MY, column_ref: row.COLUMN_REF })
	}

	return { result: [...map.values()], ok: true }
}

type TMssqlUsesRow = {
	DATABASE_NAME: string
	SCHEMA_NAME: string
	OBJECT_NAME: string
	KIND: string
	IS_UNRESOLVED: number
}

type TMssqlCrossDbRow = {
	SCHEMA_NAME: string
	OBJECT_NAME: string
	KIND: string
}

function mssqlTypeToKind(type: string): string {
	switch (type) {
		case 'U':  return 'TABLE'
		case 'V':  return 'VIEW'
		case 'P':  return 'PROCEDURE'
		case 'FN': return 'FUNCTION'
		case 'IF': return 'FUNCTION'
		case 'TF': return 'FUNCTION'
		case 'TR': return 'TRIGGER'
		case 'SN': return 'SYNONYM'
		case 'SO': return 'SEQUENCE'
		default:   return ''
	}
}

export async function getDdlUsesList(server: DbMssql, schema: string, objectName: string, database: string): Promise<TResult<TStampUses[]>> {
	const script = [
		`SELECT`,
		`    COALESCE(dep.referenced_database_name, '${database}') AS DATABASE_NAME,`,
		`    COALESCE(NULLIF(dep.referenced_schema_name, ''), 'dbo') AS SCHEMA_NAME,`,
		`    dep.referenced_entity_name AS OBJECT_NAME,`,
		`    CASE o.type`,
		`        WHEN 'U'  THEN 'TABLE'`,
		`        WHEN 'V'  THEN 'VIEW'`,
		`        WHEN 'P'  THEN 'PROCEDURE'`,
		`        WHEN 'FN' THEN 'FUNCTION'`,
		`        WHEN 'IF' THEN 'FUNCTION'`,
		`        WHEN 'TF' THEN 'FUNCTION'`,
		`        WHEN 'TR' THEN 'TRIGGER'`,
		`        WHEN 'SN' THEN 'SYNONYM'`,
		`        WHEN 'SO' THEN 'SEQUENCE'`,
		`        ELSE ''`,
		`    END AS KIND,`,
		`    CASE WHEN dep.referenced_id IS NULL THEN 1 ELSE 0 END AS IS_UNRESOLVED`,
		`FROM sys.sql_expression_dependencies dep`,
		`JOIN sys.objects src ON dep.referencing_id = src.object_id`,
		`JOIN sys.schemas s ON src.schema_id = s.schema_id`,
		`LEFT JOIN sys.objects o ON dep.referenced_id = o.object_id`,
		`WHERE s.name = '${schema}' AND src.name = '${objectName}'`,
		`ORDER BY dep.referenced_entity_name`,
	].join('\n')

	const resExec = await server.exec<TMssqlUsesRow[]>(script)
	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}

	const result: TStampUses[] = resExec.result.map(row => ({
		schema_name: row.SCHEMA_NAME,
		object_name: row.OBJECT_NAME,
		database_name: row.DATABASE_NAME,
		kind: row.KIND,
	}))

	// Для объектов из других баз referenced_id = NULL, поэтому kind пустой.
	// Группируем их по database_name и делаем по одному запросу на каждую внешнюю базу.
	const unresolvedByDb = new Map<string, TStampUses[]>()
	resExec.result.forEach((raw, i) => {
		if (raw.IS_UNRESOLVED) {
			const item = result[i] as TStampUses
			if (!unresolvedByDb.has(item.database_name)) unresolvedByDb.set(item.database_name, [])
			unresolvedByDb.get(item.database_name)!.push(item)
		}
	})

	for (const [dbName, items] of unresolvedByDb) {
		const names = items.map(item => `'${item.object_name.replace(/'/g, "''")}'`).join(', ')
		const crossScript = [
			`SELECT s.name AS SCHEMA_NAME, o.name AS OBJECT_NAME,`,
			`    CASE o.type`,
			`        WHEN 'U'  THEN 'TABLE'`,
			`        WHEN 'V'  THEN 'VIEW'`,
			`        WHEN 'P'  THEN 'PROCEDURE'`,
			`        WHEN 'FN' THEN 'FUNCTION'`,
			`        WHEN 'IF' THEN 'FUNCTION'`,
			`        WHEN 'TF' THEN 'FUNCTION'`,
			`        WHEN 'TR' THEN 'TRIGGER'`,
			`        WHEN 'SN' THEN 'SYNONYM'`,
			`        WHEN 'SO' THEN 'SEQUENCE'`,
			`        ELSE ''`,
			`    END AS KIND`,
			`FROM [${dbName}].sys.objects o`,
			`JOIN [${dbName}].sys.schemas s ON o.schema_id = s.schema_id`,
			`WHERE o.name IN (${names})`,
		].join('\n')

		const crossRes = await server.exec<TMssqlCrossDbRow[]>(crossScript)
		if (!crossRes.ok) continue

		// lookup: schema.object -> kind
		const lookup = new Map<string, string>()
		for (const row of crossRes.result) {
			lookup.set(`${row.SCHEMA_NAME}.${row.OBJECT_NAME}`, row.KIND)
		}

		for (const item of items) {
			const kind = lookup.get(`${item.schema_name}.${item.object_name}`)
			if (kind) item.kind = kind
		}
	}

	return { result: result.filter(item => item.kind !== ''), ok: true }
}
