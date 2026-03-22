export type TStampParam = {
	object_name: string
	spec: string
}

export type TStampColumn = {
	object_name: string
	spec: string
	description: string
}

export type TStampData = {
	[key: string]: string | TStampColumn[] | TStampParam[]
}

export function makeStamp(data: TStampData): string {
	const json = JSON.stringify(data, null, 4)
	return `/*MENTATOR-DDL-CREATOR.SCHEMA.START\n${json}\nMENTATOR-DDL-CREATOR.SCHEMA.STOP*/`
}
