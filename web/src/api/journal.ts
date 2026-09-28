/**
 * Le journal d'une Affectation : l'état des lieux d'un client, dans le temps.
 *
 * Bruno savait qui est sur quoi, et depuis quand ; il ne savait pas ce qui s'y passe. Une Tâche
 * ne porte jamais d'Affectation (c'est un invariant), donc rien ne racontait « où on en est avec
 * eux ». Le journal le dit, en clair et daté — et il ne s'écrase pas : on ajoute, on n'édite pas.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { affectation, affectationMembre, journal, membre } from "@/db/schema";
import { ErreurApi, introuvable } from "./erreurs";
import { urlAvatar } from "@/lib/avatar-url";

type Ctx = { spaceId: string; membreId: string };
/** `deMoi` : seul l'auteur peut effacer son entrée — l'écran n'a pas à deviner qui c'est. */
export type Entree = { id: string; texte: string; quand: string; auteur: { nom: string; avatar: string | null } | null; deMoi: boolean };
/** Une période de quelqu'un sur cette Affectation — l'historique, vu du client. */
export type Passage = { id: string; membreId: string; nom: string; avatar: string | null; debut: string; fin: string | null };
export type Etat = {
  id: string; nom: string; couleur: string; actif: boolean;
  dessus: Passage[]; passages: Passage[]; entrees: Entree[];
};

/** L'Affectation existe et nous appartient : tout part de là. */
async function lire(ctx: Ctx, id: string) {
  const [a] = await db.select().from(affectation)
    .where(and(eq(affectation.id, id), eq(affectation.spaceId, ctx.spaceId), eq(affectation.genre, "affectation")));
  if (!a) throw introuvable("Client");
  return a;
}

const passages = (ctx: Ctx, id: string) =>
  db.select({
      id: affectationMembre.id, membreId: membre.id, nom: membre.nom, avatar: membre.avatar,
      debut: affectationMembre.debut, fin: affectationMembre.fin,
    })
    .from(affectationMembre)
    .innerJoin(membre, eq(membre.id, affectationMembre.membreId))
    .where(and(eq(affectationMembre.spaceId, ctx.spaceId), eq(affectationMembre.affectationId, id)))
    .orderBy(desc(affectationMembre.debut));

export const entrees = (ctx: Ctx, id: string) =>
  db.select({ id: journal.id, texte: journal.texte, quand: journal.createdAt, auteurId: journal.auteurId, nom: membre.nom, avatar: membre.avatar })
    .from(journal).leftJoin(membre, eq(membre.id, journal.auteurId))
    .where(and(eq(journal.spaceId, ctx.spaceId), eq(journal.affectationId, id)))
    .orderBy(desc(journal.createdAt));

/** L'état des lieux : qui est dessus, qui y est passé, et ce qu'on en a dit. */
export async function etat(ctx: Ctx, id: string): Promise<Etat> {
  const a = await lire(ctx, id);
  const [tous, notes] = await Promise.all([passages(ctx, id), entrees(ctx, id)]);
  const avecPhoto = (p: Awaited<ReturnType<typeof passages>>[number]) => ({ ...p, avatar: urlAvatar(p.membreId, p.avatar) });
  return {
    id: a.id, nom: a.nom, couleur: a.couleur, actif: a.actif,
    dessus: tous.filter((p) => p.fin === null).map(avecPhoto),
    passages: tous.map(avecPhoto),
    entrees: notes.map((e) => ({
      id: e.id, texte: e.texte, quand: e.quand.toISOString(),
      auteur: e.nom ? { nom: e.nom, avatar: urlAvatar(e.auteurId!, e.avatar) } : null,
      deMoi: e.auteurId === ctx.membreId,
    })),
  };
}

/** Écrire au journal. L'auteur, c'est celui qui écrit ; la date, maintenant. */
export async function ecrire(ctx: Ctx, id: string, texte: string): Promise<Etat> {
  await lire(ctx, id);
  await db.insert(journal).values({ spaceId: ctx.spaceId, affectationId: id, auteurId: ctx.membreId, texte });
  return etat(ctx, id);
}

/** Effacer une entrée : la sienne, et seulement la sienne — le journal est un passé commun. */
export async function effacer(ctx: Ctx, entreeId: string): Promise<{ affectationId: string }> {
  const [e] = await db.select().from(journal).where(and(eq(journal.id, entreeId), eq(journal.spaceId, ctx.spaceId)));
  if (!e) throw introuvable("Entrée");
  if (e.auteurId !== ctx.membreId) throw new ErreurApi("requete_invalide", 422, "On n'efface que ce qu'on a écrit soi-même.");
  await db.delete(journal).where(eq(journal.id, entreeId));
  return { affectationId: e.affectationId };
}

/** La liste des Affectations avec de quoi les ranger : qui est dessus, et la dernière nouvelle. */
export async function tableau(ctx: Ctx) {
  const lignes = await db.select({
      id: affectation.id, nom: affectation.nom, couleur: affectation.couleur, actif: affectation.actif,
      dessus: sql<number>`count(distinct ${affectationMembre.id}) filter (where ${affectationMembre.fin} is null)::int`,
      derniere: sql<string | null>`max(${journal.createdAt})::text`,
      notes: sql<number>`count(distinct ${journal.id})::int`,
    })
    .from(affectation)
    .leftJoin(affectationMembre, eq(affectationMembre.affectationId, affectation.id))
    .leftJoin(journal, eq(journal.affectationId, affectation.id))
    .where(and(eq(affectation.spaceId, ctx.spaceId), eq(affectation.genre, "affectation")))
    .groupBy(affectation.id)
    .orderBy(affectation.nom);
  return lignes;
}
