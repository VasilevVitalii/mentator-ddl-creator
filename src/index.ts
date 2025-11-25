import minimist from 'minimist'
import { ConfigGerenate, ConfigRead, EDdlKind } from './config'
import { resolve } from 'path'
import { Go } from './go'
import { secret } from './util/crypt'
import { VERSION } from '../package-version.js'

// Support both Bun and Node.js
const argv = typeof Bun !== 'undefined' ? Bun.argv : process.argv
const args = minimist(argv.slice(2))

if (args['conf-use']) {
	const confUseParam = args['conf-use']
	if (typeof confUseParam !== 'string' || confUseParam.trim().length === 0) {
		console.error('ERROR: Please provide a path to the config file. Example: --conf-use /path/to/config.jsonc')
	} else {
		const res = ConfigRead(resolve(confUseParam))
		if (res.error) {
			console.error(res.error)
		} else {
			Go(res.conf!)
		}
	}
} else if (args['conf-gen-ora']) {
	const confGenParam = args['conf-gen-ora']
	if (typeof confGenParam !== 'string' || confGenParam.trim().length === 0) {
		console.error('ERROR: Please provide a directory path to generate the config template. Example: --conf-gen /path/to/dir')
	} else {
		const res = ConfigGerenate(resolve(confGenParam), EDdlKind.ORA)
		if (res.error) {
			console.error(res.error)
		} else {
			console.log(res.success)
		}
	}
} else if (args['conf-gen-mssql']) {
	const confGenParam = args['conf-gen-mssql']
	if (typeof confGenParam !== 'string' || confGenParam.trim().length === 0) {
		console.error('ERROR: Please provide a directory path to generate the config template. Example: --conf-gen /path/to/dir')
	} else {
		const res = ConfigGerenate(resolve(confGenParam), EDdlKind.MSSQL)
		if (res.error) {
			console.error(res.error)
		} else {
			console.log(res.success)
		}
	}
} else if (args['crypt']) {
	const passParam = args['crypt']
	if (typeof passParam !== 'string' || passParam.length === 0) {
		console.error('ERROR: Please provide a password to encrypt. Example: --crypt mypassword')
	} else {
		const crypted = secret.crypt(passParam)
		console.log(`YOUR CRYPTED PASSWORD: ${crypted}`)
	}
} else {
	onHelp()
}

async function onHelp() {
	console.log(
		[
			`mentator-ddl-creator, version ${VERSION}`,
			`A utility for generating DDL and data scripts for Oracle.`,
			``,
			`Usage modes:`,
			``,
			`1. Generate a configuration (for ORACLE) template file:`,
			`   --conf-gen-ora /path/to/directory`,
			`   Creates a sample config file (JSONC format) for further editing.`,
			``,
			`2. Generate a configuration (for Microsoft SQL Server) template file:`,
			`   --conf-gen-mssql /path/to/directory`,
			`   Creates a sample config file (JSONC format) for further editing.`,
			``,
			`3. Use this config got generate DDL:`,
			`   --conf-use /path/to/your/config.jsonc`,
			`   Reads the config file and generates scripts as described in the config.`,
			``,
			`4. Encrypt a database password for use in config files:`,
			`   --crypt <your_database_password>`,
			`   Outputs the encrypted password to use in your config.`,
			``,
			`For more details, see https://github.com/VasilevVitalii/mentator-ddl-creator`,
		].join('\n'),
	)
}
