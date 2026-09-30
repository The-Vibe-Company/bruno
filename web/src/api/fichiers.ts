/**
 * Les fichiers posés sur une Tâche (THE-665) : captures d'écran, photos, devis en PDF.
 *
 * Les octets vivent dans le stockage de Vercel, **en privé** — un devis client n'a rien à faire
 * derrière une adresse devinable. C'est Bruno qui les sert, après avoir vérifié qui demande ;
 * la base ne garde que de quoi les retrouver et les nommer.
 *
 * Les images étaient dans la base en attendant ce stockage (29 septembre) ; elles n'y sont plus.
 */
import { del, get, put } from "@vercel/blob";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { fichier } from "@/db/schema";
import { ErreurApi, introuvable } from "./erreurs";

type Ctx = { spaceId: string; membreId: string };
export type Vignette = { id: string; nom: string; type: string; octets: number; estImage: boolean };

/** Ce qu'on accepte : de quoi montrer quelque chose, et de quoi transmettre un document. */
export const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
export const POIDS_MAX = 20 * 1024 * 1024;
const estImage = (type: string) => type.startsWith("image/");

const vignette = (f: { id: string; nom: string; type: string; octets: number }): Vignette =>
  ({ ...f, estImage: estImage(f.type) });

export const lister = async (ctx: Ctx, tacheId: string): Promise<Vignette[]> =>
  (await db.select({ id: fichier.id, nom: fichier.nom, type: fichier.type, octets: fichier.octets })
    .from(fichier).where(and(eq(fichier.spaceId, ctx.spaceId), eq(fichier.tacheId, tacheId)))
    .orderBy(asc(fichier.createdAt))).map(vignette);

/** Combien de fichiers par Tâche — ce que les cartes montreraient, si elles le montraient un jour. */
export async function comptes(ctx: Ctx, tacheIds: string[]): Promise<Map<string, number>> {
  if (tacheIds.length === 0) return new Map();
  const lignes = await db.select({ tacheId: fichier.tacheId, n: sql<number>`count(*)::int` })
    .from(fichier)
    .where(and(eq(fichier.spaceId, ctx.spaceId), sql`${fichier.tacheId} = any(${sql.raw(`array['${tacheIds.join("','")}']::uuid[]`)})`))
    .groupBy(fichier.tacheId);
  return new Map(lignes.map((l) => [l.tacheId, l.n]));
}

/** Le refus se décide avant d'envoyer quoi que ce soit : on ne range pas ce qu'on refusera. */
export function verifier(type: string, octets: number) {
  if (!TYPES.includes(type)) {
    throw new ErreurApi("requete_invalide", 422, "Une image (PNG, JPEG, WebP, GIF) ou un PDF.");
  }
  if (octets <= 0 || octets > POIDS_MAX) {
    throw new ErreurApi("requete_invalide", 422, `Trop lourd : ${Math.round(octets / 1024 / 1024)} Mo pour 20 Mo au maximum.`);
  }
}

export async function poser(ctx: Ctx, tacheId: string, f: { nom: string; type: string; contenu: Buffer }): Promise<Vignette[]> {
  verifier(f.type, f.contenu.byteLength);
  // Un chemin à nous, jamais montré : le nom du fichier ne décide pas où il est rangé.
  const chemin = `taches/${tacheId}/${crypto.randomUUID()}`;
  await put(chemin, f.contenu, { access: "private", contentType: f.type });
  await db.insert(fichier).values({
    spaceId: ctx.spaceId, tacheId, auteurId: ctx.membreId,
    nom: f.nom.slice(0, 120) || "fichier", type: f.type, octets: f.contenu.byteLength, chemin,
  });
  return lister(ctx, tacheId);
}

/** Le fichier lui-même, pour la route qui le sert. */
export async function contenu(ctx: { spaceId: string }, id: string) {
  const [f] = await db.select({ nom: fichier.nom, type: fichier.type, chemin: fichier.chemin })
    .from(fichier).where(and(eq(fichier.id, id), eq(fichier.spaceId, ctx.spaceId)));
  if (!f) throw introuvable("Fichier");
  const range = await get(f.chemin, { access: "private" });
  if (!range || range.statusCode !== 200) throw introuvable("Fichier");
  return { ...f, flux: range.stream };
}

/** Retirer un fichier : du stockage d'abord, de la base ensuite — un orphelin se paie tous les mois. */
export async function retirer(ctx: Ctx, id: string): Promise<{ tacheId: string }> {
  const [f] = await db.select({ tacheId: fichier.tacheId, chemin: fichier.chemin }).from(fichier)
    .where(and(eq(fichier.id, id), eq(fichier.spaceId, ctx.spaceId)));
  if (!f) throw introuvable("Fichier");
  await del(f.chemin).catch(() => { /* déjà parti : la ligne s'en va quand même */ });
  await db.delete(fichier).where(eq(fichier.id, id));
  return { tacheId: f.tacheId };
}
