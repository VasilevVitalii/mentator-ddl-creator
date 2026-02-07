#!/usr/bin/env bun

import fs from 'fs';
import { EDdlKind, EFilterTableFill, EFormatTableFill, EUseMode } from '../src/config'
import { Go } from '../src/go'
import { ELoggerMode } from '../src/logger'

const DDL_DIR = `./debug/mssql-ddl`
const FILL_DEMO_DIR = `./debug/mssql-fill-demo`
const FILL_FULL_DIR = `./debug/mssql-fill-full`

export function DebugMssql() {
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
			dir: `./debug/log`,
			mode: ELoggerMode.REWRITE,
		},
		db: {
			kind: EDdlKind.MSSQL,
			connection: {
				host: `localhost`,
				port: 51433,
				database: `AdventureWorks`,
				login: `sa`,
				password: `Qwerty123$`,
				passwordCrypted: false,
			},
			objects: {
				database: {
					dir: `${DDL_DIR}/{{base-name}}/{{base-name}}.DTB.sql`,
				},
				schema: {
					dir: `${DDL_DIR}/{{base-name}}/{{schema-name}}/{{schema-name}}.SCH.sql`,
					list: [],
					mode: EUseMode.EXCEPT,
				},
				storage: {
					allowFilegroup: true,
				},
				table: {
					dir: `${DDL_DIR}/{{base-name}}/{{schema-name}}/TABLE/{{schema-name}}.TBL.{{object-name}}.sql`,
				},
				view: {
					dir: `${DDL_DIR}/{{base-name}}/{{schema-name}}/VIEW/{{schema-name}}.VIE.{{object-name}}.sql`,
				},
				index: {
					dir: `${DDL_DIR}/{{base-name}}/{{schema-name}}/INDEX/{{schema-name}}.TBL.{{parent-name}}.IDX.{{object-name}}.sql`,
				},
				trigger: {
					dir: `${DDL_DIR}/{{base-name}}/{{schema-name}}/TRIGGER/{{schema-name}}.TRG.{{object-name}}.sql`,
				},
				procedure: {
					dir: `${DDL_DIR}/{{base-name}}/{{schema-name}}/PROCEDURE/{{schema-name}}.PRC.{{object-name}}.sql`,
				},
				function: {
					dir: `${DDL_DIR}/{{base-name}}/{{schema-name}}/FUNCTION/{{schema-name}}.FUN.{{object-name}}.sql`,
				},
				sequence: {
					dir: `${DDL_DIR}/{{base-name}}/{{schema-name}}/SEQUENCE/{{schema-name}}.SEQ.{{object-name}}.sql`,
				},
				synonym: {
					dir: `${DDL_DIR}/{{base-name}}/{{schema-name}}/SYNONYM/{{schema-name}}.SYN.{{object-name}}.sql`,
				},
				job: {
					dir: `${DDL_DIR}/{{base-name}}/{{schema-name}}/JOB/{{schema-name}}.JOB.{{object-name}}.sql`,
				},
				table_fill_full: {
					dir: `${FILL_FULL_DIR}/{{base-name}}/{{schema-name}}/TABLEFILLFULL/{{schema-name}}.TBL.{{object-name}}.FILLFULL.sql`,
					format: EFormatTableFill.JSON,
					list: [
						{
							schema: `Person`,
							table: `addr*`
						}
					],
				},
				table_fill_demo: {
					dir: `${FILL_DEMO_DIR}/{{base-name}}/{{schema-name}}/TABLEFILLDEMO/{{schema-name}}.TBL.{{object-name}}.FILLDEMO.sql`,
					format: EFormatTableFill.JSON,
					count: 3,
					filter: {
						mode: EFilterTableFill.WHITELIST,
						list: [
							{
								schema: `humanresources`,
								table: `Emp*`
							},
							{
								schema: `person`,
								table: `*`
							},
							{
								schema: `Production`,
								table: `Document`
							},
						]
					},
					mock: [
						{
							schema: 'person',
							table: 'person',
							field: 'FirstName'
						},
						{
							schema: 'person',
							table: 'person',
							field: 'MiddleName'
						},
						{
							schema: 'person',
							table: 'person',
							field: 'LastName'
						},
					]
				},
			},
		},
	})
}
