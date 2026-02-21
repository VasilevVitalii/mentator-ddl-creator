import { EDdlKind, type TConfig } from './config'
import { GoOra } from './ddl/ora'
import { GoMssql } from './ddl/mssql'
import { GetLogger, Logger } from './logger'

export async function Go(config: TConfig): Promise<void> {
	let getLogger: { error?: string; logger?: Logger } = { error: undefined, logger: undefined }
	try {
		getLogger = GetLogger('mentator-ddl-creator', config.log.dir, config.log.mode)
		if (getLogger.error) {
			console.error(`${getLogger.error}`)
			return
		}
		const logger = getLogger.logger!
		logger.debug('APP START')

		switch (config.db.kind) {
			case EDdlKind.MSSQL:
				await GoMssql(logger, config.db, config.stamp)
				return
			case EDdlKind.ORA:
				await GoOra(logger, config.db, config.stamp)
				return
			case EDdlKind.PG:
				throw new Error('PG not implemented')
		}
	} catch (error) {
		if (getLogger.logger) {
			getLogger.logger.error(`${error}`)
		} else {
			console.error(`${error}`)
		}
	} finally {
		if (getLogger.logger) {
			getLogger.logger.debug('APP STOP')
			getLogger.logger.close(() => {
				process.exit()
			})
		}
	}
}
