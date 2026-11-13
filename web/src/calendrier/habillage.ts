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
import { couleursDuCalendrier } from "./couleurs";
import type { Source } from "./Fiche";

export type Personne = { id: string; nom: string; avatar: string | null };

/**
 * Les humains actifs de l'Espace, dans l'ordre d'arrivée — celui des couleurs. `personnes` met soi
 * en premier : c'est son agenda qu'on branche, et celui qu'on cherche des yeux.
 */
export async function personnesDuCalendrier(ctx: Ctx): Promise<{ personnes: Personne[]; parArrivee: Personne[] }> {
  const parArrivee = await db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre)
    .where(and(eq(membre.spaceId, ctx.spaceId), eq(membre.actif, true), eq(membre.type, "humain")))
    .orderBy(asc(membre.createdAt)).then((l) => allegerAvatars(l, (m) => m.id));
  const personnes = [...parArrivee.filter((m) => m.id === ctx.membreId), ...parArrivee.filter((m) => m.id !== ctx.membreId)];
  return { personnes, parArrivee };
}

/**
 * Mes Agendas, une couleur chacun ; ceux des autres, une par personne (voir `couleurs.ts`). Dans
 * l'ordre d'arrivée de chacun, pas celui de l'écran : sinon la couleur d'un collègue changerait
 * selon qui regarde.
 */
export function habiller({ personnes, parArrivee }: { personnes: Personne[]; parArrivee: Personne[] }, agendas: Agenda[], moiId: string) {
  const { agendas: couleurs, defauts } = couleursDuCalendrier(parArrivee, agendas, moiId);
  const noms: Record<string, string> = Object.fromEntries(personnes.map((m) => [m.id, m.nom]));
  const avatars = Object.fromEntries(personnes.map((m) => [m.id, m.avatar]));
  const sources: Record<string, Source> = Object.fromEntries(agendas.map((a) => [a.id, { qui: noms[a.membreId] ?? "?", avatar: avatars[a.membreId] ?? null, agenda: a.nom, origine: a.origine }]));
  return { couleurs, defauts, noms, sources };
}
