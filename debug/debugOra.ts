#!/usr/bin/env bun

import fs from 'fs';
import { EDdlKind, EFilterTableFill, EFormatTableFill, EUseMode } from '../src/config'
import { Go } from '../src/go'
import { ELoggerMode } from '../src/logger'

const LOG_DIR = `./debug/log`
const DDL_DIR = `./debug/ora-ddl`
const FILL_DEMO_DIR = `./debug/ora-fill-demo`
const FILL_FULL_DIR = `./debug/ora-fill-full`

export function DebugOra() {
	try {
		fs.rmSync(DDL_DIR, { recursive: true, force: true });
	} catch {}
	try {
		fs.rmSync(FILL_DEMO_DIR, { recursive: true, force: true });
	} catch {}
	try {
		fs.rmSync(FILL_FULL_DIR, { recursive: true, force: true });
	} catch {}

	Go({
		log: {
			dir: LOG_DIR,
			mode: ELoggerMode.REWRITE,
		},
		db: {
			kind: EDdlKind.ORA,
			connection: {
				host: `localhost`,
				port: 51521,
				service: `XEPDB1`,
				login: `sys`,
				password: `mysecurepassword`,
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
					dir: `${DDL_DIR}/{{schema-name}}/TABLE/{{schema-name}}.TBL.{{object-name}}.sql`,
				},
				view: {
					dir: `${DDL_DIR}/{{schema-name}}/VIEW/{{schema-name}}.VIE.{{object-name}}.sql`,
				},
				mview: {
					dir: `${DDL_DIR}/{{schema-name}}/MVIEW/{{schema-name}}.VIE.{{object-name}}.sql`,
				},
				index: {
					dir: `${DDL_DIR}/{{schema-name}}/INDEX/{{schema-name}}.TBL.{{parent-name}}.IDX.{{object-name}}.sql`,
				},
				trigger: {
					dir: `${DDL_DIR}/{{schema-name}}/TRIGGER/{{schema-name}}.TRG.{{object-name}}.sql`,
				},
				package: {
					dir: `${DDL_DIR}/{{schema-name}}/PACKAGE/{{schema-name}}.PHD.{{object-name}}.sql`,
				},
				package_body: {
					dir: undefined,
				},
				procedure: {
					dir: `${DDL_DIR}/{{schema-name}}/PROCEDURE/{{schema-name}}.PRC.{{object-name}}.sql`,
				},
				function: {
					dir: `${DDL_DIR}/{{schema-name}}/FUNCTION/{{schema-name}}.FUN.{{object-name}}.sql`,
				},
				type: {
					dir: `${DDL_DIR}/{{schema-name}}/TYPE/{{schema-name}}.TYP.{{object-name}}.sql`,
				},
				type_body: {
					dir: `${DDL_DIR}/{{schema-name}}/TYPE/{{schema-name}}.TYB.{{object-name}}.sql`,
				},
				sequence: {
					dir: `${DDL_DIR}/{{schema-name}}/SEQUENCE/{{schema-name}}.SEQ.{{object-name}}.sql`,
				},
				synonym: {
					dir: `${DDL_DIR}/{{schema-name}}/SYNONYM/{{schema-name}}.SYN.{{object-name}}.sql`,
				},
				job: {
					dir: `${DDL_DIR}/{{schema-name}}/JOB/{{schema-name}}.JOB.{{object-name}}.sql`,
				},
				table_fill_full: {
					dir: `${FILL_FULL_DIR}/{{schema-name}}/TABLEFILLFULL/{{schema-name}}.TBL.{{object-name}}.FILLFULL.sql`,
					format: EFormatTableFill.JSON,
					list: [
						{
							schema: `HR`,
							table: `EMPLOYEES`
						}
					],
				},
				table_fill_demo: {
					dir: `${FILL_DEMO_DIR}/{{schema-name}}/TABLEFILLDEMO/{{schema-name}}.TBL.{{object-name}}.FILLDEMO.sql`,
					format: EFormatTableFill.JSON,
					count: 3,
					filter: {
						mode: EFilterTableFill.WHITELIST,
						list: [
							{
								schema: `HR`,
								table: `*`
							},
						]
					},
					mock: [
						{
							schema: `HR`,
							table: `EMPLOYEES`,
							field: `FIRST_NAME`
						},
						{
							schema: `HR`,
							table: `EMPLOYEES`,
							field: `LAST_NAME`
						},
					]
				},
			},
		},
	})
}
