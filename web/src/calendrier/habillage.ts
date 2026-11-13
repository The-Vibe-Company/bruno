/**
 * Qui a quelle couleur sur le Calendrier, et d'où vient chaque réunion. Le Daily montre la même
 * journée : il doit la peindre pareil, sans quoi Antoine n'est plus en bleu d'un écran à l'autre.
 */
import { and, asc, eq } from "drizzle-orm";
import type { Agenda } from "@/api/contrat";
import type { Ctx } from "@/api/membre-courant";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { allegerAvatars } from "@/lib/avatar-url";
import { PALETTE } from "@/reglages/palette";
import type { Source } from "./Fiche";

export type Personne = { id: string; nom: string; avatar: string | null };

/** Les humains actifs de l'Espace, soi en premier : c'est son agenda qu'on branche, et celui qu'on cherche des yeux. */
export async function personnesDuCalendrier(ctx: Ctx): Promise<Personne[]> {
  const membres = await db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre)
    .where(and(eq(membre.spaceId, ctx.spaceId), eq(membre.actif, true), eq(membre.type, "humain")))
    .orderBy(asc(membre.createdAt)).then((l) => allegerAvatars(l, (m) => m.id));
  return [...membres.filter((m) => m.id === ctx.membreId), ...membres.filter((m) => m.id !== ctx.membreId)];
}

/**
 * Une couleur par personne d'ordinaire : sur une grille commune, c'est qui qu'on cherche. Un
 * Agenda peut en recevoir une à lui — le perso d'un côté, le client de l'autre.
 */
export function habiller(personnes: Personne[], agendas: Agenda[]) {
  const couleurPersonne: Record<string, string> = Object.fromEntries(personnes.map((m, i) => [m.id, PALETTE[i % PALETTE.length]]));
  const couleurs: Record<string, string> = Object.fromEntries(agendas.map((a) => [a.id, a.couleur ?? couleurPersonne[a.membreId] ?? PALETTE[7]]));
  const noms: Record<string, string> = Object.fromEntries(personnes.map((m) => [m.id, m.nom]));
  const avatars = Object.fromEntries(personnes.map((m) => [m.id, m.avatar]));
  const sources: Record<string, Source> = Object.fromEntries(agendas.map((a) => [a.id, { qui: noms[a.membreId] ?? "?", avatar: avatars[a.membreId] ?? null, agenda: a.nom, origine: a.origine }]));
  return { couleurPersonne, couleurs, noms, sources };
}
