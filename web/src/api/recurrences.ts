/**
 * Les Récurrences — configurées depuis le web uniquement (règle 18). Une règle : un titre, un
 * Assigné obligatoire (règle 21 : ses Tâches entrent Sur le feu), une fréquence, des Engagements
 * échelonnés. Les Tâches nées d'une règle n'ont plus aucun lien avec elle : on peut la modifier
 * ou la supprimer sans rien casser derrière (règle 20).
 */
import { and, asc, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db/client";
import { membre, recurrence } from "@/db/schema";
import type * as C from "./contrat";
import { introuvable, traduire } from "./erreurs";

type Ctx = { spaceId: string };
export type Recurrence = typeof recurrence.$inferSelect;

export function lister(ctx: Ctx) {
  return db.select().from(recurrence).where(eq(recurrence.spaceId, ctx.spaceId)).orderBy(asc(recurrence.createdAt));
}

async function verifierAssigne(ctx: Ctx, assigneId: string) {
  const [m] = await db.select({ id: membre.id }).from(membre).where(and(eq(membre.id, assigneId), eq(membre.spaceId, ctx.spaceId), eq(membre.actif, true)));
  if (!m) throw introuvable("Membre");
}

const valeurs = (e: z.infer<typeof C.PoserRecurrence>) => ({
  titre: e.titre, assigneId: e.assigneId, frequence: e.frequence,
  jourSemaine: e.frequence === "hebdomadaire" ? e.jourSemaine ?? 1 : null,
  jourMois: e.frequence === "mensuelle" ? e.jourMois ?? 1 : null,
  occurrences: e.decalages.length, decalages: e.decalages,
});

export async function creer(ctx: Ctx, e: z.infer<typeof C.PoserRecurrence>): Promise<Recurrence> {
  await verifierAssigne(ctx, e.assigneId);
  return traduire(async () => (await db.insert(recurrence).values({ spaceId: ctx.spaceId, ...valeurs(e) }).returning())[0]);
}

export async function modifier(ctx: Ctx, id: string, e: z.infer<typeof C.PoserRecurrence>): Promise<Recurrence> {
  await obtenir(ctx, id);
  await verifierAssigne(ctx, e.assigneId);
  return traduire(async () => (await db.update(recurrence).set(valeurs(e)).where(eq(recurrence.id, id)).returning())[0]);
}

export async function obtenir(ctx: Ctx, id: string): Promise<Recurrence> {
  const [r] = await db.select().from(recurrence).where(and(eq(recurrence.id, id), eq(recurrence.spaceId, ctx.spaceId)));
  if (!r) throw introuvable("Règle");
  return r;
}

/** Supprimer une règle ne touche à rien de ce qu'elle a déjà fabriqué : ces Tâches vivent leur vie. */
export async function supprimer(ctx: Ctx, id: string): Promise<void> {
  await obtenir(ctx, id);
  await db.delete(recurrence).where(eq(recurrence.id, id));
}
