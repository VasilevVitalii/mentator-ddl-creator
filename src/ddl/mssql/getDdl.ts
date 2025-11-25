import type { DbMssql } from '../../db/mssql'
import type { TResult } from '../../tresult'
import type { TObjectMssql } from './getSchemaList'
import type { TConfigMssql } from '../../config'

export async function getDdl(server: DbMssql, schema: string, object: TObjectMssql, config: TConfigMssql): Promise<TResult<string>> {
	switch (object.kind) {
		case 'TABLE':
			return await getDdlTable(server, schema, object.name, config)
		case 'VIEW':
			return await getDdlView(server, schema, object.name)
		case 'PROCEDURE':
			return await getDdlProcedure(server, schema, object.name)
		case 'FUNCTION':
			return await getDdlFunction(server, schema, object.name)
		case 'TRIGGER':
			return await getDdlTrigger(server, schema, object.name)
		case 'INDEX':
			return await getDdlIndex(server, schema, object.name, config)
		case 'SEQUENCE':
			return await getDdlSequence(server, schema, object.name)
		case 'SYNONYM':
			return await getDdlSynonym(server, schema, object.name)
		default:
			return { error: `unsupported object type: ${object.kind}`, ok: false }
	}
}

async function getDdlTable(server: DbMssql, schema: string, tableName: string, config: TConfigMssql): Promise<TResult<string>> {
	const script = [
		`SELECT`,
		`    c.name AS COLUMN_NAME,`,
		`    t.name AS DATA_TYPE,`,
		`    c.max_length AS MAX_LENGTH,`,
		`    c.precision AS PRECISION,`,
		`    c.scale AS SCALE,`,
		`    c.is_nullable AS IS_NULLABLE,`,
		`    c.is_identity AS IS_IDENTITY,`,
		`    OBJECT_DEFINITION(c.default_object_id) AS DEFAULT_VALUE,`,
		`    c.column_id AS ORDINAL_POSITION`,
		`FROM sys.columns c`,
		`JOIN sys.types t ON c.user_type_id = t.user_type_id`,
		`JOIN sys.tables tb ON c.object_id = tb.object_id`,
		`JOIN sys.schemas s ON tb.schema_id = s.schema_id`,
		`WHERE s.name = '${schema}' AND tb.name = '${tableName}'`,
		`ORDER BY c.column_id`,
	].join('\n')

	const resExec = await server.exec<{
		COLUMN_NAME: string
		DATA_TYPE: string
		MAX_LENGTH: number
		PRECISION: number
		SCALE: number
		IS_NULLABLE: boolean
		IS_IDENTITY: boolean
		DEFAULT_VALUE: string | null
		ORDINAL_POSITION: number
	}[]>(script)

	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}

	const columns = resExec.result.map(col => {
		let dataType = col.DATA_TYPE
		if (['varchar', 'nvarchar', 'char', 'nchar', 'binary', 'varbinary'].includes(dataType)) {
			const length = col.MAX_LENGTH === -1 ? 'MAX' : (dataType.startsWith('n') ? col.MAX_LENGTH / 2 : col.MAX_LENGTH).toString()
			dataType = `${dataType}(${length})`
		} else if (['decimal', 'numeric'].includes(dataType)) {
			dataType = `${dataType}(${col.PRECISION}, ${col.SCALE})`
		}

		let def = `[${col.COLUMN_NAME}] ${dataType}`
		if (col.IS_IDENTITY) {
			def += ' IDENTITY(1,1)'
		}
		if (!col.IS_NULLABLE) {
			def += ' NOT NULL'
		}
		if (col.DEFAULT_VALUE) {
			def += ` DEFAULT ${col.DEFAULT_VALUE}`
		}
		return def
	})

	const scriptConstraints = [
		`SELECT`,
		`    kc.name AS CONSTRAINT_NAME,`,
		`    kc.type AS CONSTRAINT_TYPE,`,
		`    kc.object_id AS CONSTRAINT_ID`,
		`FROM sys.key_constraints kc`,
		`JOIN sys.tables t ON kc.parent_object_id = t.object_id`,
		`JOIN sys.schemas s ON t.schema_id = s.schema_id`,
		`WHERE s.name = '${schema}' AND t.name = '${tableName}'`,
	].join('\n')

	const resConstraints = await server.exec<{ CONSTRAINT_NAME: string; CONSTRAINT_TYPE: string; CONSTRAINT_ID: number }[]>(scriptConstraints)
	if (!resConstraints.ok) {
		return { error: resConstraints.error, ok: false }
	}

	const constraints = [] as string[]
	for (const con of resConstraints.result) {
		const scriptColumns = [
			`SELECT c.name AS COLUMN_NAME`,
			`FROM sys.index_columns ic`,
			`JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id`,
			`JOIN sys.key_constraints kc ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id`,
			`WHERE kc.object_id = ${con.CONSTRAINT_ID}`,
			`ORDER BY ic.key_ordinal`,
		].join('\n')
		const resColumns = await server.exec<{ COLUMN_NAME: string }[]>(scriptColumns)
		if (!resColumns.ok) {
			return { error: resColumns.error, ok: false }
		}
		const columns = resColumns.result.map(c => c.COLUMN_NAME).join(', ')
		const type = con.CONSTRAINT_TYPE === 'PK' ? 'PRIMARY KEY' : 'UNIQUE'
		constraints.push(`CONSTRAINT [${con.CONSTRAINT_NAME}] ${type} (${columns})`)
	}

	const scriptForeignKeys = [
		`SELECT`,
		`    fk.name AS FK_NAME,`,
		`    fk.object_id AS FK_ID,`,
		`    s2.name AS REF_SCHEMA,`,
		`    t2.name AS REF_TABLE`,
		`FROM sys.foreign_keys fk`,
		`JOIN sys.tables t1 ON fk.parent_object_id = t1.object_id`,
		`JOIN sys.schemas s1 ON t1.schema_id = s1.schema_id`,
		`JOIN sys.tables t2 ON fk.referenced_object_id = t2.object_id`,
		`JOIN sys.schemas s2 ON t2.schema_id = s2.schema_id`,
		`WHERE s1.name = '${schema}' AND t1.name = '${tableName}'`,
	].join('\n')

	const resForeignKeys = await server.exec<{ FK_NAME: string; FK_ID: number; REF_SCHEMA: string; REF_TABLE: string }[]>(scriptForeignKeys)
	if (!resForeignKeys.ok) {
		return { error: resForeignKeys.error, ok: false }
	}

	const foreignKeys = [] as string[]
	for (const fk of resForeignKeys.result) {
		const scriptFkColumns = [
			`SELECT`,
			`    c1.name AS FK_COLUMN,`,
			`    c2.name AS REF_COLUMN`,
			`FROM sys.foreign_key_columns fkc`,
			`JOIN sys.columns c1 ON fkc.parent_object_id = c1.object_id AND fkc.parent_column_id = c1.column_id`,
			`JOIN sys.columns c2 ON fkc.referenced_object_id = c2.object_id AND fkc.referenced_column_id = c2.column_id`,
			`WHERE fkc.constraint_object_id = ${fk.FK_ID}`,
			`ORDER BY fkc.constraint_column_id`,
		].join('\n')
		const resFkColumns = await server.exec<{ FK_COLUMN: string; REF_COLUMN: string }[]>(scriptFkColumns)
		if (!resFkColumns.ok) {
			return { error: resFkColumns.error, ok: false }
		}
		const fkColumns = resFkColumns.result.map(c => c.FK_COLUMN).join(', ')
		const refColumns = resFkColumns.result.map(c => c.REF_COLUMN).join(', ')
		foreignKeys.push(`CONSTRAINT [${fk.FK_NAME}] FOREIGN KEY (${fkColumns}) REFERENCES [${fk.REF_SCHEMA}].[${fk.REF_TABLE}] (${refColumns})`)
	}

	let ddl = `CREATE TABLE [${schema}].[${tableName}] (\n    ${[...columns, ...constraints, ...foreignKeys].join(',\n    ')}\n)`

	if (config.objects.storage.allowFilegroup) {
		const scriptFilegroup = [
			`SELECT fg.name AS FILEGROUP_NAME`,
			`FROM sys.tables t`,
			`JOIN sys.schemas s ON t.schema_id = s.schema_id`,
			`JOIN sys.indexes i ON t.object_id = i.object_id AND i.index_id IN (0, 1)`,
			`JOIN sys.filegroups fg ON i.data_space_id = fg.data_space_id`,
			`WHERE s.name = '${schema}' AND t.name = '${tableName}'`,
		].join('\n')
		const resFilegroup = await server.exec<{ FILEGROUP_NAME: string }[]>(scriptFilegroup)
		if (resFilegroup.ok && resFilegroup.result.length > 0) {
			ddl += ` ON [${resFilegroup.result[0]!.FILEGROUP_NAME}]`
		}
	}

	return { result: ddl, ok: true }
}

