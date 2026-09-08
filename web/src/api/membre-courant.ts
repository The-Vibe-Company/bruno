/**
 * Qui parle. Provisoire : la vraie session Google arrive avec BRU-4.
 *
 * Le point important est le garde-fou. Ce raccourci lit un simple en-tête, donc il **refuse
 * de fonctionner en production** sauf si on l'autorise explicitement. Une authentification
 * de fortune qui part en prod par inadvertance, c'est une API ouverte.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { ErreurApi } from "./erreurs";

export type Ctx = { spaceId: string; membreId: string };

export async function membreCourant(request: Request): Promise<Ctx> {
  if (process.env.NODE_ENV === "production" && process.env.BRUNO_AUTH_PROVISOIRE !== "1") {
    throw new ErreurApi("non_authentifie", 401,
      "L'authentification n'est pas encore branchée (BRU-4). L'API est fermée en production.");
  }
  const id = request.headers.get("x-bruno-membre");
  if (!id) {
    throw new ErreurApi("non_authentifie", 401,
      "En-tête x-bruno-membre manquant. Provisoire, jusqu'à BRU-4.");
  }
  const [m] = await db.select().from(membre).where(eq(membre.id, id));
  if (!m || !m.actif) {
    throw new ErreurApi("non_authentifie", 401, "Membre inconnu ou désactivé.");
  }
  return { spaceId: m.spaceId, membreId: m.id };
}
