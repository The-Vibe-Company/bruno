/**
 * Le pouls : « je suis là, sur cette page » — et en retour, qui d'autre est là, et si quelque
 * chose a bougé depuis la dernière fois.
 *
 * Un seul aller-retour pour les deux. Le client bat toutes les cinq secondes tant que l'onglet
 * est visible ; c'est ce qui donne un écran qui suit les autres sans qu'on le recharge.
 */
import { and, eq, gt, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { affectationMembre, membre, presence, sujet, tache } from "@/db/schema";

/** Trois battements manqués : on n'est plus là. Assez long pour survivre à un réseau qui hoquette. */
const FENETRE = "15 seconds";

export type Present = { membreId: string; nom: string; avatar: string | null; page: string };
export type Pouls = { version: string; presents: Present[] };
type Ctx = { spaceId: string; membreId: string };

/**
 * L'empreinte de ce qui est affiché — pas une vérité, un indice : si elle change, quelque chose
 * a changé. Le compte attrape les créations et les suppressions, la date la dernière écriture,
 * et les périodes closes leur propre fin. Comparer ça coûte une requête ; recharger la page pour
 * rien en coûterait trois.
 */
async function empreinte(spaceId: string): Promise<string> {
  const [r] = await db.select({
    taches: sql<string>`coalesce(max(${tache.updatedAt})::text, '') || ':' || count(${tache.id})`,
  }).from(tache).where(eq(tache.spaceId, spaceId));
  const [b] = await db.select({
    bandeau: sql<string>`count(*)::text || ':' || coalesce(max(${affectationMembre.fin})::text, '') || ':' || count(${affectationMembre.fin})`,
  }).from(affectationMembre).where(eq(affectationMembre.spaceId, spaceId));
  const [s] = await db.select({
    sujets: sql<string>`count(*)::text || ':' || coalesce(max(${sujet.createdAt})::text, '')`,
  }).from(sujet).where(eq(sujet.spaceId, spaceId));
  return `${r.taches}|${b.bandeau}|${s.sujets}`;
}

export async function battre(ctx: Ctx, page: string): Promise<Pouls> {
  await db.insert(presence).values({ membreId: ctx.membreId, spaceId: ctx.spaceId, page })
    .onConflictDoUpdate({ target: presence.membreId, set: { page, spaceId: ctx.spaceId, vuLe: sql`now()` } });
  const [version, presents] = await Promise.all([
    empreinte(ctx.spaceId),
    db.select({ membreId: presence.membreId, nom: membre.nom, avatar: membre.avatar, page: presence.page })
      .from(presence).innerJoin(membre, eq(membre.id, presence.membreId))
      .where(and(
        eq(presence.spaceId, ctx.spaceId),
        ne(presence.membreId, ctx.membreId), // les autres : se voir soi-même n'apprend rien
        gt(presence.vuLe, sql`now() - interval ${sql.raw(`'${FENETRE}'`)}`),
      )),
  ]);
  return { version, presents };
}
