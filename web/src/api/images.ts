/**
 * Les images d'une Tâche (THE-665, côté images).
 *
 * Elles vivent dans la base, pas chez un tiers : Bruno n'a pas encore de stockage de fichiers, et
 * attendre qu'il en ait aurait voulu dire ne rien livrer. Les octets ne sortent que par une
 * route dédiée ; les listes ne renvoient jamais que le nom, le poids et l'identifiant.
 *
 * Le jour où un vrai stockage arrive, c'est ce fichier qui change, et lui seul.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { image } from "@/db/schema";
import { ErreurApi, introuvable } from "./erreurs";

type Ctx = { spaceId: string; membreId: string };
export type Vignette = { id: string; nom: string; type: string; octets: number };

/** Ce qu'on accepte : des images, et rien d'autre. Le refus dit lequel des deux a coincé. */
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const POIDS_MAX = 5 * 1024 * 1024;

export const lister = (ctx: Ctx, tacheId: string): Promise<Vignette[]> =>
  db.select({ id: image.id, nom: image.nom, type: image.type, octets: image.octets })
    .from(image).where(and(eq(image.spaceId, ctx.spaceId), eq(image.tacheId, tacheId)))
    .orderBy(asc(image.createdAt));

/** Les images de plusieurs Tâches d'un coup : le compte suffit aux cartes. */
export async function comptes(ctx: Ctx, tacheIds: string[]): Promise<Map<string, number>> {
  if (tacheIds.length === 0) return new Map();
  const lignes = await db.select({ tacheId: image.tacheId, n: sql<number>`count(*)::int` })
    .from(image)
    .where(and(eq(image.spaceId, ctx.spaceId), sql`${image.tacheId} = any(${sql.raw(`array['${tacheIds.join("','")}']::uuid[]`)})`))
    .groupBy(image.tacheId);
  return new Map(lignes.map((l) => [l.tacheId, l.n]));
}

export async function poser(ctx: Ctx, tacheId: string, fichier: { nom: string; type: string; contenu: Buffer }): Promise<Vignette[]> {
  if (!TYPES.includes(fichier.type)) {
    throw new ErreurApi("requete_invalide", 422, "Des images seulement : PNG, JPEG, WebP ou GIF.");
  }
  if (fichier.contenu.byteLength > POIDS_MAX) {
    throw new ErreurApi("requete_invalide", 422, `Trop lourde : ${Math.round(fichier.contenu.byteLength / 1024 / 1024)} Mo pour 5 Mo au maximum.`);
  }
  await db.insert(image).values({
    spaceId: ctx.spaceId, tacheId, auteurId: ctx.membreId,
    nom: fichier.nom.slice(0, 120) || "image", type: fichier.type,
    octets: fichier.contenu.byteLength, contenu: fichier.contenu,
  });
  return lister(ctx, tacheId);
}

/** Les octets, pour la route qui les sert. */
export async function contenu(ctx: { spaceId: string }, id: string) {
  const [i] = await db.select({ type: image.type, contenu: image.contenu })
    .from(image).where(and(eq(image.id, id), eq(image.spaceId, ctx.spaceId)));
  if (!i) throw introuvable("Image");
  return i;
}

/** Retirer une image. N'importe qui : elle est posée sur une Tâche, pas sur quelqu'un. */
export async function retirer(ctx: Ctx, id: string): Promise<{ tacheId: string }> {
  const [i] = await db.select({ tacheId: image.tacheId }).from(image)
    .where(and(eq(image.id, id), eq(image.spaceId, ctx.spaceId)));
  if (!i) throw introuvable("Image");
  await db.delete(image).where(eq(image.id, id));
  return { tacheId: i.tacheId };
}
