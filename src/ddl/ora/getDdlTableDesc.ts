import type { DbOra } from '../../db/ora'
import type { TResult } from '../../tresult'
import type { TObjectOra } from './getSchemaList'

export async function getDdlTableDesc(server: DbOra, schema: string, object: TObjectOra): Promise<TResult<string>> {
	const script1 = `SELECT COMMENTS FROM ALL_TAB_COMMENTS WHERE OWNER = '${schema}' AND TABLE_NAME = '${object.name}' AND COMMENTS IS NOT NULL`
	const resExec1 = await server.exec<{ COMMENTS: string }[]>(script1)
	if (!resExec1.ok) {
		return { error: resExec1.error, ok: false }
	}
	const script2 = `SELECT COLUMN_NAME, COMMENTS FROM ALL_COL_COMMENTS WHERE OWNER = '${schema}' AND TABLE_NAME = '${object.name}' AND COMMENTS IS NOT NULL`
	const resExec2 = await server.exec<{ COLUMN_NAME: string; COMMENTS: string }[]>(script2)
	if (!resExec2.ok) {
		return { error: resExec2.error, ok: false }
	}

	const text = [
		...resExec1.result.map(m => `COMMENT ON TABLE ${schema}.${object.name} IS '${m.COMMENTS.replaceAll(`'`, `''`)}';`),
		...resExec2.result.map(m => `COMMENT ON COLUMN ${schema}.${object.name}.${m.COLUMN_NAME} IS '${m.COMMENTS.replaceAll(`'`, `''`)}';`),
	] as string[]

	return {
		result: text.join('\n').trim(),
		ok: true,
	}
}
