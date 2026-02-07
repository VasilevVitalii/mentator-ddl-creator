import { vvConfigJsonc, Type, type Static } from 'vv-config-jsonc'
import { join } from 'path'
import { fsWriteFileSync } from './util/fsWriteFile'
import { readFileSync } from 'fs'
import { ELoggerMode } from './logger'
import { SConnectionOra } from './db/ora'
import { SConnectionPg } from './db/pg'
import { SConnectionMssql } from './db/mssql'
import { DefaultPathMssql, DefaultPathOra } from './config.default'

export enum EDdlKind {
	ORA = 'ORA',
	PG = 'PG',
	MSSQL = 'MSSQL',
}

export enum EUseMode {
	INCLUDE = 'INCLUDE',
	EXCEPT = 'EXCEPT',
}

export enum EFilterTableFill {
	WHITELIST = 'WHITELIST',
	BLACKLIST = 'BLACKLIST',
}

export enum EFormatTableFill {
	SQL = 'SQL',
	JSON = 'JSON'
}

export const SConfigOra = Type.Object({
	kind: Type.Literal(EDdlKind.ORA, { description: 'specifies that this configuration is for Oracle Database' }),
	connection: SConnectionOra,
	objects: Type.Object({
		schema: Type.Object({
			list: Type.Array(Type.String(), { description: 'list of schemas to process', default: ['MY_SCHEMA1', 'MY_SCHEMA2'] }),
			mode: Type.Enum(EUseMode, {
				description: 'INCLUDE: process only schemas from the list; EXCEPT: process all schemas except those in the list',
				default: 'INCLUDE',
			}),
		}),
		storage: Type.Object({
			allowStorage: Type.Boolean({
				description: 'for TABLE and MATERIALIZED VIEW: if true, include STORAGE parameters (INITIAL, NEXT, MINEXTENTS, etc.)',
				default: false,
			}),
			allowTablespace: Type.Boolean({
				description: 'for TABLE and MATERIALIZED VIEW: if true, include TABLESPACE clause',
				default: false,
			}),
		}),
		table: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.table.desc,
					default: `path/to/ddl/${DefaultPathOra.table.path}`,
				}),
			),
		}),
		view: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.view.desc,
					default: `path/to/ddl/${DefaultPathOra.view.path}`,
				}),
			),
		}),
		mview: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.mview.desc,
					default: `path/to/ddl/${DefaultPathOra.mview.path}`,
				}),
			),
		}),
		index: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.index.desc,
					default: `path/to/ddl/${DefaultPathOra.index.path}`,
				}),
			),
		}),
		trigger: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.trigger.desc,
					default: `path/to/ddl/${DefaultPathOra.trigger.path}`,
				}),
			),
		}),
		package: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.package.desc,
					default: `path/to/ddl/${DefaultPathOra.package.path}`,
				}),
			),
		}),
		package_body: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.packagebody.desc,
					default: `path/to/ddl/${DefaultPathOra.packagebody.path}`,
				}),
			),
		}),
		procedure: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.procedure.desc,
					default: `path/to/ddl/${DefaultPathOra.procedure.path}`,
				}),
			),
		}),
		function: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.function.desc,
					default: `path/to/ddl/${DefaultPathOra.function.path}`,
				}),
			),
		}),
		type: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.type.desc,
					default: `path/to/ddl/${DefaultPathOra.type.path}`,
				}),
			),
		}),
		type_body: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.typebody.desc,
					default: `path/to/ddl/${DefaultPathOra.typebody.path}`,
				}),
			),
		}),
		sequence: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.sequence.desc,
					default: `path/to/ddl/${DefaultPathOra.sequence.path}`,
				}),
			),
		}),
		synonym: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.synonym.desc,
					default: `path/to/ddl/${DefaultPathOra.synonym.path}`,
				}),
			),
		}),
		job: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.job.desc,
					default: `path/to/ddl/${DefaultPathOra.job.path}`,
				}),
			),
		}),
		table_fill_full: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.table_fill_full.desc,
					default: `path/to/ddl/${DefaultPathOra.table_fill_full.path}`,
				}),
			),
			format: Type.Optional(Type.Enum(EFormatTableFill, {
				description: 'format for save fill data: SQL - as sql script "insert", JSON - as json array',
				default: 'SQL'
			})),
			list: Type.Optional(
				Type.Array(
					Type.Object({
						schema: Type.String({
							description: 'schema name, you can use char "*" as the first or last element of the pattern',
							default: `MY_SCHEMA1`,
						}),
						table: Type.String({
							description: 'table name, you can use char "*" as the first or last element of the pattern',
							default: `myTable1`,
						}),
					}),
					{
						description: 'list of tables for which to generate full data insert scripts',
						default: [],
					},
				),
			),
		}),
		table_fill_demo: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathOra.table_fill_demo.desc,
					default: `path/to/ddl/${DefaultPathOra.table_fill_demo.path}`,
				}),
			),
			format: Type.Optional(Type.Enum(EFormatTableFill, {
				description: 'format for save fill data: SQL - as sql script "insert", JSON - as json array',
				default: 'SQL'
			})),
			count: Type.Optional(Type.Integer({ description: 'number of records to include in the demo data script', default: 3, minimum: 0 })),
		filter: Type.Optional(
			Type.Object(
				{
					mode: Type.Enum(EFilterTableFill, {
						description: 'WHITELIST: only tables from list; BLACKLIST: all tables except from list',
						default: 'WHITELIST',
					}),
					list: Type.Optional(
						Type.Array(
							Type.Object({
								schema: Type.String({
									description: 'schema name, you can use char "*" as the first or last element of the pattern',
									default: `MY_SCHEMA1`,
								}),
								table: Type.String({
									description: 'table name, you can use char "*" as the first or last element of the pattern',
									default: `myTable1`,
								}),
							}),
						),
					),
				},
				{ description: 'list of tables whose data will be exported' },
			),
		),
			mock: Type.Optional(
				Type.Array(
					Type.Object(
						{
							schema: Type.String({
								description: 'schema name, you can use char "*" as the first or last element of the pattern',
								default: `MY_SCHEMA1`,
							}),
							table: Type.String({
								description: 'table name, you can use char "*" as the first or last element of the pattern',
								default: `myTable1`,
							}),
							field: Type.String({
								description: 'field name, you can use char "*" as the first or last element of the pattern',
								default: `myField1`,
							}),
						},
						{ description: 'list of table fields for which data needs to be masked' },
					),
				),
			),
		}),
	}),
})
export type TConfigOra = Static<typeof SConfigOra>

