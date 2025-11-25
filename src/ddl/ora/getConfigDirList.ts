import type { TConfigOra } from '../../config'
import type { TResult } from '../../tresult'

type ObjectsType = TConfigOra['objects']

export function getConfigDirList(objects: ObjectsType): TResult<Record<string, string | undefined>> {
	const result: Record<string, string | undefined> = {}
	const arr = [] as string[]

	for (const key of Object.keys(objects)) {
		const obj = objects[key as keyof ObjectsType] as any
		if (obj && typeof obj === 'object' && 'dir' in obj) {
			result[key.toUpperCase()] = obj.dir
			if (obj.dir) arr.push(obj.dir)
		}
	}

	const duplicates = Array.from(new Set(arr.filter((item, index, self) => self.indexOf(item) !== index)))
	if (duplicates.length > 0) {
		return { error: `in config non uniq dir: "${duplicates.join('","')}"`, ok: false }
	}
	return { result, ok: true }
}
