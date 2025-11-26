import { vvConfigJsonc, Type, type Static } from 'vv-config-jsonc'
import { join } from 'path'
import { fsWriteFileSync } from './util/fsWriteFile'
import { readFileSync } from 'fs'
import { ELoggerMode } from './logger'
import { SConnectionOra } from './db/ora'
import { SConnectionPg } from './db/pg'
import { SConnectionMssql } from './db/mssql'

export enum EDdlKind {
	ORA = 'ORA',
	PG = 'PG',
	MSSQL = 'MSSQL',
}

export enum EUseMode {
	INCLUDE = 'INCLUDE',
	EXCEPT = 'EXCEPT',
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
		storage : Type.Object({
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
					description: 'path template for storing table DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/TABLE/{{schema-name}}.TBL.{{object-name}}.sql',
				}),
			),
		}),
		view: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing view DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/VIEW/{{schema-name}}.VVW.{{object-name}}.sql',
				}),
			),
		}),
		mview: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing materialized view DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/MVIEW/{{schema-name}}.MVW.{{object-name}}.sql',
				}),
			),
		}),
		index: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing index DDL scripts; supports placeholders {{schema-name}}, {{parent-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/INDEX/{{schema-name}}.TBL.{{parent-name}}.IDX.{{object-name}}.sql',
				}),
			),
		}),
		trigger: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing trigger DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/TRIGGER/{{schema-name}}.TRG.{{object-name}}.sql',
				}),
			),
		}),
		package: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing package specification DDL scripts; supports placeholders {{schema-name}} and {{object-name}}.',
					default: 'path/to/ddl/{{schema-name}}/PACKAGE/{{schema-name}}.PKH.{{object-name}}.sql',
				}),
			),
		}),
		package_body: Type.Object({
			dir: Type.Optional(
				Type.String({
					description:
						'path template for storing package body DDL scripts; If not set, spec and body are stored in one file; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/PACKAGEBODY/{{schema-name}}.PKB.{{object-name}}.sql',
				}),
			),
		}),
		procedure: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing procedure DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/PROCEDURE/{{schema-name}}.PRC.{{object-name}}.sql',
				}),
			),
		}),
		function: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing function DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/FUNCTION/{{schema-name}}.FUN.{{object-name}}.sql',
				}),
			),
		}),
		type: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing type DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/TYPE/{{schema-name}}.TPH.{{object-name}}.sql',
				}),
			),
		}),
		type_body: Type.Object({
			dir: Type.Optional(
				Type.String({
					description:
						'path template for storing type body DDL scripts; If not set, spec and body are stored in one file; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/TYPEBODY/{{schema-name}}.TPB.{{object-name}}.sql',
				}),
			),
		}),
		sequence: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing sequence DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/SEQUENCE/{{schema-name}}.SEQ.{{object-name}}.sql',
				}),
			),
		}),
		synonym: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing synonym DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/SYNONYM/{{schema-name}}.SYN.{{object-name}}.sql',
				}),
			),
		}),
		job: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing job DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/JOB/{{schema-name}}.JOB.{{object-name}}.sql',
				}),
			),
		}),
		table_fill_full: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing full data insert scripts for tables; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/TABLE.FILL.FULL/{{schema-name}}.TBL.{{object-name}}.FF.sql',
				}),
			),
			list: Type.Array(Type.String(), {
				description: 'list of tables for which to generate full data insert scripts; example: ["schema1.table1", "schema2.table1"]',
				default: ['schema1.table1', 'schema2.table1'],
			}),
		}),
		table_fill_demo: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing demo data insert scripts (few records) for tables. supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/TABLE.FILL.DEMO/{{schema-name}}.TBL.{{object-name}}.FD.sql',
				}),
			),
			count: Type.Optional(Type.Integer({ description: 'number of records to include in the demo data script', default: 3, minimum: 0 })),
			ignore_exists: Type.Optional(Type.Boolean({ description: 'if true, do not regenerate the script if the file already exists', default: false })),
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
		schema: Type.Object({
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
					description: 'path template for storing table DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/TABLE/{{schema-name}}.TBL.{{object-name}}.sql',
				}),
			),
		}),
		view: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing view DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/VIEW/{{schema-name}}.VVW.{{object-name}}.sql',
				}),
			),
		}),
		index: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing index DDL scripts; supports placeholders {{schema-name}}, {{parent-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/INDEX/{{schema-name}}.TBL.{{parent-name}}.IDX.{{object-name}}.sql',
				}),
			),
		}),
		trigger: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing trigger DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/TRIGGER/{{schema-name}}.TRG.{{object-name}}.sql',
				}),
			),
		}),
		procedure: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing procedure DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/PROCEDURE/{{schema-name}}.PRC.{{object-name}}.sql',
				}),
			),
		}),
		function: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing function DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/FUNCTION/{{schema-name}}.FUN.{{object-name}}.sql',
				}),
			),
		}),
		sequence: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing sequence DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/SEQUENCE/{{schema-name}}.SEQ.{{object-name}}.sql',
				}),
			),
		}),
		synonym: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing synonym DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/SYNONYM/{{schema-name}}.SYN.{{object-name}}.sql',
				}),
			),
		}),
		job: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing job DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/JOB/{{schema-name}}.JOB.{{object-name}}.sql',
				}),
			),
		}),
		table_fill_full: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing full data insert scripts for tables; supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/TABLE.FILL.FULL/{{schema-name}}.TBL.{{object-name}}.FF.sql',
				}),
			),
			list: Type.Array(Type.String(), {
				description: 'list of tables for which to generate full data insert scripts; example: ["schema1.table1", "schema2.table1"]',
				default: ['schema1.table1', 'schema2.table1'],
			}),
		}),
		table_fill_demo: Type.Object({
			dir: Type.Optional(
				Type.String({
					description: 'path template for storing demo data insert scripts (few records) for tables. supports placeholders {{schema-name}} and {{object-name}}',
					default: 'path/to/ddl/{{schema-name}}/TABLE.FILL.DEMO/{{schema-name}}.TBL.{{object-name}}.FD.sql',
				}),
			),
			count: Type.Optional(Type.Integer({ description: 'number of records to include in the demo data script', default: 3, minimum: 0 })),
			ignore_exists: Type.Optional(Type.Boolean({ description: 'if true, do not regenerate the script if the file already exists', default: false })),
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
	const fullFileName = join(fullPath, `mentator-code-loader.config.TEMPLATE.${kind}.jsonc`)
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
