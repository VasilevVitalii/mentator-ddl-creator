#!/usr/bin/env bun

import { EDdlKind, EUseMode } from '../src/config'
import { Go } from '../src/go'
import { ELoggerMode } from '../src/logger'

export function DebugMssql() {
	Go({
		log: {
			dir: './debug/log',
			mode: ELoggerMode.REWRITE,
		},
		db: {
			kind: EDdlKind.MSSQL,
			connection: {
				host: 'localhost',
				port: 51433,
				database: 'AdventureWorks',
				login: 'sa',
				password: 'Qwerty123$',
				passwordCrypted: false,
			},
			objects: {
				database: {
					dir: './debug/ddl-mssql/{{base-name}}/{{base-name}}.DTB.sql',
				},
				schema: {
					dir: './debug/ddl-mssql/{{base-name}}/{{schema-name}}/{{schema-name}}.SCH.sql',
					list: [],
					mode: EUseMode.EXCEPT,
				},
				storage: {
					allowFilegroup: true,
				},
				table: {
					dir: './debug/ddl-mssql/{{base-name}}/{{schema-name}}/TABLE/{{schema-name}}.TBL.{{object-name}}.sql',
				},
				view: {
					dir: './debug/ddl-mssql/{{base-name}}/{{schema-name}}/VIEW/{{schema-name}}.VIE.{{object-name}}.sql',
				},
				index: {
					dir: './debug/ddl-mssql/{{base-name}}/{{schema-name}}/INDEX/{{schema-name}}.TBL.{{parent-name}}.IDX.{{object-name}}.sql',
				},
				trigger: {
					dir: './debug/ddl-mssql/{{base-name}}/{{schema-name}}/TRIGGER/{{schema-name}}.TRG.{{object-name}}.sql',
				},
				procedure: {
					dir: './debug/ddl-mssql/{{base-name}}/{{schema-name}}/PROCEDURE/{{schema-name}}.PRC.{{object-name}}.sql',
				},
				function: {
					dir: './debug/ddl-mssql/{{base-name}}/{{schema-name}}/FUNCTION/{{schema-name}}.FUN.{{object-name}}.sql',
				},
				sequence: {
					dir: './debug/ddl-mssql/{{base-name}}/{{schema-name}}/SEQUENCE/{{schema-name}}.SEQ.{{object-name}}.sql',
				},
				synonym: {
					dir: './debug/ddl-mssql/{{base-name}}/{{schema-name}}/SYNONYM/{{schema-name}}.SYN.{{object-name}}.sql',
				},
				job: {
					dir: './debug/ddl-mssql/{{base-name}}/{{schema-name}}/JOB/{{schema-name}}.JOB.{{object-name}}.sql',
				},
				table_fill_full: {
					dir: './debug/ddl/{{base-name}}/{{schema-name}}/TABLEFILLFULL/{{schema-name}}.TBL.{{object-name}}.FILLFULL.sql',
					list: ['dbo.MyTable'],
				},
				table_fill_demo: {
					dir: './debug/ddl/{{base-name}}/{{schema-name}}/TABLEFILLDEMO/{{schema-name}}.TBL.{{object-name}}.FILLDEMO.sql',
					count: 3,
					ignore_exists: false,
				},
			},
		},
	})
}
