import type { TResult } from '../../tresult'
import type { TLinkOra, TObjectOra, TSchemaOra } from './getSchemaList'

export function getDir(object: TObjectOra, schema: TSchemaOra, dirList: Record<string, string | undefined>): TResult<string> {
	let dir = dirList[object.kind]
	if (!dir) return { error: 'empty dir', ok: false }

	dir = dir.replaceAll(`{{schema-name}}`, schema.name)
	dir = dir.replaceAll(`{{object-name}}`, object.name)

	if (object.kind === 'INDEX') {
		schema.linkList
			.filter(f => f.kind === 'INDEX' && f.name === object.name && f.parentKind === 'TABLE')
			.forEach(item => {
				dir = dir!.replaceAll(`{{parent-name}}`, item.parentName)
			})
	}

	const matchNonUseReplace = Array.from(dir.matchAll(/{{[^}]+}}/g)).map(m => m[0])
	const matchNonUseReplaceUniq = Array.from(new Set(matchNonUseReplace))

	if (matchNonUseReplaceUniq.length > 0) {
		return { error: `bad filename "${dir}", no find for replace(s) "${matchNonUseReplaceUniq.join('","')}"`, ok: false }
	}

	return { result: dir, ok: true }
}
