/**
 * Compteurs lus par GET /api/stats. Tout vient de `membre`.
 *
 * « Nouveau » : `created_at` dans les dernières 24 h, ou les 7 derniers jours — fenêtres
 * glissantes, pas des jours calendaires.
 * « Actif » : un Membre distinct qui a, dans la fenêtre, un pouls (`presence.vu_le`) ou
 * une note de journal. `membre` ne garde pas de dernière connexion (la session est un
 * jeton sans état). Le type autorise `null` : ce serait la réponse si aucun de ces
 * signaux n'existait. Ici ils existent, donc ce sont des nombres — zéro s'il n'y a personne.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, membre, presence } from "@/db/schema";

export type Statistiques = {
  total_users: number;
  new_users_1d: number;
  new_users_7d: number;
  active_users_1d: number | null;
  active_users_7d: number | null;
};

type Ligne = {
  total_users: number;
  new_users_1d: number;
  new_users_7d: number;
  active_users_1d: number | null;
  active_users_7d: number | null;
};

function entier(v: unknown, champ: string): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`Compteur illisible : ${champ}.`);
  return n;
}

export async function statistiques(): Promise<Statistiques> {
  // Présence et journal sont les signaux disponibles. Une colonne de dernière
  // connexion sur `membre` n'existe pas, donc elle n'entre pas dans l'union.
  const lignes = await db.execute<Ligne>(sql`
    with activite as (
      select ${presence.membreId} as id, ${presence.vuLe} as quand from ${presence}
      union all
      select ${journal.auteurId}, ${journal.createdAt} from ${journal}
      where ${journal.auteurId} is not null
    )
    select
      (select count(*)::int from ${membre}) as total_users,
      (select count(*)::int from ${membre} where ${membre.createdAt} > now() - interval '1 day') as new_users_1d,
      (select count(*)::int from ${membre} where ${membre.createdAt} > now() - interval '7 days') as new_users_7d,
      (select count(distinct id)::int from activite where quand > now() - interval '1 day') as active_users_1d,
      (select count(distinct id)::int from activite where quand > now() - interval '7 days') as active_users_7d
  `);
  const ligne = lignes[0];
  if (!ligne) throw new Error("Les compteurs n'ont rien renvoyé.");
  return {
    total_users: entier(ligne.total_users, "total_users"),
    new_users_1d: entier(ligne.new_users_1d, "new_users_1d"),
    new_users_7d: entier(ligne.new_users_7d, "new_users_7d"),
    active_users_1d: ligne.active_users_1d === null ? null : entier(ligne.active_users_1d, "active_users_1d"),
    active_users_7d: ligne.active_users_7d === null ? null : entier(ligne.active_users_7d, "active_users_7d"),
  };
}
