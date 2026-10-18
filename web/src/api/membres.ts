/**
 * Les Membres de l'Espace. La route et le MCP lisent la même fonction :
 * un agent qui cherche « Stan » obtient un UUID, rien d'autre.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import type { Ctx } from "./membre-courant";

/** Les Membres actifs — pour choisir un Assigné, des Aidants, ou résoudre un prénom. */
export async function lister(ctx: Ctx) {
  return db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre)
    .where(and(eq(membre.spaceId, ctx.spaceId), eq(membre.actif, true)))
    .orderBy(asc(membre.createdAt));
}
