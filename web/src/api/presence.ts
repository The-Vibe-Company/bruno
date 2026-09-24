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
import { allegerAvatars } from "@/lib/avatar-url";

/** Deux annonces manquées : on n'est plus là. Assez long pour survivre à un réseau qui hoquette. */
const FENETRE = "20 seconds";

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
  // Une seule requête : elle tourne toutes les demi-secondes pour chaque personne connectée.
  const lignes = await db.execute<{ version: string }>(sql`
    select
      coalesce((select max(${tache.updatedAt})::text from ${tache} where ${tache.spaceId} = ${spaceId}), '')
      || ':' || (select count(*) from ${tache} where ${tache.spaceId} = ${spaceId})
      || '|' || (select count(*) from ${affectationMembre} where ${affectationMembre.spaceId} = ${spaceId})
      || ':' || coalesce((select max(${affectationMembre.fin})::text from ${affectationMembre} where ${affectationMembre.spaceId} = ${spaceId}), '')
      || ':' || (select count(${affectationMembre.fin}) from ${affectationMembre} where ${affectationMembre.spaceId} = ${spaceId})
      || '|' || (select count(*) from ${sujet} where ${sujet.spaceId} = ${spaceId})
      || ':' || coalesce((select max(${sujet.createdAt})::text from ${sujet} where ${sujet.spaceId} = ${spaceId}), '')
      as version`);
  return lignes[0]?.version ?? "";
}

/** Qui d'autre est là. Se voir soi-même n'apprend rien : on s'exclut. */
const lesAutres = (ctx: Ctx) =>
  db.select({ membreId: presence.membreId, nom: membre.nom, avatar: membre.avatar, page: presence.page })
    .from(presence).innerJoin(membre, eq(membre.id, presence.membreId))
    .where(and(
      eq(presence.spaceId, ctx.spaceId),
      ne(presence.membreId, ctx.membreId),
      gt(presence.vuLe, sql`now() - interval ${sql.raw(`'${FENETRE}'`)}`),
    ));

/** L'état du moment : ce qui a changé, et qui est là. C'est ce que le flux envoie. */
export async function etat(ctx: Ctx): Promise<Pouls> {
  const [version, presents] = await Promise.all([empreinte(ctx.spaceId), lesAutres(ctx)]);
  // L'adresse de la photo, pas la photo : le flux renvoie cet état à chaque changement.
  return { version, presents: allegerAvatars(presents, (p) => p.membreId) };
}

/** « Je suis là, sur cette page. » Une écriture, et l'état en retour. */
export async function battre(ctx: Ctx, page: string): Promise<Pouls> {
  await db.insert(presence).values({ membreId: ctx.membreId, spaceId: ctx.spaceId, page })
    .onConflictDoUpdate({ target: presence.membreId, set: { page, spaceId: ctx.spaceId, vuLe: sql`now()` } });
  return etat(ctx);
}
