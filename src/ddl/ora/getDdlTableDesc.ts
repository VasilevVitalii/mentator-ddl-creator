import type { DbOra } from '../../db/ora'
import type { TResult } from '../../tresult'
import type { TObjectOra } from './getSchemaList'

export type TTableDescData = {
	tableDesc: string
	columnDescs: { columnName: string; desc: string }[]
	columnSpecs: { columnName: string; spec: string }[]
}

type TOraColumnRow = {
	COLUMN_NAME: string
	DATA_TYPE: string
	DATA_LENGTH: number
	DATA_PRECISION: number | null
	DATA_SCALE: number | null
	CHAR_LENGTH: number
	CHAR_USED: string
	NULLABLE: string
}

function buildOraColumnSpec(row: TOraColumnRow): string {
	const dataType = row.DATA_TYPE
	let spec = dataType

	if (['VARCHAR2', 'CHAR', 'NVARCHAR2', 'NCHAR'].includes(dataType)) {
		const len = row.CHAR_LENGTH || row.DATA_LENGTH
		const unit = row.CHAR_USED === 'C' ? ' CHAR' : ' BYTE'
		spec += `(${len}${unit})`
	} else if (dataType === 'NUMBER') {
		if (row.DATA_PRECISION !== null) {
			spec += row.DATA_SCALE !== null && row.DATA_SCALE !== 0 ? `(${row.DATA_PRECISION}, ${row.DATA_SCALE})` : `(${row.DATA_PRECISION})`
		}
	} else if (dataType === 'FLOAT') {
		if (row.DATA_PRECISION !== null) {
			spec += `(${row.DATA_PRECISION})`
		}
	} else if (dataType === 'RAW') {
		spec += `(${row.DATA_LENGTH})`
	}

	spec += row.NULLABLE === 'N' ? ' NOT NULL' : ' NULL'
	return spec
}

export async function getDdlTableDesc(server: DbOra, schema: string, object: TObjectOra): Promise<TResult<TTableDescData>> {
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

	const script3 = [
		`SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE,`,
		`       CHAR_LENGTH, CHAR_USED, NULLABLE`,
		`FROM ALL_TAB_COLUMNS`,
		`WHERE OWNER = '${schema}' AND TABLE_NAME = '${object.name}'`,
		`ORDER BY COLUMN_ID`,
	].join('\n')
	const resExec3 = await server.exec<TOraColumnRow[]>(script3)
	if (!resExec3.ok) {
		return { error: resExec3.error, ok: false }
	}

	return {
		result: {
			tableDesc: resExec1.result[0]?.COMMENTS || '',
			columnDescs: resExec2.result.map(m => ({ columnName: m.COLUMN_NAME, desc: m.COMMENTS })),
			columnSpecs: resExec3.result.map(row => ({ columnName: row.COLUMN_NAME, spec: buildOraColumnSpec(row) })),
		},
		ok: true,
	}
}
