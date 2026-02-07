#!/usr/bin/env bun

import { EDdlKind, EUseMode } from '../src/config'
import { Go } from '../src/go'
import { ELoggerMode } from '../src/logger'

export function DebugOra() {
	Go({
		log: {
			dir: './debug/log',
			mode: ELoggerMode.REWRITE,
		},
		db: {
			kind: EDdlKind.ORA,
			connection: {
				host: 'localhost',
				port: 51521,
				service: 'XEPDB1',
				login: 'sys',
				password: 'mysecurepassword',
				passwordCrypted: false,
			},
			objects: {
				schema: {
					list: [],
					mode: EUseMode.EXCEPT,
				},
				storage: {
					allowStorage: true,
					allowTablespace: true,
				},
				table: {
					dir: './debug/ddl/{{schema-name}}/TABLE/{{schema-name}}.TBL.{{object-name}}.sql',
				},
				view: {
					dir: './debug/ddl/{{schema-name}}/VIEW/{{schema-name}}.VIE.{{object-name}}.sql',
				},
				mview: {
					dir: './debug/ddl/{{schema-name}}/MVIEW/{{schema-name}}.VIE.{{object-name}}.sql',
				},
				index: {
					dir: './debug/ddl/{{schema-name}}/INDEX/{{schema-name}}.TBL.{{parent-name}}.IDX.{{object-name}}.sql',
				},
				trigger: {
					dir: './debug/ddl/{{schema-name}}/TRIGGER/{{schema-name}}.TRG.{{object-name}}.sql',
				},
				package: {
					dir: './debug/ddl/{{schema-name}}/PACKAGE/{{schema-name}}.PHD.{{object-name}}.sql',
				},
				package_body: {
					dir: undefined, // './debug/ddl/{{schema}}/PACKAGEBODY/{{schema}}.PBY.{{package_body}}.sql',
				},
				procedure: {
					dir: './debug/ddl/{{schema-name}}/PROCEDURE/{{schema-name}}.PRC.{{object-name}}.sql',
				},
				function: {
					dir: './debug/ddl/{{schema-name}}/FUNCTION/{{schema-name}}.FUN.{{object-name}}.sql',
				},
				type: {
					dir: './debug/ddl/{{schema-name}}/TYPE/{{schema-name}}.TYP.{{object-name}}.sql',
				},
				type_body: {
					dir: './debug/ddl/{{schema-name}}/TYPE/{{schema-name}}.TYB.{{object-name}}.sql',
				},
				sequence: {
					dir: './debug/ddl/{{schema-name}}/SEQUENCE/{{schema-name}}.SEQ.{{object-name}}.sql',
				},
				synonym: {
					dir: './debug/ddl/{{schema-name}}/SYNONYM/{{schema-name}}.SYN.{{object-name}}.sql',
				},
				job: {
					dir: './debug/ddl/{{schema-name}}/JOB/{{schema-name}}.SEQ.{{object-name}}.sql',
				},
				table_fill_full: {
					dir: './debug/ddl/{{schema-name}}/TABLEFILLFULL/{{schema-name}}.TBL.{{object-name}}.FILLFULL.sql',
					list: [
						{
							schema: 'HR',
							table: 'EMPLOYEES'
						}
					],
				},
				table_fill_demo: {
					dir: './debug/ddl/{{schema-name}}/TABLEFILLDEMO/{{schema-name}}.TBL.{{object-name}}.FILLDEMO.sql',
					count: 3,
				},
			},
		},
	})
}
