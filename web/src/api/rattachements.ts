/**
 * Ce à quoi un Membre est rattaché — une **Affectation** (BRU-26) ou un **Projet** (BRU-71) — et
 * qui est sur quoi (BRU-27). Les deux ont exactement la même mécanique, donc exactement le même
 * code : `genre` dit lequel on regarde. `affectations.ts` et `projets.ts` ne font que le fixer.
 *
 * La liste est ouverte ; on désactive — et on ne supprime que ce qui n'a jamais servi :
 * l'historique ne doit pas se trouer. Rien de tout ça ne se pose sur une Tâche.
 */
import { and, asc, desc, eq, gte, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { affectation, affectationMembre, membre } from "@/db/schema";
import { instant } from "@/relances/temps";
import { ErreurApi, introuvable } from "./erreurs";

export type Genre = "affectation" | "projet";
/** Ce que le message d'erreur doit dire quand on ne trouve pas : « Affectation » ou « Projet ». */
const NOM: Record<Genre, string> = { affectation: "Affectation", projet: "Projet" };

export type Affectation = { id: string; nom: string; couleur: string; actif: boolean };
type Ctx = { spaceId: string };

export async function lister(ctx: Ctx, genre: Genre): Promise<Affectation[]> {
  return db.select({ id: affectation.id, nom: affectation.nom, couleur: affectation.couleur, actif: affectation.actif })
    .from(affectation).where(and(eq(affectation.spaceId, ctx.spaceId), eq(affectation.genre, genre)))
    .orderBy(asc(affectation.createdAt));
}

export async function ajouter(ctx: Ctx, genre: Genre, nom: string, couleur: string): Promise<Affectation[]> {
  const existante = await db.select({ id: affectation.id }).from(affectation)
    .where(and(eq(affectation.spaceId, ctx.spaceId), eq(affectation.genre, genre), eq(affectation.nom, nom)));
  if (existante.length) throw new ErreurApi("requete_invalide", 422, `« ${nom} » existe déjà.`);
  await db.insert(affectation).values({ spaceId: ctx.spaceId, genre, nom, couleur });
  return lister(ctx, genre);
}

/** Désactiver ou réactiver. Jamais supprimer : les périodes passées continuent de la nommer. */
export async function activer(ctx: Ctx, genre: Genre, id: string, actif: boolean): Promise<Affectation[]> {
  const [a] = await db.select({ id: affectation.id }).from(affectation)
    .where(and(eq(affectation.id, id), eq(affectation.spaceId, ctx.spaceId), eq(affectation.genre, genre)));
  if (!a) throw introuvable(NOM[genre]);
  await db.update(affectation).set({ actif }).where(eq(affectation.id, id));
  return lister(ctx, genre);
}

/**
 * Supprimer — seulement une Affectation qui n'a jamais servi (une faute de frappe, un doublon).
 * Dès qu'une période la nomme, l'historique en dépend : on désactive, on ne troue pas.
 */
export async function supprimer(ctx: Ctx, genre: Genre, id: string): Promise<Affectation[]> {
  const [a] = await db.select({ nom: affectation.nom }).from(affectation)
    .where(and(eq(affectation.id, id), eq(affectation.spaceId, ctx.spaceId), eq(affectation.genre, genre)));
  if (!a) throw introuvable(NOM[genre]);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(affectationMembre).where(eq(affectationMembre.affectationId, id));
  if (n > 0) throw new ErreurApi("requete_invalide", 422, `« ${a.nom} » a servi : l'historique le nomme. Désactivez-le plutôt.`);
  await db.delete(affectation).where(eq(affectation.id, id));
  return lister(ctx, genre);
}

/* ------------------------------------------------------------------ qui est sur quoi */

/**
 * Une ligne de « qui est sur quoi ». Dans l'interface on dit simplement « Affectation : MONKA » ;
 * `depuis` répond à « depuis quand », et l'`id` sert à dire « je ne suis plus dessus ».
 */
export type Sur = { id: string; affectationId: string; nom: string; couleur: string; depuis: string; jusqu: string | null };
export type AffectationsMembre = { membreId: string; nom: string; avatar: string | null; affectations: Sur[] };

const colonnes = {
  id: affectationMembre.id, affectationId: affectationMembre.affectationId, nom: affectation.nom, couleur: affectation.couleur,
  depuis: affectationMembre.debut, jusqu: affectationMembre.fin,
};

async function parMembre(ctx: Ctx, genre: Genre, quand: SQL | undefined): Promise<AffectationsMembre[]> {
  const membres = await db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre)
    .where(and(eq(membre.spaceId, ctx.spaceId), eq(membre.actif, true))).orderBy(asc(membre.createdAt));
  const lignes = await db.select({ ...colonnes, membreId: affectationMembre.membreId }).from(affectationMembre)
    .innerJoin(affectation, eq(affectation.id, affectationMembre.affectationId))
    .where(and(eq(affectationMembre.spaceId, ctx.spaceId), eq(affectation.genre, genre), quand))
    .orderBy(asc(affectationMembre.debut));
  return membres.map((m) => ({
    membreId: m.id, nom: m.nom, avatar: m.avatar,
    affectations: lignes.filter((l) => l.membreId === m.id).map(({ id, affectationId, nom, couleur, depuis, jusqu }) => ({ id, affectationId, nom, couleur, depuis, jusqu })),
  }));
}

