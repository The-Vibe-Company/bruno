/**
 * Connexion de développement : ouvre une session pour le premier Membre de la base, sans
 * passer par Google. Deux verrous, tous deux nécessaires : jamais en production, et jamais
 * sans `BRUNO_DEV_LOGIN=1` posé explicitement. Sinon la route n'existe pas (404).
 *
 * `?membre=Stan` ouvre la session de quelqu'un d'autre : deux fenêtres, deux personnes, et l'on
 * peut enfin voir de ses yeux ce que l'un fait apparaître chez l'autre.
 */
import { and, asc, eq, ilike } from "drizzle-orm";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { SPACE_ID } from "@/db/seed";
import { creerSession, enteteCookie } from "@/auth/session";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.BRUNO_DEV_LOGIN !== "1") {
    return new Response("Not found", { status: 404 });
  }
  // Le premier Membre de l'Espace des données de départ — celui qui a la démo — ou celui qu'on demande.
  const demande = new URL(request.url).searchParams.get("membre");
  const qui = demande
    ? and(eq(membre.spaceId, SPACE_ID), ilike(membre.nom, demande))
    : eq(membre.spaceId, SPACE_ID);
  const [m] = await db.select().from(membre).where(qui).orderBy(asc(membre.createdAt)).limit(1);
  if (!m) return new Response("Aucun Membre : lancer pnpm db:seed:demo", { status: 500 });
  const jeton = await creerSession({ membreId: m.id, spaceId: m.spaceId });
  return new Response(null, {
    status: 302,
    headers: { location: new URL("/", request.url).toString(), "set-cookie": enteteCookie(jeton) },
  });
}