async function getDdlView(server: DbMssql, schema: string, viewName: string): Promise<TResult<string>> {
	const script = [
		`SELECT m.definition AS TEXT`,
		`FROM sys.sql_modules m`,
		`JOIN sys.views v ON m.object_id = v.object_id`,
		`JOIN sys.schemas s ON v.schema_id = s.schema_id`,
		`WHERE s.name = '${schema}' AND v.name = '${viewName}'`,
	].join('\n')
	const resExec = await server.exec<{ TEXT: string }[]>(script)
	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}
	const text = resExec.result.map(m => m.TEXT).join('\n')
	return { result: text, ok: true }
}

async function getDdlProcedure(server: DbMssql, schema: string, procedureName: string): Promise<TResult<string>> {
	const script = [
		`SELECT m.definition AS TEXT`,
		`FROM sys.sql_modules m`,
		`JOIN sys.procedures p ON m.object_id = p.object_id`,
		`JOIN sys.schemas s ON p.schema_id = s.schema_id`,
		`WHERE s.name = '${schema}' AND p.name = '${procedureName}'`,
	].join('\n')
	const resExec = await server.exec<{ TEXT: string }[]>(script)
	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}
	const text = resExec.result.map(m => m.TEXT).join('\n')
	return { result: text, ok: true }
}

