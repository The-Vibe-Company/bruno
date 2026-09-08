/** Qui est sur quoi, maintenant. Lecture seule ici — poser et fermer viennent avec BRU-28/40. */
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { affectation, affectationMembre, membre } from "@/db/schema";

export type AffectationsMembre = { membreId: string; nom: string; affectations: { nom: string; couleur: string; depuis: string }[] };

export async function enCours(ctx: { spaceId: string }): Promise<AffectationsMembre[]> {
  const membres = await db.select({ id: membre.id, nom: membre.nom }).from(membre)
    .where(and(eq(membre.spaceId, ctx.spaceId), eq(membre.actif, true))).orderBy(asc(membre.createdAt));
  const lignes = await db
    .select({ membreId: affectationMembre.membreId, nom: affectation.nom, couleur: affectation.couleur, depuis: affectationMembre.debut })
    .from(affectationMembre)
    .innerJoin(affectation, eq(affectation.id, affectationMembre.affectationId))
    .where(and(eq(affectationMembre.spaceId, ctx.spaceId), isNull(affectationMembre.fin)))
    .orderBy(asc(affectationMembre.debut));
  return membres.map((m) => ({
    membreId: m.id, nom: m.nom,
    affectations: lignes.filter((l) => l.membreId === m.id).map(({ nom, couleur, depuis }) => ({ nom, couleur, depuis })),
  }));
}
