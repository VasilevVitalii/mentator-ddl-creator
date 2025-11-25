import { type TConfigOra } from '../../config'
import { DbOra } from '../../db/ora'
import type { Logger } from '../../logger'
import { fsReadFile } from '../../util/fsReadFile'
import { fsWriteFile } from '../../util/fsWriteFile'
import { trim } from '../../util/trim'
import { getConfigDirList } from './getConfigDirList'
import { getDdl } from './getDdl'
import { getDdlTableDesc } from './getDdlTableDesc'
import { getDir } from './getDir'
import { getSchemaList } from './getSchemaList'
import { getStat } from './getStatList'
import { format } from 'sql-formatter'
import { getTableFill } from './getTableFill'

export async function GoOra(logger: Logger, config: TConfigOra): Promise<void> {
	const server = new DbOra()
	const resServerOpen = await server.open(
		config.connection,
		[
			`BEGIN`,
			`DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'SQLTERMINATOR', TRUE);`,
			`DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'CONSTRAINTS', TRUE);`,
			`DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'REF_CONSTRAINTS', TRUE);`,
			`DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'EMIT_SCHEMA', TRUE);`,
			`DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'CONSTRAINTS_AS_ALTER', FALSE);`,
			`DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'STORAGE', ${config.objects.storage.allowStorage ? 'TRUE' : 'FALSE'});`,
			`DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'TABLESPACE', ${config.objects.storage.allowTablespace ? 'TRUE' : 'FALSE'});`,
			`DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'BODY', ${config.objects.package_body.dir || config.objects.type_body.dir ? 'FALSE' : 'TRUE'});`,
			`END;`,
		].join('\n'),
	)
	if (resServerOpen.error) {
		logger.error(`on connect to Oracle server "${config.connection.host}:${config.connection.port}/${config.connection.service}":`, resServerOpen.error)
		return
	}

	const resGetSchemaList = await getSchemaList(server, config)
	if (!resGetSchemaList.ok) {
		logger.error(resGetSchemaList.error)
		return
	}
	const dirListRes = getConfigDirList(config.objects)
	if (!dirListRes.ok) {
		logger.error(dirListRes.error)
		return
	}
	const dirList = dirListRes.result
	const statList = getStat(resGetSchemaList.result, dirList)

	statList.forEach(stat => {
		const text = `find schema "${stat.schema}"${stat.objectList.length > 0 ? `` : ` (empty)`}`
		const additional = [] as string[]
		stat.objectList.forEach(itemStat => {
			additional.push(`${itemStat.kind.padEnd(16, ' ')} ${itemStat.count.toString().padStart(6, '0')}${itemStat.isIgnore ? ` (ignored)` : ``}`)
			if (itemStat.isIgnore) {
				resGetSchemaList.result
					.find(f => f.name === stat.schema)
					?.objectList.forEach(itemObject => {
						if (itemObject.kind === itemStat.kind) itemObject.state = 'ignore'
					})
			}
		})
		if (config.objects.table_fill_full.dir) {
			const countFullFill = resGetSchemaList.result.find(f => f.name === stat.schema)?.tableFillList?.filter(ff => ff.fill === 'full')?.length || 0
			if (countFullFill > 0) {
				additional.push(`${'TABLE FILL FULL'.padEnd(16, ' ')} ${countFullFill.toString().padStart(6, '0')}`)
			}
		}
		if (config.objects.table_fill_demo.dir) {
			const countFullDemo = resGetSchemaList.result.find(f => f.name === stat.schema)?.tableFillList?.filter(ff => ff.fill === 'demo')?.length || 0
			if (countFullDemo > 0) {
				additional.push(`${'TABLE FILL DEMO'.padEnd(16, ' ')} ${countFullDemo.toString().padStart(6, '0')}`)
			}
		}
		logger.debug(text, additional.length > 0 ? additional.join('\n') : undefined)
	})

	const totalObjectCount = resGetSchemaList.result.reduce(
		(sum, schema) => sum + schema.objectList.filter(f => f.state !== 'ignore').length + schema.tableFillList.filter(f => f.state !== 'ignore').length,
		0,
	)
	let currentObjectIdx = 0

	for (const schema of resGetSchemaList.result) {
		if (schema.objectList.length <= 0) continue
		logger.debug(`start schema "${schema.name}"`)
		for (const object of schema.objectList) {
			if (object.state === 'ignore') continue
			currentObjectIdx++
			const percent = `${((currentObjectIdx / totalObjectCount) * 100).toFixed(1)}%`.padStart(5, '0')
			const dirRes = getDir(object, schema, dirList)
			if (!dirRes.ok) {
				logger.error(dirRes.error)
				object.state = 'error'
				continue
			}
			const dir = dirRes.result
			const currentTextRes = await fsReadFile(dir)
			if (!currentTextRes.ok) {
				logger.error(`on read current file "${dir}"`, currentTextRes.error)
				object.state = 'error'
				continue
			}
			const actualTextRes = await getDdl(server, schema.name, object)
			if (!actualTextRes.ok) {
				logger.error(`on exec query in Oracle "${config.connection.host}:${config.connection.port}/${config.connection.service}"`, actualTextRes.error)
				object.state = 'error'
				continue
			}
			let actualText = trim(actualTextRes.result)
			while (actualText.endsWith('/')) {
				actualText = actualText.slice(0, -1)
				actualText = trim(actualText)
			}
			if (['TABLE', 'VIEW', 'MATERIALIZED_VIEW', 'INDEX', 'SEQUENCE', 'JOB'].includes(object.kind)) {
				actualText = format(actualText, { language: 'plsql' })
				actualText = trim(actualText)
			}
			if (object.kind === 'TABLE') {
				const descTextRes = await getDdlTableDesc(server, schema.name, object)
				if (!descTextRes.ok) {
					logger.error(
						`on exec query in Oracle "${config.connection.host}:${config.connection.port}/${config.connection.service}"`,
						descTextRes.error,
					)
					object.state = 'error'
					continue
				}
				actualText = trim(`${actualText}\n\n${trim(descTextRes.result)}`)
			}

			if (!currentTextRes.result) {
				const writeRes = await fsWriteFile(dir, actualText)
				if (writeRes.error) {
					logger.error(`on write file "${dir}"`, writeRes.error)
					object.state = 'error'
					continue
				} else {
					logger.debug(`[${percent}] create file "${dir}"`)
					object.state = 'insert'
				}
			} else if (actualText !== trim(currentTextRes.result)) {
				const writeRes = await fsWriteFile(dir, actualText)
				if (writeRes.error) {
					logger.error(`on update file "${dir}"`, writeRes.error)
					object.state = 'error'
					continue
				} else {
					logger.debug(`[${percent}] update file "${dir}"`)
					object.state = 'update'
				}
			} else {
				logger.debug(`[${percent}] no changes for file "${dir}"`)
				object.state = 'nochange'
			}
		}
		for (const object of schema.tableFillList) {
			if (object.state === 'ignore') continue
			currentObjectIdx++
			const percent = `${((currentObjectIdx / totalObjectCount) * 100).toFixed(1)}%`.padStart(5, '0')
			const dirRes = getDir(
				{ kind: object.fill === 'full' ? 'TABLE_FILL_FULL' : 'TABLE_FILL_DEMO', name: object.name, state: 'unprocessed' },
				schema,
				dirList,
			)
			if (!dirRes.ok) {
				logger.error(dirRes.error)
				object.state = 'error'
				continue
			}
			const dir = dirRes.result
			const currentTextRes = await fsReadFile(dir)
			if (!currentTextRes.ok) {
				logger.error(`on read current file "${dir}"`, currentTextRes.error)
				object.state = 'error'
				continue
			}
			if (currentTextRes.result && config.objects.table_fill_demo.ignore_exists) {
				logger.debug(`[${percent}] exists file with script "${dir}"`)
				object.state = 'nochange'
				continue
			}
			const actualTextRes = await getTableFill(server, schema.name, object)
			if (!actualTextRes.ok) {
				logger.error(`on exec query in Oracle "${config.connection.host}:${config.connection.port}/${config.connection.service}"`, actualTextRes.error)
				object.state = 'error'
				continue
			}
			let actualText = trim(actualTextRes.result)
			if (!currentTextRes.result) {
				const writeRes = await fsWriteFile(dir, actualText)
				if (writeRes.error) {
					logger.error(`on write file "${dir}"`, writeRes.error)
					object.state = 'error'
					continue
				} else {
					logger.debug(`[${percent}] create file "${dir}"`)
					object.state = 'insert'
				}
			} else if (actualText !== trim(currentTextRes.result)) {
				const writeRes = await fsWriteFile(dir, actualText)
				if (writeRes.error) {
					logger.error(`on update file "${dir}"`, writeRes.error)
					object.state = 'error'
					continue
				} else {
					logger.debug(`[${percent}] update file "${dir}"`)
					object.state = 'update'
				}
			} else {
				logger.debug(`[${percent}] no changes for file "${dir}"`)
				object.state = 'nochange'
			}
		}

		logger.debug(`stop schema "${schema.name}"`)
	}

	statList
		.filter(f => f.objectList.length > 0)
		.forEach(stat => {
			const text = `stat for schema "${stat.schema}"`
			const additional = [] as string[]
			const objectList = resGetSchemaList.result.find(f => f.name === stat.schema)?.objectList || []
			const tableFillFullList = resGetSchemaList.result.find(f => f.name === stat.schema)?.tableFillList || []
			stat.objectList
				.filter(f => !f.isIgnore)
				.forEach(itemStat => {
					const nochangeCount = objectList.filter(f => f.kind === itemStat.kind && f.state === 'nochange').length.toString()
					const insertCount = objectList.filter(f => f.kind === itemStat.kind && f.state === 'insert').length.toString()
					const updateCount = objectList.filter(f => f.kind === itemStat.kind && f.state === 'update').length.toString()
					const errorCount = objectList.filter(f => f.kind === itemStat.kind && f.state === 'error').length.toString()
					additional.push(
						[
							`${itemStat.kind}`.padEnd(16, ' '),
							`[error]=${errorCount.padStart(6, '0')}; `,
							`[no changes]=${nochangeCount.padStart(6, '0')}; `,
							`[create]=${insertCount.padStart(6, '0')}; `,
							`[update]=${updateCount.padStart(6, '0')}; `,
						].join(''),
					)
				})
			if (config.objects.table_fill_full.dir && tableFillFullList.filter(f => f.fill === 'full').length > 0) {
				const nochangeCountFillFull = tableFillFullList.filter(f => f.state === 'nochange' && f.fill === 'full').length.toString()
				const insertCountFillFull = tableFillFullList.filter(f => f.state === 'insert' && f.fill === 'full').length.toString()
				const updateCountFillFull = tableFillFullList.filter(f => f.state === 'update' && f.fill === 'full').length.toString()
				const errorCountFillFull = tableFillFullList.filter(f => f.state === 'error' && f.fill === 'full').length.toString()
				additional.push(
					[
						`TABLE FILL FULL`.padEnd(16, ' '),
						`[error]=${errorCountFillFull.padStart(6, '0')}; `,
						`[no changes]=${nochangeCountFillFull.padStart(6, '0')}; `,
						`[create]=${insertCountFillFull.padStart(6, '0')}; `,
						`[update]=${updateCountFillFull.padStart(6, '0')}; `,
					].join(''),
				)
			}
			if (config.objects.table_fill_demo.dir && tableFillFullList.filter(f => f.fill === 'demo').length > 0) {
				const nochangeCountFillDemo = tableFillFullList.filter(f => f.state === 'nochange' && f.fill === 'demo').length.toString()
				const insertCountFillDemo = tableFillFullList.filter(f => f.state === 'insert' && f.fill === 'demo').length.toString()
				const updateCountFillDemo = tableFillFullList.filter(f => f.state === 'update' && f.fill === 'demo').length.toString()
				const errorCountFillDemo = tableFillFullList.filter(f => f.state === 'error' && f.fill === 'demo').length.toString()
				additional.push(
					[
						`TABLE FILL DEMO`.padEnd(16, ' '),
						`[error]=${errorCountFillDemo.padStart(6, '0')}; `,
						`[no changes]=${nochangeCountFillDemo.padStart(6, '0')}; `,
						`[create]=${insertCountFillDemo.padStart(6, '0')}; `,
						`[update]=${updateCountFillDemo.padStart(6, '0')}; `,
					].join(''),
				)
			}
			logger.debug(text, additional.length > 0 ? additional.join('\n') : undefined)
		})
}