async function getDdlFunction(server: DbMssql, schema: string, functionName: string): Promise<TResult<string>> {
	const script = [
		`SELECT m.definition AS TEXT`,
		`FROM sys.sql_modules m`,
		`JOIN sys.objects o ON m.object_id = o.object_id`,
		`JOIN sys.schemas s ON o.schema_id = s.schema_id`,
		`WHERE s.name = '${schema}' AND o.name = '${functionName}' AND o.type IN ('FN', 'IF', 'TF')`,
	].join('\n')
	const resExec = await server.exec<{ TEXT: string }[]>(script)
	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}
	const text = resExec.result.map(m => m.TEXT).join('\n')
	return { result: text, ok: true }
}

async function getDdlTrigger(server: DbMssql, schema: string, triggerName: string): Promise<TResult<string>> {
	const script = [
		`SELECT m.definition AS TEXT`,
		`FROM sys.sql_modules m`,
		`JOIN sys.triggers t ON m.object_id = t.object_id`,
		`JOIN sys.objects o ON t.object_id = o.object_id`,
		`JOIN sys.schemas s ON o.schema_id = s.schema_id`,
		`WHERE s.name = '${schema}' AND t.name = '${triggerName}'`,
	].join('\n')
	const resExec = await server.exec<{ TEXT: string }[]>(script)
	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}
	const text = resExec.result.map(m => m.TEXT).join('\n')
	return { result: text, ok: true }
}

