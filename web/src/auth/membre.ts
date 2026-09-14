/**
 * De l'identité Google au Membre.
 *
 * Il n'y a pas d'écran d'inscription : quelqu'un du domaine qui se connecte pour la première
 * fois devient un Membre, avec exactement les mêmes droits que les autres. C'est voulu — à
 * trois associés, il n'y a rien à approuver.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { membre, space } from "@/db/schema";
import type { IdentiteGoogle } from "./google";
import type { Session } from "./session";

/**
 * Dans quel Espace atterrit une connexion. `BRUNO_SPACE_ID` le dit explicitement ; à défaut,
 * on prend l'unique Espace en base. Compter sur « il n'y en a qu'un » est correct en
 * production mais fragile ailleurs — d'où le réglage.
 */
async function espaceCourant(): Promise<string> {
  const declare = process.env.BRUNO_SPACE_ID;
  if (declare) return declare;
  const espaces = await db.select({ id: space.id }).from(space).limit(2);
  if (espaces.length === 1) return espaces[0].id;
  throw new Error(
    espaces.length === 0
      ? "Aucun Espace en base. Les données de départ n'ont pas été posées (BRU-5)."
      : "Plusieurs Espaces en base : préciser lequel avec BRUNO_SPACE_ID.",
  );
}

/** Un Membre désactivé n'entre plus — tout de suite, sans attendre l'expiration de sa session. */
export class MembreDesactive extends Error {
  constructor() { super("Ce Membre est désactivé."); this.name = "MembreDesactive"; }
}

export async function membrePourIdentite(identite: IdentiteGoogle): Promise<Session> {
  const spaceId = await espaceCourant();

  const [existant] = await db
    .select()
    .from(membre)
    .where(and(eq(membre.spaceId, spaceId), eq(membre.email, identite.email)));

  if (existant) {
    if (!existant.actif) throw new MembreDesactive();
    return { membreId: existant.id, spaceId };
  }

  const [cree] = await db
    .insert(membre)
    .values({ spaceId, nom: identite.nom, email: identite.email, type: "humain" })
    .returning();
  return { membreId: cree.id, spaceId };
}
