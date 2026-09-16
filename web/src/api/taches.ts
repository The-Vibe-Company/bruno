/**
 * Les opérations sur les Tâches. Toute la logique métier vit ici ; les routes ne font que
 * valider l'entrée, appeler ces fonctions et sérialiser la sortie.
 */
import { and, asc, desc, eq, getTableColumns, ilike, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { FUSEAU } from "@/relances/temps";
import { z } from "zod";
import { db } from "@/db/client";
import { membre, tache, tacheAidant, report } from "@/db/schema";
import { ErreurApi, introuvable, traduire } from "./erreurs";
import type * as C from "./contrat";

type Ctx = { spaceId: string; membreId: string };


async function avecAidants(lignes: (typeof tache.$inferSelect)[]) {
  if (lignes.length === 0) return [];
  const liens = await db
    .select()
    .from(tacheAidant)
    .where(inArray(tacheAidant.tacheId, lignes.map((l) => l.id)));
  const parTache = new Map<string, string[]>();
  for (const l of liens) {
    const arr = parTache.get(l.tacheId) ?? [];
    arr.push(l.membreId);
    parTache.set(l.tacheId, arr);
  }
  return lignes.map((l) => ({
    ...l,
    aidantIds: parTache.get(l.id) ?? [],
    createdAt: l.createdAt.toISOString(),
  }));
}

async function lire(ctx: Ctx, id: string) {
  const [ligne] = await db
    .select()
    .from(tache)
    .where(and(eq(tache.id, id), eq(tache.spaceId, ctx.spaceId)));
  if (!ligne) throw introuvable();
  return ligne;
}

/** Le rang le plus bas place en tête ; on ajoute donc à la fin par défaut. */
/** `db`, ou la transaction en cours. */
export type Executeur = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Le Rang qui vient après tous les autres du Bucket. */
export async function rangFinal(ctx: { spaceId: string }, bucket: string, ex: Executeur = db) {
  const [r] = await ex
    .select({ max: sql<string | null>`max(${tache.rang})` })
    .from(tache)
    .where(and(eq(tache.spaceId, ctx.spaceId), eq(tache.bucket, bucket as never)));
  return sql`coalesce(${r?.max ?? null}::numeric, 0) + 1`;
}

export async function lister(ctx: Ctx, f: z.infer<typeof C.FiltresTaches>) {
  const conditions = [eq(tache.spaceId, ctx.spaceId)];
  if (f.bucket) conditions.push(eq(tache.bucket, f.bucket));
  if (f.assigneId) conditions.push(eq(tache.assigneId, f.assigneId));
  if (!f.inclureTerminees) conditions.push(isNull(tache.etatTerminal));
  if (f.q) {
    const motif = `%${f.q}%`;
    conditions.push(or(ilike(tache.titre, motif), ilike(tache.notes, motif))!);
  }
  const lignes = await db
    .select()
    .from(tache)
    .where(and(...conditions))
    // Deux Tâches peuvent porter le même Rang (les données de départ en ont) : sans second
    // critère, Postgres les rend dans un ordre libre et les cartes sautent d'un rendu à l'autre.
    .orderBy(sql`${tache.rang} asc`, asc(tache.createdAt), asc(tache.id));
  return avecAidants(lignes);
}

export async function obtenir(ctx: Ctx, id: string) {
  return (await avecAidants([await lire(ctx, id)]))[0];
}

export async function creer(ctx: Ctx, entree: z.infer<typeof C.CreerTache>) {
  return traduire(async () => {
    const [cree] = await db
      .insert(tache)
      .values({
        spaceId: ctx.spaceId,
        titre: entree.titre,
        notes: entree.notes,
        transcriptionBrute: entree.transcriptionBrute,
        bucket: entree.bucket,
        assigneId: entree.assigneId ?? null,
        engagement: entree.engagement ?? null,
        rang: (await rangFinal(ctx, entree.bucket)) as never,
        creeParId: ctx.membreId,
      })
      .returning();
    return (await avecAidants([cree]))[0];
  });
}

/**
 * Les Tâches qu'une Récurrence fabrique (BRU-33) — l'autre chemin de création, et il passe par
 * ici : personne d'autre n'écrit une Tâche (invariant 1). Ordinaires dès la naissance : Sur le
 * feu, À faire, Assigné et Engagement posés — le droit d'entrée est satisfait par construction.
 */
export async function fabriquer(tx: Executeur, regle: { id: string; spaceId: string; assigneId: string }, occurrences: { titre: string; engagement: string }[]) {
  const rang = await rangFinal({ spaceId: regle.spaceId }, "sur_le_feu", tx);
  await tx.insert(tache).values(occurrences.map((o, k) => ({
    spaceId: regle.spaceId, titre: o.titre, bucket: "sur_le_feu" as const, statut: "a_faire" as const,
    assigneId: regle.assigneId, engagement: o.engagement, recurrenceId: regle.id,
    rang: sql`${rang} + ${k}` as never,
  })));
  return occurrences.length;
}

export async function modifier(ctx: Ctx, id: string, patch: z.infer<typeof C.ModifierTache>) {
  const courante = await lire(ctx, id);
  // Invariant 4 : Sur le feu, l'Engagement est une promesse, et une promesse ne se renégocie
  // que par un Report motivé. Ailleurs (À trier, À venir, Idées) on planifie librement.
  if (patch.engagement !== undefined && courante.bucket === "sur_le_feu" && patch.engagement !== courante.engagement) {
    throw new ErreurApi("engagement_par_report", 422,
      "Sur le feu, l'Engagement ne change que par un Report — avec une raison.");
  }
  if (patch.raisonBlocage !== undefined && courante.statut !== "bloque") {
    throw new ErreurApi("requete_invalide", 422, "Une raison de blocage n'a de sens que sur une Tâche Bloquée.");
  }
  return traduire(async () => {
    const { aidantIds, ...champs } = patch;
    if (Object.keys(champs).length > 0) {
      await db
        .update(tache)
        .set({ ...champs, updatedAt: new Date() })
        .where(eq(tache.id, id));
    }
    if (aidantIds) {
      await db.delete(tacheAidant).where(eq(tacheAidant.tacheId, id));
      if (aidantIds.length > 0) {
        await db.insert(tacheAidant).values(
          aidantIds.map((membreId) => ({ spaceId: ctx.spaceId, tacheId: id, membreId })),
        );
      }
    }
    return obtenir(ctx, id);
  });
}

/**
 * Changer de Bucket. C'est ici que passe le droit d'entrée : le contrat exige déjà l'Assigné
 * et l'Engagement pour `sur_le_feu`, et la contrainte Postgres attrape tout le reste.
 * En sortie de Sur le feu on **conserve** Assigné et Engagement (règle 7) — on ne perd rien.
 */
export async function deplacer(ctx: Ctx, id: string, cible: z.infer<typeof C.DeplacerTache>) {
  await lire(ctx, id);
  return traduire(async () => {
    const surLeFeu = cible.bucket === "sur_le_feu";
    await db
      .update(tache)
      .set({
        bucket: cible.bucket,
        // « À faire » par défaut : une Tâche Sur le feu a toujours un Statut, même si
        // l'appelant ne l'a pas précisé.
        statut: surLeFeu ? (cible.statut ?? "a_faire") : null,
        raisonBlocage: surLeFeu && cible.statut === "bloque" ? cible.raison! : null,
        ...(surLeFeu ? { assigneId: cible.assigneId, engagement: cible.engagement } : {}),
        ...(cible.bucket === "a_venir" && cible.engagement !== undefined
          ? { engagement: cible.engagement }
          : {}),
        rang: (await rangFinal(ctx, cible.bucket)) as never,
        updatedAt: new Date(),
      })
      .where(eq(tache.id, id));
    return obtenir(ctx, id);
  });
}

/** Changer de Statut. Vers Bloqué, la raison vient avec ; en sortant, elle s'efface. */
export async function changerStatut(ctx: Ctx, id: string, entree: z.infer<typeof C.ChangerStatut>) {
  await lire(ctx, id);
  return traduire(async () => {
    await db.update(tache)
      .set({ statut: entree.statut, raisonBlocage: entree.statut === "bloque" ? entree.raison : null, updatedAt: new Date() })
      .where(eq(tache.id, id));
    return obtenir(ctx, id);
  });
}

/**
 * Se placer entre deux voisines. Le rang est calculé **par Postgres** en `numeric` :
 * la moyenne de deux nombres à précision arbitraire ne dégrade jamais, contrairement au
 * même calcul fait en JavaScript sur des flottants.
 */
export async function reordonner(ctx: Ctx, id: string, { avantId, apresId }: z.infer<typeof C.Reordonner>) {
  const courante = await lire(ctx, id);
  const bornes = await Promise.all(
    [avantId, apresId].map(async (voisinId) => (voisinId ? (await lire(ctx, voisinId)).rang : null)),
  );
  const [avant, apres] = bornes;

  let nouveau;
  if (avant !== null && apres !== null) nouveau = sql`(${avant}::numeric + ${apres}::numeric) / 2`;
  else if (apres !== null) nouveau = sql`${apres}::numeric - 1`;
  else if (avant !== null) nouveau = sql`${avant}::numeric + 1`;
  else nouveau = await rangFinal(ctx, courante.bucket);

  await db.update(tache).set({ rang: nouveau as never, updatedAt: new Date() }).where(eq(tache.id, id));
  return obtenir(ctx, id);
}

/** Terminer et Abandonner sont deux fins distinctes, toutes deux posées à la main. */
async function terminerAvec(ctx: Ctx, id: string, etat: "termine" | "abandonne") {
  const courante = await lire(ctx, id);
  if (courante.etatTerminal) {
    throw new ErreurApi("deja_terminee", 409, "Cette Tâche a déjà une fin.");
  }
  await db
    .update(tache)
    .set({ etatTerminal: etat, termineLe: new Date(), updatedAt: new Date() })
    .where(eq(tache.id, id));
  return obtenir(ctx, id);
}

export const terminer = (ctx: Ctx, id: string) => terminerAvec(ctx, id, "termine");
export const abandonner = (ctx: Ctx, id: string) => terminerAvec(ctx, id, "abandonne");

/** Rouvrir une Tâche finie par erreur : la fin s'efface, tout le reste — Bucket, Statut, Engagement — est resté. */
export async function rouvrir(ctx: Ctx, id: string) {
  const courante = await lire(ctx, id);
  if (!courante.etatTerminal) throw new ErreurApi("requete_invalide", 409, "Cette Tâche n'a pas de fin à annuler.");
  await db.update(tache).set({ etatTerminal: null, termineLe: null, updatedAt: new Date() }).where(eq(tache.id, id));
  return obtenir(ctx, id);
}

/** Supprimer efface pour de bon : c'est réservé à ce qui n'aurait jamais dû exister. */
export async function supprimer(ctx: Ctx, id: string) {
  await lire(ctx, id);
  await db.delete(tache).where(eq(tache.id, id));
}

/**
 * Reporter. Un seul chemin peut déplacer un Engagement (invariant 4), et il exige une raison.
 * Tout se fait dans une transaction : jamais un compteur incrémenté sans son Report écrit.
 */
export async function reporter(ctx: Ctx, id: string, entree: z.infer<typeof C.Reporter>) {
  const courante = await lire(ctx, id);
  if (courante.etatTerminal) {
    throw new ErreurApi("deja_terminee", 409, "On ne reporte pas une Tâche déjà terminée.");
  }
  if (!courante.engagement) {
    throw new ErreurApi("requete_invalide", 422, "Cette Tâche n'a pas d'Engagement à reporter.");
  }
  return traduire(async () => {
    await db.transaction(async (tx) => {
      await tx.insert(report).values({
        spaceId: ctx.spaceId,
        tacheId: id,
        auteurId: ctx.membreId,
        raison: entree.raison,
        ancienEngagement: courante.engagement!,
        nouvelEngagement: entree.nouvelEngagement,
      });
      await tx
        .update(tache)
        .set({
          engagement: entree.nouvelEngagement,
          reportsCount: sql`${tache.reportsCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(tache.id, id));
    });
    return obtenir(ctx, id);
  });
}

/**
 * Le glissement du matin : une Tâche Sur le feu qu'on devait finir avant aujourd'hui revient sur
 * la table du jour, et **compte un Report**.
 *
 * Bruno ne bougeait rien tout seul : l'Engagement restait au jour dit, et il fallait quelqu'un,
 * avec une raison, pour le déplacer. Antoine a tranché autrement le 16 septembre 2026 — ce qui
 * n'a pas été fait revient de soi-même. Le Report qui l'accompagne n'est pas une punition : c'est
 * ce qui fait qu'une Tâche qui glisse trois fois finit par se dire au Point du matin, au lieu de
 * vieillir en silence.
 *
 * Deux garde-fous. **Jamais le week-end** : personne ne travaille, donc rien ne glisse — un
 * Engagement du vendredi arrive au lundi avec un seul Report, pas trois. Et c'est **idempotent
 * par construction** : une fois posé à aujourd'hui, l'Engagement n'est plus antérieur au jour,
 * le cron peut repasser tous les quarts d'heure.
 */
export const RAISON_GLISSEMENT = "pas fait le jour dit";

export async function glisser(jour: string, spaceId?: string): Promise<{ glissees: number }> {
  const restees = await db.select({ id: tache.id, spaceId: tache.spaceId, engagement: tache.engagement })
    .from(tache)
    .where(and(
      eq(tache.bucket, "sur_le_feu"),
      isNull(tache.etatTerminal),
      lt(tache.engagement, jour),
      spaceId ? eq(tache.spaceId, spaceId) : undefined,
    ));
  if (!restees.length) return { glissees: 0 };

  // Le Report et le compteur dans la même transaction : jamais l'un sans l'autre (règle 11).
  await db.transaction(async (tx) => {
    await tx.insert(report).values(restees.map((t) => ({
      spaceId: t.spaceId,
      tacheId: t.id,
      // Personne ne l'a reporté : c'est le temps qui a passé. La fiche l'écrit « Bruno ».
      auteurId: null,
      raison: RAISON_GLISSEMENT,
      ancienEngagement: t.engagement!,
      nouvelEngagement: jour,
    })));
    await tx.update(tache)
      .set({ engagement: jour, reportsCount: sql`${tache.reportsCount} + 1`, updatedAt: new Date() })
      .where(inArray(tache.id, restees.map((t) => t.id)));
  });
  return { glissees: restees.length };
}

/** L'historique des Reports d'une Tâche — visible de tous, avec qui a reporté et pourquoi (règle 11). */
export async function reports(ctx: Ctx, id: string) {
  await lire(ctx, id);
  const lignes = await db
    .select({ id: report.id, raison: report.raison, ancienEngagement: report.ancienEngagement,
              nouvelEngagement: report.nouvelEngagement, createdAt: report.createdAt, auteur: membre.nom })
    .from(report).leftJoin(membre, eq(membre.id, report.auteurId))
    .where(eq(report.tacheId, id)).orderBy(desc(report.createdAt));
  return lignes.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }));
}

/** Le seuil à partir duquel un Report devient un signal : trois, « reportée 3 fois ou plus ». */
/**
 * Les Tâches finies — Terminées et Abandonnées — dont la fin tombe entre `du` et `au`, en jours
 * de Bruno (fuseau de l'équipe, pas UTC). Le Daily et Fait lisent ici ; rien de neuf n'est écrit.
 */
export async function terminees(ctx: { spaceId: string }, du: string, au: string = du) {
  const jourFin = sql<string>`(${tache.termineLe} at time zone ${FUSEAU})::date::text`;
  const lignes = await db.select({ ...getTableColumns(tache), jourFin }).from(tache)
    .where(and(eq(tache.spaceId, ctx.spaceId), isNotNull(tache.etatTerminal), sql`${jourFin} between ${du} and ${au}`))
    .orderBy(desc(tache.termineLe));
  // Les Aidants suivent la Tâche jusqu'au bout : c'est une des choses qu'on vient lire sur une Tâche finie.
  const avec = await avecAidants(lignes);
  return lignes.map((l, i) => ({ ...l, aidantIds: avec[i].aidantIds }));
}

export const SEUIL_SIGNAL = 3;

/**
 * Les deux seuls signaux d'alerte de Bruno (PRD §9) : ce qui attend d'être trié, et ce qui a
 * été reporté trois fois ou plus. Un signal, jamais une sanction : rien n'est bloqué.
 */
export async function signaux(ctx: { spaceId: string }) {
  const vivantes = and(eq(tache.spaceId, ctx.spaceId), isNull(tache.etatTerminal));
  const [[{ aTrier }], [{ reportees }]] = await Promise.all([
    db.select({ aTrier: sql<number>`count(*)::int` }).from(tache).where(and(vivantes, eq(tache.bucket, "a_trier"))),
    db.select({ reportees: sql<number>`count(*)::int` }).from(tache).where(and(vivantes, sql`${tache.reportsCount} >= ${SEUIL_SIGNAL}`)),
  ]);
  return { aTrier, reportees };
}
