import { Type, type Static } from 'vv-config-jsonc'

export const SConnectionPg = Type.Object(
	{
		host: Type.String({ default: 'localhost' }),
		port: Type.Integer({ default: 5432 }),
		database: Type.String({ default: 'postgresdb' }),
		login: Type.String({ default: 'USER' }),
		password: Type.String({ default: '123456' }),
	},
	{ description: 'connection to PostgreSQL' },
)
export type TConnectionPg = Static<typeof SConnectionPg>