async function getDdlIndex(server: DbMssql, schema: string, indexName: string, config: TConfigMssql): Promise<TResult<string>> {
	const script = [
		`SELECT`,
		`    i.name AS INDEX_NAME,`,
		`    i.type_desc AS INDEX_TYPE,`,
		`    i.is_unique AS IS_UNIQUE,`,
		`    t.name AS TABLE_NAME,`,
		`    s.name AS SCHEMA_NAME,`,
		`    i.object_id AS OBJECT_ID,`,
		`    i.index_id AS INDEX_ID`,
		`FROM sys.indexes i`,
		`JOIN sys.tables t ON i.object_id = t.object_id`,
		`JOIN sys.schemas s ON t.schema_id = s.schema_id`,
		`WHERE s.name = '${schema}' AND i.name = '${indexName}'`,
	].join('\n')

	const resExec = await server.exec<{ INDEX_NAME: string; INDEX_TYPE: string; IS_UNIQUE: boolean; TABLE_NAME: string; SCHEMA_NAME: string; OBJECT_ID: number; INDEX_ID: number }[]>(
		script,
	)
	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}

	if (resExec.result.length === 0) {
		return { error: `index not found: ${indexName}`, ok: false }
	}

	const idx = resExec.result[0]!

	const scriptColumns = [
		`SELECT`,
		`    c.name AS COLUMN_NAME,`,
		`    ic.is_descending_key AS IS_DESC`,
		`FROM sys.index_columns ic`,
		`JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id`,
		`WHERE ic.object_id = ${idx.OBJECT_ID} AND ic.index_id = ${idx.INDEX_ID}`,
		`ORDER BY ic.key_ordinal`,
	].join('\n')
	const resColumns = await server.exec<{ COLUMN_NAME: string; IS_DESC: boolean }[]>(scriptColumns)
	if (!resColumns.ok) {
		return { error: resColumns.error, ok: false }
	}

	const columns = resColumns.result.map(c => `${c.COLUMN_NAME}${c.IS_DESC ? ' DESC' : ' ASC'}`).join(', ')
	const unique = idx.IS_UNIQUE ? 'UNIQUE ' : ''
	const type = idx.INDEX_TYPE === 'CLUSTERED' ? 'CLUSTERED' : 'NONCLUSTERED'
	let ddl = `CREATE ${unique}${type} INDEX [${idx.INDEX_NAME}] ON [${idx.SCHEMA_NAME}].[${idx.TABLE_NAME}] (${columns})`

	if (config.objects.storage.allowFilegroup) {
		const scriptFilegroup = [
			`SELECT fg.name AS FILEGROUP_NAME`,
			`FROM sys.indexes i`,
			`JOIN sys.filegroups fg ON i.data_space_id = fg.data_space_id`,
			`WHERE i.name = '${indexName}'`,
		].join('\n')
		const resFilegroup = await server.exec<{ FILEGROUP_NAME: string }[]>(scriptFilegroup)
		if (resFilegroup.ok && resFilegroup.result.length > 0) {
			ddl += ` ON [${resFilegroup.result[0]!.FILEGROUP_NAME}]`
		}
	}

	return { result: ddl, ok: true }
}

async function getDdlSequence(server: DbMssql, schema: string, sequenceName: string): Promise<TResult<string>> {
	const script = [
		`SELECT`,
		`    s.name AS SEQUENCE_NAME,`,
		`    t.name AS DATA_TYPE,`,
		`    seq.start_value AS START_VALUE,`,
		`    seq.increment AS INCREMENT,`,
		`    seq.minimum_value AS MIN_VALUE,`,
		`    seq.maximum_value AS MAX_VALUE,`,
		`    seq.is_cycling AS IS_CYCLE`,
		`FROM sys.sequences seq`,
		`JOIN sys.schemas s ON seq.schema_id = s.schema_id`,
		`JOIN sys.types t ON seq.user_type_id = t.user_type_id`,
		`WHERE s.name = '${schema}' AND seq.name = '${sequenceName}'`,
	].join('\n')

	const resExec = await server.exec<{
		SEQUENCE_NAME: string
		DATA_TYPE: string
		START_VALUE: number
		INCREMENT: number
		MIN_VALUE: number
		MAX_VALUE: number
		IS_CYCLE: boolean
	}[]>(script)

	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}

	if (resExec.result.length === 0) {
		return { error: `sequence not found: ${sequenceName}`, ok: false }
	}

	const seq = resExec.result[0]!
	let ddl = `CREATE SEQUENCE [${schema}].[${seq.SEQUENCE_NAME}] AS ${seq.DATA_TYPE} START WITH ${seq.START_VALUE} INCREMENT BY ${seq.INCREMENT}`
	ddl += ` MINVALUE ${seq.MIN_VALUE} MAXVALUE ${seq.MAX_VALUE}`
	if (seq.IS_CYCLE) {
		ddl += ' CYCLE'
	} else {
		ddl += ' NO CYCLE'
	}

	return { result: ddl, ok: true }
}

async function getDdlSynonym(server: DbMssql, schema: string, synonymName: string): Promise<TResult<string>> {
	const script = [
		`SELECT`,
		`    s.name AS SYNONYM_NAME,`,
		`    syn.base_object_name AS BASE_OBJECT`,
		`FROM sys.synonyms syn`,
		`JOIN sys.schemas s ON syn.schema_id = s.schema_id`,
		`WHERE s.name = '${schema}' AND syn.name = '${synonymName}'`,
	].join('\n')

	const resExec = await server.exec<{ SYNONYM_NAME: string; BASE_OBJECT: string }[]>(script)
	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}

	if (resExec.result.length === 0) {
		return { error: `synonym not found: ${synonymName}`, ok: false }
	}

	const syn = resExec.result[0]!
	return { result: `CREATE SYNONYM [${schema}].[${syn.SYNONYM_NAME}] FOR ${syn.BASE_OBJECT}`, ok: true }
}
