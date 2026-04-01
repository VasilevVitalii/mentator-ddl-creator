import type { DbOra } from '../../db/ora'
import type { TResult } from '../../tresult'
import type { TObjectOra } from './getSchemaList'
import type { TStampParam, TStampForeignKey } from '../../util/makeStamp'

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

type TOraParamRow = {
	ARGUMENT_NAME: string
	DATA_TYPE: string
	DATA_LENGTH: number
	DATA_PRECISION: number | null
	DATA_SCALE: number | null
	CHAR_LENGTH: number
	CHAR_USED: string | null
	IN_OUT: string
}

function buildOraParamSpec(row: TOraParamRow): string {
	const dataType = row.DATA_TYPE
	let typeSpec = dataType

	if (['VARCHAR2', 'CHAR', 'NVARCHAR2', 'NCHAR'].includes(dataType)) {
		const len = row.CHAR_LENGTH || row.DATA_LENGTH
		const unit = row.CHAR_USED === 'C' ? ' CHAR' : ' BYTE'
		typeSpec += `(${len}${unit})`
	} else if (dataType === 'NUMBER') {
		if (row.DATA_PRECISION !== null) {
			typeSpec += row.DATA_SCALE !== null && row.DATA_SCALE !== 0 ? `(${row.DATA_PRECISION}, ${row.DATA_SCALE})` : `(${row.DATA_PRECISION})`
		}
	} else if (dataType === 'FLOAT') {
		if (row.DATA_PRECISION !== null) {
			typeSpec += `(${row.DATA_PRECISION})`
		}
	} else if (dataType === 'RAW') {
		typeSpec += `(${row.DATA_LENGTH})`
	}

	return `${row.IN_OUT} ${typeSpec}`
}

export async function getDdlParamList(server: DbOra, schema: string, objectName: string): Promise<TResult<TStampParam[]>> {
	const script = [
		`SELECT ARGUMENT_NAME, DATA_TYPE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE,`,
		`       CHAR_LENGTH, CHAR_USED, IN_OUT`,
		`FROM ALL_ARGUMENTS`,
		`WHERE OWNER = '${schema}' AND OBJECT_NAME = '${objectName}'`,
		`  AND PACKAGE_NAME IS NULL`,
		`  AND ARGUMENT_NAME IS NOT NULL`,
		`ORDER BY POSITION`,
	].join('\n')

	const resExec = await server.exec<TOraParamRow[]>(script)
	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}

	return {
		result: resExec.result.map(row => ({
			object_name: row.ARGUMENT_NAME,
			spec: buildOraParamSpec(row),
		})),
		ok: true,
	}
}

type TOraFKRow = {
	FK_NAME: string
	COLUMN_MY: string
	COLUMN_REF: string
	REF_SCHEMA: string
	REF_TABLE: string
}

export async function getDdlForeignList(server: DbOra, schema: string, objectName: string): Promise<TResult<TStampForeignKey[]>> {
	const script = [
		`SELECT`,
		`    c.constraint_name AS FK_NAME,`,
		`    cc.column_name AS COLUMN_MY,`,
		`    rc.column_name AS COLUMN_REF,`,
		`    r.owner AS REF_SCHEMA,`,
		`    r.table_name AS REF_TABLE`,
		`FROM all_constraints c`,
		`JOIN all_cons_columns cc ON c.owner = cc.owner AND c.constraint_name = cc.constraint_name`,
		`JOIN all_constraints r ON c.r_owner = r.owner AND c.r_constraint_name = r.constraint_name`,
		`JOIN all_cons_columns rc ON r.owner = rc.owner AND r.constraint_name = rc.constraint_name AND cc.position = rc.position`,
		`WHERE c.owner = '${schema}' AND c.table_name = '${objectName}' AND c.constraint_type = 'R'`,
		`ORDER BY c.constraint_name, cc.position`,
	].join('\n')

	const resExec = await server.exec<TOraFKRow[]>(script)
	if (!resExec.ok) {
		return { error: resExec.error, ok: false }
	}

	const map = new Map<string, TStampForeignKey>()
	for (const row of resExec.result) {
		if (!map.has(row.FK_NAME)) {
			map.set(row.FK_NAME, { ref: `${row.REF_SCHEMA}.${row.REF_TABLE}`, column_list: [] })
		}
		map.get(row.FK_NAME)!.column_list.push({ column_my: row.COLUMN_MY, column_ref: row.COLUMN_REF })
	}

	return { result: [...map.values()], ok: true }
}
