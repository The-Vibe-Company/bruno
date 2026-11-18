/**
 * Un retour de Google qui arrive deux fois ne doit pas faire échouer la connexion.
 *
 * Google n'échange un code qu'une fois. Quand le même retour arrive deux fois — même code, même
 * cookie d'état —, la première requête obtient l'identité et la seconde se fait répondre
 * `invalid_grant`. Si c'est la seconde que le navigateur affiche, la personne voit « La connexion
 * a échoué » alors que tout s'est bien passé. On garde donc, quelques minutes, qui la première a
 * connecté ; la seconde le retrouve. Voir `connexionEchangee` dans le schéma.
 */
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { connexionEchangee } from "@/db/schema";
import type { Session } from "./session";

/** Le doublon arrive en quelques secondes ; au-delà, ce n'en est plus un. */
const FENETRE = "5 minutes";

async function empreinte(etat: string): Promise<string> {
  const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(etat));
  return Buffer.from(octets).toString("hex");
}

/** À appeler dès que l'identité est connue, avant de répondre. */
export async function retenirConnexion(etat: string, session: Session): Promise<void> {
  await db.insert(connexionEchangee)
    .values({ etat: await empreinte(etat), membreId: session.membreId, spaceId: session.spaceId })
    .onConflictDoNothing();
  // Le ménage au passage : ces lignes ne servent que quelques secondes.
  await db.delete(connexionEchangee).where(lt(connexionEchangee.creeLe, sql`now() - interval '1 hour'`));
}

/**
 * Le Membre que la première requête a connecté avec cet état. Les deux requêtes peuvent se
 * croiser — la seconde partir avant que la première ait fini d'écrire —, d'où l'attente courte.
 */
export async function retrouverConnexion(
  etat: string,
  { attenteMs = 6000, pasMs = 300 }: { attenteMs?: number; pasMs?: number } = {},
): Promise<Session | null> {
  const cle = await empreinte(etat);
  const limite = Date.now() + attenteMs;
  for (;;) {
    const [ligne] = await db
      .select({ membreId: connexionEchangee.membreId, spaceId: connexionEchangee.spaceId })
      .from(connexionEchangee)
      .where(and(eq(connexionEchangee.etat, cle), gt(connexionEchangee.creeLe, sql`now() - interval '${sql.raw(FENETRE)}'`)));
    if (ligne) return ligne;
    if (Date.now() + pasMs > limite) return null;
    await new Promise((r) => setTimeout(r, pasMs));
  }
}