export const SConfigPg = Type.Object({
	kind: Type.Literal(EDdlKind.PG, { description: 'work with PostgreSQL database' }),
	connection: SConnectionPg,
	objects: Type.Object({
		table: Type.Object({
			dir: Type.String({ description: 'full path to store dll script for table', default: 'path/to/DDL/TABLE' }),
		}),
	}),
})
export type TConfigPg = Static<typeof SConfigPg>

export const SConfigMssql = Type.Object({
	kind: Type.Literal(EDdlKind.MSSQL, { description: 'work with Microsoft SQL database' }),
	connection: SConnectionMssql,
	objects: Type.Object({
		database: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.database.desc,
					default: `path/to/ddl/${DefaultPathMssql.database.path}`,
				}),
			),
		}),
		schema: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.schema.desc,
					default: `path/to/ddl/${DefaultPathMssql.schema.path}`,
				}),
			),
			list: Type.Array(Type.String(), { description: 'list of schemas to process', default: ['MY_SCHEMA1', 'MY_SCHEMA2'] }),
			mode: Type.Enum(EUseMode, {
				description: 'INCLUDE: process only schemas from the list; EXCEPT: process all schemas except those in the list',
				default: 'INCLUDE',
			}),
		}),
		storage: Type.Object({
			allowFilegroup: Type.Boolean({
				description: 'for TABLE and INDEX: if true, include FILEGROUP clause',
				default: false,
			}),
		}),
		table: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.table.desc,
					default: `path/to/ddl/${DefaultPathMssql.table.path}`,
				}),
			),
		}),
		view: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.view.desc,
					default: `path/to/ddl/${DefaultPathMssql.view.path}`,
				}),
			),
		}),
		index: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.index.desc,
					default: `path/to/ddl/${DefaultPathMssql.index.path}`,
				}),
			),
		}),
		trigger: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.trigger.desc,
					default: `path/to/ddl/${DefaultPathMssql.trigger.path}`,
				}),
			),
		}),
		procedure: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.procedure.desc,
					default: `path/to/ddl/${DefaultPathMssql.procedure.path}`,
				}),
			),
		}),
		function: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.function.desc,
					default: `path/to/ddl/${DefaultPathMssql.function.path}`,
				}),
			),
		}),
		sequence: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.sequence.desc,
					default: `path/to/ddl/${DefaultPathMssql.sequence.path}`,
				}),
			),
		}),
		synonym: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.synonym.desc,
					default: `path/to/ddl/${DefaultPathMssql.synonym.path}`,
				}),
			),
		}),
		job: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.job.desc,
					default: `path/to/ddl/${DefaultPathMssql.job.path}`,
				}),
			),
		}),
		table_fill_full: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.table_fill_full.desc,
					default: `path/to/ddl/${DefaultPathMssql.table_fill_full.path}`,
				}),
			),
			format: Type.Optional(Type.Enum(EFormatTableFill, {
				description: 'format for save fill data: SQL - as sql script "insert", JSON - as json array',
				default: 'SQL'
			})),
			list: Type.Optional(
				Type.Array(
					Type.Object({
						schema: Type.String({
							description: 'schema name, you can use char "*" as the first or last element of the pattern',
							default: `dbo`,
						}),
						table: Type.String({
							description: 'table name, you can use char "*" as the first or last element of the pattern',
							default: `myTable1`,
						}),
					}),
					{
						description: 'list of tables for which to generate full data insert scripts',
						default: [],
					},
				),
			),
		}),
		table_fill_demo: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: DefaultPathMssql.table_fill_demo.desc,
					default: `path/to/ddl/${DefaultPathMssql.table_fill_demo.path}`,
				}),
			),
			format: Type.Optional(Type.Enum(EFormatTableFill, {
				description: 'format for save fill data: SQL - as sql script "insert", JSON - as json array',
				default: 'SQL'
			})),
			count: Type.Optional(Type.Integer({ description: 'number of records to include in the demo data script', default: 3, minimum: 0 })),
			filter: Type.Optional(
				Type.Object(
					{
						mode: Type.Enum(EFilterTableFill, {
							description: 'WHITELIST: only tables from list; BLACKLIST: all tables except from list',
							default: 'WHITELIST',
						}),
						list: Type.Optional(
							Type.Array(
								Type.Object({
									schema: Type.String({
										description: 'schema name, you can use char "*" as the first or last element of the pattern',
										default: `dbo`,
									}),
									table: Type.String({
										description: 'table name, you can use char "*" as the first or last element of the pattern',
										default: `myTable1`,
									}),
								}),
							),
						),
					},
					{ description: 'list of tables whose data will be exported' },
				),
			),
			mock: Type.Optional(
				Type.Array(
					Type.Object(
						{
							schema: Type.String({
								description: 'schema name, you can use char "*" as the first or last element of the pattern',
								default: `dbo`,
							}),
							table: Type.String({
								description: 'table name, you can use char "*" as the first or last element of the pattern',
								default: `myTable1`,
							}),
							field: Type.String({
								description: 'field name, you can use char "*" as the first or last element of the pattern',
								default: `myField1`,
							}),
						},
						{ description: 'list of table fields for which data needs to be masked' },
					),
				),
			),
		}),
	}),
})
export type TConfigMssql = Static<typeof SConfigMssql>

