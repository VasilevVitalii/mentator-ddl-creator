export type TStampParam = {
	object_name: string
	spec: string
}

export type TStampColumn = {
	object_name: string
	spec: string
	description: string
}

export type TStampForeignKey = {
	column_list: { column_my: string; column_ref: string }[]
	ref: { schema_name: string; object_name: string }
}

export type TStampUses = {
	schema_name: string
	object_name: string
	database_name: string
	kind: string
}

export type TStampData = {
	[key: string]: string | TStampColumn[] | TStampParam[] | TStampForeignKey[] | TStampUses[]
}

export function makeStamp(data: TStampData): string {
	const json = JSON.stringify(data, null, 4)
	return `/*MENTATOR-DDL-CREATOR.SCHEMA.START\n${json}\nMENTATOR-DDL-CREATOR.SCHEMA.STOP*/`
}
