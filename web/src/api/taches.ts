/**
 * Les opérations sur les Tâches. Toute la logique métier vit ici ; les routes ne font que
 * valider l'entrée, appeler ces fonctions et sérialiser la sortie.
 */
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { tache, tacheAidant, report } from "@/db/schema";
import { ErreurApi, depuisPostgres, introuvable } from "./erreurs";
import type * as C from "./contrat";

type Ctx = { spaceId: string; membreId: string };

/** Enveloppe toute écriture : une contrainte Postgres violée ressort en refus lisible. */
async function traduire<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const err = depuisPostgres(e);
    if (err) throw err;
    throw e;
  }
}

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
async function rangFinal(ctx: Ctx, bucket: string) {
  const [r] = await db
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
    .orderBy(sql`${tache.rang} asc`);
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

export async function modifier(ctx: Ctx, id: string, patch: z.infer<typeof C.ModifierTache>) {
  await lire(ctx, id);
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

export async function changerStatut(ctx: Ctx, id: string, statut: z.infer<typeof C.Statut>) {
  await lire(ctx, id);
  return traduire(async () => {
    await db.update(tache).set({ statut, updatedAt: new Date() }).where(eq(tache.id, id));
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

/** L'historique des Reports d'une Tâche — le compteur est visible de tous (règle 11). */
export async function reports(ctx: Ctx, id: string) {
  await lire(ctx, id);
  return db.select().from(report).where(eq(report.tacheId, id)).orderBy(desc(report.createdAt));
}
