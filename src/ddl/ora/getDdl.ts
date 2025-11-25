import type { DbOra } from "../../db/ora";
import type { TResult } from "../../tresult";
import type { TObjectOra } from "./getSchemaList";

export async function getDdl(server: DbOra, schema: string, object: TObjectOra): Promise<TResult<string>> {
    const script = `SELECT DBMS_METADATA.GET_DDL('${object.kind === 'JOB' ? 'PROCOBJ' : object.kind}', '${object.name}', '${schema}') AS TEXT FROM DUAL`
    const resExec = await server.exec<{ TEXT: string }[]>(script)
    if (!resExec.ok) {
        return { error: resExec.error, ok: false }
    }
    return {
        result: resExec
            .result.map(m => m.TEXT)
            .join('\n')
            .trim(),
        ok: true,
    }
}
