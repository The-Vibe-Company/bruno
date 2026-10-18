/**
 * Les appels d'outils, dans le journal du processus. Même forme que les Relances :
 * un préfixe, qui, quoi, quand. Pas les arguments — des Notes n'ont rien à faire dans un log.
 */
import type { Ctx } from "@/api/membre-courant";

export function journaliserAppel(ctx: Ctx, outil: string) {
  console.info(`[mcp] ${ctx.membreId} · ${outil} · ${new Date().toISOString()}`);
}
