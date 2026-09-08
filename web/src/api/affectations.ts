/**
 * Les Affectations — ce à quoi on peut travailler (BRU-26) — et qui est sur quoi (BRU-27).
 * La liste est ouverte ; on désactive, on ne supprime jamais : l'historique ne doit pas se
 * trouer. Une Affectation ne se pose jamais sur une Tâche.
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { affectation, affectationMembre, membre } from "@/db/schema";
import { ErreurApi, introuvable } from "./erreurs";

export type Affectation = { id: string; nom: string; couleur: string; actif: boolean };
type Ctx = { spaceId: string };

export async function lister(ctx: Ctx): Promise<Affectation[]> {
  const l = await db.select({ id: affectation.id, nom: affectation.nom, couleur: affectation.couleur, actif: affectation.actif })
    .from(affectation).where(eq(affectation.spaceId, ctx.spaceId)).orderBy(asc(affectation.createdAt));
  return l;
}

export async function ajouter(ctx: Ctx, nom: string, couleur: string): Promise<Affectation[]> {
  const existante = await db.select({ id: affectation.id }).from(affectation)
    .where(and(eq(affectation.spaceId, ctx.spaceId), eq(affectation.nom, nom)));
  if (existante.length) throw new ErreurApi("requete_invalide", 422, `« ${nom} » existe déjà.`);
  await db.insert(affectation).values({ spaceId: ctx.spaceId, nom, couleur });
  return lister(ctx);
}

/** Désactiver ou réactiver. Jamais supprimer : les périodes passées continuent de la nommer. */
export async function activer(ctx: Ctx, id: string, actif: boolean): Promise<Affectation[]> {
  const [a] = await db.select({ id: affectation.id }).from(affectation).where(and(eq(affectation.id, id), eq(affectation.spaceId, ctx.spaceId)));
  if (!a) throw introuvable("Affectation");
  await db.update(affectation).set({ actif }).where(eq(affectation.id, id));
  return lister(ctx);
}

/* ------------------------------------------------------------------ qui est sur quoi */


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
