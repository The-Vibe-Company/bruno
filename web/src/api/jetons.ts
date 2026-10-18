/**
 * Les jetons personnels d'API. Un agent s'en sert pour agir en tant que le Membre
 * qui l'a créé. Le clair ne sort d'ici qu'une fois : la base ne voit que l'empreinte.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { jetonApi, membre } from "@/db/schema";
import type { CreerJeton, JetonApi, JetonEmis } from "./contrat";
import { ErreurApi, introuvable } from "./erreurs";
import type { Ctx } from "./membre-courant";

export const PREFIXE_JETON = "bruno_pat_";

export function empreinteDe(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

function clair(): string {
  return PREFIXE_JETON + randomBytes(32).toString("base64url");
}

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function resume(l: typeof jetonApi.$inferSelect): JetonApi {
  return {
    id: l.id,
    nom: l.nom,
    creeLe: l.creeLe.toISOString(),
    revoqueLe: iso(l.revoqueLe),
    dernierUsage: iso(l.dernierUsage),
  };
}

/** Les jetons de ce Membre, révoqués compris — pour voir ce qui a servi. */
export async function lister(ctx: Ctx): Promise<JetonApi[]> {
  const lignes = await db.select().from(jetonApi)
    .where(and(eq(jetonApi.spaceId, ctx.spaceId), eq(jetonApi.membreId, ctx.membreId)))
    .orderBy(desc(jetonApi.creeLe));
  return lignes.map(resume);
}

/** Crée un jeton et rend le clair. L'appelant l'affiche ; on ne le stocke pas. */
export async function creer(ctx: Ctx, entree: CreerJeton): Promise<JetonEmis> {
  const jeton = clair();
  const [ligne] = await db.insert(jetonApi).values({
    spaceId: ctx.spaceId,
    membreId: ctx.membreId,
    nom: entree.nom,
    empreinte: empreinteDe(jeton),
  }).returning();
  return { ...resume(ligne), jeton };
}

/** Coupe l'accès tout de suite. La ligne reste : on sait qu'il a existé. */
export async function revoquer(ctx: Ctx, id: string): Promise<JetonApi> {
  const [ligne] = await db.select().from(jetonApi).where(and(
    eq(jetonApi.id, id),
    eq(jetonApi.spaceId, ctx.spaceId),
    eq(jetonApi.membreId, ctx.membreId),
  ));
  if (!ligne) throw introuvable("Jeton");
  if (ligne.revoqueLe) return resume(ligne);
  const [maj] = await db.update(jetonApi)
    .set({ revoqueLe: new Date() })
    .where(eq(jetonApi.id, id))
    .returning();
  return resume(maj);
}

/**
 * Un Bearer qui n'est pas une session. Révoqué, ou Membre désactivé : refus.
 * L'Espace rendu est celui du Membre, pas une valeur que le jeton pourrait inventer.
 */
export async function resoudreJetonPersonnel(jeton: string): Promise<Ctx> {
  const [ligne] = await db.select().from(jetonApi).where(eq(jetonApi.empreinte, empreinteDe(jeton)));
  if (!ligne) throw new ErreurApi("non_authentifie", 401, "Jeton invalide.");
  if (ligne.revoqueLe) throw new ErreurApi("non_authentifie", 401, "Jeton révoqué.");

  const [m] = await db.select().from(membre).where(eq(membre.id, ligne.membreId));
  if (!m || !m.actif || m.spaceId !== ligne.spaceId) {
    throw new ErreurApi("non_authentifie", 401, "Membre inconnu ou désactivé.");
  }

  await db.update(jetonApi).set({ dernierUsage: new Date() }).where(eq(jetonApi.id, ligne.id));
  return { spaceId: m.spaceId, membreId: m.id };
}