/** Qui est sur quoi, maintenant. */
export const enCours = (ctx: Ctx, genre: Genre) => parMembre(ctx, genre, isNull(affectationMembre.fin));

/**
 * Qui a été sur quoi entre deux jours — une semaine, pour Fait. Une Affectation quittée puis
 * reprise dans la même période ne se lit qu'une fois : ce qui compte ici, c'est sur quoi la
 * personne était, pas en combien de fois. La période retenue va du premier début à la dernière
 * fin — encore en cours si l'un des passages l'est.
 */
export async function surLaPeriode(ctx: Ctx, genre: Genre, du: string, au: string): Promise<AffectationsMembre[]> {
  const par = await parMembre(ctx, genre, and(lte(affectationMembre.debut, au), or(isNull(affectationMembre.fin), gte(affectationMembre.fin, du))));
  return par.map((m) => ({ ...m, affectations: fondre(m.affectations) }));
}

/** Plusieurs passages sur la même Affectation n'en font qu'un. */
export function fondre(sur: Sur[]): Sur[] {
  const par = new Map<string, Sur>();
  for (const a of sur) {
    const deja = par.get(a.affectationId);
    if (!deja) { par.set(a.affectationId, a); continue; }
    par.set(a.affectationId, {
      ...deja,
      depuis: a.depuis < deja.depuis ? a.depuis : deja.depuis,
      jusqu: deja.jusqu === null || a.jusqu === null ? null : (a.jusqu > deja.jusqu ? a.jusqu : deja.jusqu),
    });
  }
  return [...par.values()];
}

/** Qui était sur quoi un jour donné — la veille, pour le Daily. */
export const auJour = (ctx: Ctx, genre: Genre, jour: string) => surLaPeriode(ctx, genre, jour, jour);

/** Tout, fini compris, du plus récent au plus ancien. C'est lui qui répond à « hier j'étais sur MONKA ». */
export async function historique(ctx: Ctx, genre: Genre, membreId: string): Promise<Sur[]> {
  return db.select(colonnes).from(affectationMembre)
    .innerJoin(affectation, eq(affectation.id, affectationMembre.affectationId))
    .where(and(eq(affectationMembre.spaceId, ctx.spaceId), eq(affectation.genre, genre), eq(affectationMembre.membreId, membreId)))
    .orderBy(desc(affectationMembre.debut));
}

/**
 * « Aujourd'hui je suis sur MONKA. » Continue, sans jours cochés ni pourcentages ; plusieurs à la
 * fois, c'est normal. Si on y est déjà, on ne double pas : on renvoie ce qui est là.
 */
export async function poser(ctx: Ctx, genre: Genre, membreId: string, affectationId: string, debut: string = instant().jour): Promise<AffectationsMembre[]> {
  const [a] = await db.select({ actif: affectation.actif }).from(affectation)
    .where(and(eq(affectation.id, affectationId), eq(affectation.spaceId, ctx.spaceId), eq(affectation.genre, genre)));
  if (!a) throw introuvable(NOM[genre]);
  if (!a.actif) throw new ErreurApi("affectation_desactivee", 422, `${genre === "projet" ? "Ce Projet est désactivé" : "Cette Affectation est désactivée"} : réactivez-le d'abord dans les Réglages.`);
  const [m] = await db.select({ id: membre.id }).from(membre).where(and(eq(membre.id, membreId), eq(membre.spaceId, ctx.spaceId), eq(membre.actif, true)));
  if (!m) throw introuvable("Membre");
  const deja = await db.select({ id: affectationMembre.id }).from(affectationMembre)
    .where(and(eq(affectationMembre.membreId, membreId), eq(affectationMembre.affectationId, affectationId), isNull(affectationMembre.fin)));
  if (!deja.length) await db.insert(affectationMembre).values({ spaceId: ctx.spaceId, membreId, affectationId, debut });
  return enCours(ctx, genre);
}

/** « Je ne suis plus dessus. » L'unique action : la fin se pose au jour même, l'histoire reste. */
export async function fermer(ctx: Ctx, genre: Genre, id: string, jour: string = instant().jour): Promise<AffectationsMembre[]> {
  const [l] = await db.select({ id: affectationMembre.id, fin: affectationMembre.fin, debut: affectationMembre.debut }).from(affectationMembre)
    .where(and(eq(affectationMembre.id, id), eq(affectationMembre.spaceId, ctx.spaceId)));
  if (!l) throw introuvable(NOM[genre]);
  if (l.fin === null) await db.update(affectationMembre).set({ fin: jour < l.debut ? l.debut : jour }).where(eq(affectationMembre.id, id));
  return enCours(ctx, genre);
}
