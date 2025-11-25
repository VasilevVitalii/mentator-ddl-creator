import type { DbMssql } from '../../db/mssql'
import type { TResult } from '../../tresult'
import type { TObjectMssql } from './getSchemaList'

export async function getDdlTableDesc(server: DbMssql, schema: string, object: TObjectMssql): Promise<TResult<string>> {
	const scriptTableComment = [
		`SELECT CAST(ep.value AS NVARCHAR(MAX)) AS COMMENTS`,
		`FROM sys.extended_properties ep`,
		`JOIN sys.tables t ON ep.major_id = t.object_id`,
		`JOIN sys.schemas s ON t.schema_id = s.schema_id`,
		`WHERE s.name = '${schema}' AND t.name = '${object.name}'`,
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
		`JOIN sys.tables t ON ep.major_id = t.object_id`,
		`JOIN sys.schemas s ON t.schema_id = s.schema_id`,
		`JOIN sys.columns c ON ep.major_id = c.object_id AND ep.minor_id = c.column_id`,
		`WHERE s.name = '${schema}' AND t.name = '${object.name}'`,
		`  AND ep.name = 'MS_Description'`,
		`  AND ep.minor_id > 0`,
	].join('\n')

	const resExec2 = await server.exec<{ COLUMN_NAME: string; COMMENTS: string }[]>(scriptColumnComments)
	if (!resExec2.ok) {
		return { error: resExec2.error, ok: false }
	}

	const text = [
		...resExec1.result.map(m => `EXEC sp_addextendedproperty 'MS_Description', N'${m.COMMENTS.replaceAll(`'`, `''`)}', 'SCHEMA', N'${schema}', 'TABLE', N'${object.name}';`),
		...resExec2.result.map(
			m =>
				`EXEC sp_addextendedproperty 'MS_Description', N'${m.COMMENTS.replaceAll(`'`, `''`)}', 'SCHEMA', N'${schema}', 'TABLE', N'${object.name}', 'COLUMN', N'${m.COLUMN_NAME}';`,
		),
	] as string[]

	return {
		result: text.join('\n').trim(),
		ok: true,
	}
}
