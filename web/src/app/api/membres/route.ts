import { asc, and, eq } from "drizzle-orm";
import { route } from "@/api/route-outils";
import { db } from "@/db/client";
import { membre } from "@/db/schema";

/** Les Membres actifs de l'Espace — pour choisir un Assigné, des Aidants. */
export const GET = route(undefined, async ({ ctx }) =>
  db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre)
    .where(and(eq(membre.spaceId, ctx.spaceId), eq(membre.actif, true))).orderBy(asc(membre.createdAt)));
