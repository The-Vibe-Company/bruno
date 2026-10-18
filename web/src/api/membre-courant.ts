/**
 * Qui parle. La session est signée par Bruno (voir `auth/session.ts`) et arrive soit dans le
 * cookie du web, soit en `Authorization: Bearer` depuis iOS. Le même en-tête porte aussi un
 * jeton personnel `bruno_pat_…` : on essaie le JWT, puis le jeton. Un seul contexte en sort.
 */
import { eq } from "drizzle-orm";
import { jetonDeLaRequete, lireSession } from "@/auth/session";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { ErreurApi } from "./erreurs";
import { PREFIXE_JETON, resoudreJetonPersonnel } from "./jetons";

export type Ctx = { spaceId: string; membreId: string };

export async function membreCourant(request: Request): Promise<Ctx> {
  const jeton = jetonDeLaRequete(request);
  if (!jeton) throw new ErreurApi("non_authentifie", 401, "Pas de session.");

  const session = await lireSession(jeton);
  if (session) return membreActif(session.membreId);

  if (jeton.startsWith(PREFIXE_JETON)) return resoudreJetonPersonnel(jeton);

  throw new ErreurApi("non_authentifie", 401, "Session invalide ou expirée.");
}

/** La session dit qui, la base dit si c'est toujours vrai : un Membre désactivé perd l'accès tout de suite. */
async function membreActif(membreId: string): Promise<Ctx> {
  const [m] = await db.select().from(membre).where(eq(membre.id, membreId));
  if (!m || !m.actif) throw new ErreurApi("non_authentifie", 401, "Membre inconnu ou désactivé.");
  return { spaceId: m.spaceId, membreId: m.id };
}
