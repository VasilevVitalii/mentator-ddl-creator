import type { DbMssql } from '../../db/mssql'
import type { TResult } from '../../tresult'
import type { TTableFill } from './getSchemaList'
import { EFormatTableFill, type TConfigMssql } from '../../config'
import { matchPattern } from '../../util/matchPattern'
import { mockValue } from '../../util/mockValue'

export async function getTableFill(
	server: DbMssql,
	schema: string,
	table: TTableFill,
	database: string,
	format: EFormatTableFill = EFormatTableFill.SQL,
	mockConfig?: TConfigMssql['objects']['table_fill_demo']['mock'],
): Promise<TResult<string>> {
	const scriptColumns = [
		`SELECT c.name AS COLUMN_NAME, t.name AS DATA_TYPE`,
		`FROM sys.columns c`,
		`JOIN sys.types t ON c.user_type_id = t.user_type_id`,
		`JOIN sys.tables tb ON c.object_id = tb.object_id`,
		`JOIN sys.schemas s ON tb.schema_id = s.schema_id`,
		`WHERE s.name = '${schema}' AND tb.name = '${table.name}'`,
		`ORDER BY c.column_id`,
	].join('\n')

	const resColumns = await server.exec<{ COLUMN_NAME: string; DATA_TYPE: string }[]>(scriptColumns)
	if (!resColumns.ok) {
		return { error: resColumns.error, ok: false }
	}

	const excludeColumns = resColumns.result
		.filter(col => col.DATA_TYPE === 'timestamp' || col.DATA_TYPE === 'rowversion')
		.map(col => col.COLUMN_NAME)

	const orderBy = table.pklist.length > 0 ? (
		table.fill === 'full'
			? `ORDER BY ${table.pklist.join(',')}`
			: `ORDER BY ${table.pklist.join(' DESC,')} DESC`
	) : ``
	const rowCount = table.fill === 'full' ? `` : `TOP ${table.count || 3}`

	const res = await server.exec<any[]>(`SELECT ${rowCount} * FROM [${schema}].[${table.name}] ${orderBy}`)
	if (!res.ok) {
		return { error: res.error, ok: false }
	}
	if (res.result.length <= 0) {
		return { result: format === EFormatTableFill.JSON ? '{"row":[]}' : '--NO DATA', ok: true }
	}
	const columnList = Object.keys(res.result[0]).filter(col => !excludeColumns.includes(col))

	// Apply mocking if configured
	if (mockConfig && mockConfig.length > 0) {
		// Determine which fields need to be mocked
		const fieldsToMock = new Set<string>()
		for (const mockRule of mockConfig) {
			const schemaMatch = matchPattern(schema, mockRule.schema)
			const tableMatch = matchPattern(table.name, mockRule.table)
			if (schemaMatch && tableMatch) {
				// Check each column against the field pattern
				columnList.forEach(column => {
					if (matchPattern(column, mockRule.field)) {
						fieldsToMock.add(column)
					}
				})
			}
		}

		// Apply mocking to the fields
		if (fieldsToMock.size > 0) {
			res.result = res.result.map(row => {
				const mockedRow = { ...row }
				fieldsToMock.forEach(field => {
					mockedRow[field] = mockValue(row[field])
				})
				return mockedRow
			})
		}
	}

	// Generate JSON format
	if (format === EFormatTableFill.JSON) {
		const jsonData = {
			schema_name: schema,
			object_name: table.name,
			database_name: database,
			row: res.result.map(row => {
				const jsonRow: Record<string, any> = {}
				columnList.forEach(column => {
					const val = row[column]
					if (val === null || val === undefined) {
						jsonRow[column] = null
					} else if (val instanceof Date) {
						jsonRow[column] = val.toISOString()
					} else {
						jsonRow[column] = val
					}
				})
				return jsonRow
			})
		}
		return { result: JSON.stringify(jsonData, null, 2), ok: true }
	}

	// Generate SQL format
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
					return `CAST('${year}-${month}-${day}' AS DATE)`
				}
				return `CAST('${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}' AS DATETIME2)`
			}
			return `N'${val.toString().replace(/'/g, "''")}'`
		})
		return `(${values.join(', ')})`
	})
	const text = `INSERT INTO [${schema}].[${table.name}] ([${columnList.join('], [')}])\nVALUES\n${insertParts.join(',\n')};`

	return { result: text, ok: true }
}