export const SConfig = Type.Object({
	log: Type.Object({
		dir: Type.String({ description: 'full path to log file', default: 'path/to/log' }),
		mode: Type.Enum(ELoggerMode, {
			description: 'REWRITE - write log to file "mentator-ddl-creator.log"; APPEND - write log to files mentator-ddl-creator.YYYYMMDD-HHMMSS.log',
			default: 'REWRITE',
		}),
	}),
	db: Type.Union([SConfigOra, SConfigPg, SConfigMssql]),
})
export type TConfig = Static<typeof SConfig>

export function ConfigGerenate(fullPath: string, kind: EDdlKind): { error?: string; success?: string } {
	const fullFileName = join(fullPath, `mentator-ddl-creator.config.TEMPLATE.${kind}.jsonc`)
	try {
		const conf = new vvConfigJsonc(SConfig).getDefault([{ path: 'db.kind', value: kind }])
		const resWrite = fsWriteFileSync(fullFileName, conf.text)
		if (resWrite.error) {
			return { error: `on create default config: ${resWrite.error}` }
		}
		return { success: `config create "${fullFileName}"` }
	} catch (err) {
		return { error: `on create default config: ${err}` }
	}
}

export function ConfigRead(fullFileName: string): { error?: string; conf?: TConfig } {
	try {
		const text = readFileSync(fullFileName, 'utf-8')
		const conf = new vvConfigJsonc(SConfig).getConfig(text)
		if (conf.errors.length > 0) {
			return { error: `error(s) in config "${fullFileName}": ${conf.errors.join('; ')}` }
		}
		fsWriteFileSync(fullFileName, conf.text)
		return { conf: conf.config }
	} catch (err) {
		return { error: `error read config "${fullFileName}": ${err}` }
	}
}
