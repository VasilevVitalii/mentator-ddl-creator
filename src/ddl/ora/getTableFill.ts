import type { DbOra } from '../../db/ora'
import type { TResult } from '../../tresult'
import type { TTableFill } from './getSchemaList'

export async function getTableFill(server: DbOra, schema: string, table: TTableFill): Promise<TResult<string>> {
	const orderBy = table.pklist.length > 0 ? (
		table.fill === 'full'
			? `ORDER BY ${table.pklist.join(',')}`
			: `ORDER BY ${table.pklist.join(' DESC NULLS LAST,')} DESC NULLS LAST`
	) : ``
	const rowCount = table.fill === 'full' ? `` : `FETCH FIRST ${table.count || 3} ROWS ONLY`

	const res = await server.exec<any[]>(`SELECT * FROM ${schema}.${table.name} ${orderBy} ${rowCount}`)
	if (!res.ok) {
		return { error: res.error, ok: false }
	}
	if (res.result.length <= 0) {
		return { result: '--NO DATA', ok: true }
	}
	const columnList = Object.keys(res.result[0])
	const insertParts = res.result.map(row => {
		const values = columnList.map(column => {
			const val = row[column]
			if (val === null || val === undefined) return 'NULL'
			if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') return val
			if (val instanceof Date) {
				const year = val.getFullYear()
				const month = String(val.getMonth() + 1).padStart(2, '0')
				const day = String(val.getDate()).padStart(2, '0')
				const hours = String(val.getHours()).padStart(2, '0')
				const minutes = String(val.getMinutes()).padStart(2, '0')
				const seconds = String(val.getSeconds()).padStart(2, '0')
				const milliseconds = String(val.getMilliseconds()).padStart(3, '0')
				if (hours === '00' && minutes === '00' && seconds === '00' && milliseconds === '000') {
					return `TO_DATE('${year}-${month}-${day}','YYYY-MM-DD')`
				}
				return `TO_TIMESTAMP('${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}','YYYY-MM-DD HH24:MI:SS.FF3')`
			}
			return `'${val.toString().replace(/'/g, "''")}'`
		})
		return `SELECT ${values.join(', ')} FROM DUAL`
	})
	const text = `INSERT INTO "${schema}"."${table.name}" (${columnList.map(c => `"${c}"`).join(', ')})\n` + insertParts.join('\nUNION ALL\n') + ';'

	return { result: text, ok: true }
}
