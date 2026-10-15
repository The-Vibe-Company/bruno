/**
 * Compteurs de Membres, pour un tableau de bord externe. Lecture seule.
 *
 * `Authorization: Bearer $STATS_TOKEN`. Pas de session Google : cette route n'est pas
 * sous le layout `(bruno)` — celui qui renvoie chez Google — et elle n'appelle pas
 * `membreCourant`. Il n'y a pas de middleware. Un cookie de session, même valide,
 * ne suffit pas. Sans STATS_TOKEN, ou avec un autre jeton, 401. Contrairement au cron,
 * l'absence de secret ne laisse pas la route ouverte.
 */
import { timingSafeEqual } from "node:crypto";
import { statistiques } from "@/api/stats";

export const dynamic = "force-dynamic";

function autorise(request: Request): boolean {
  const secret = process.env.STATS_TOKEN;
  if (!secret) return false;
  const recu = Buffer.from(request.headers.get("authorization") ?? "");
  const attendu = Buffer.from(`Bearer ${secret}`);
  if (recu.length !== attendu.length) return false;
  return timingSafeEqual(recu, attendu);
}

export async function GET(request: Request) {
  if (!autorise(request)) {
    return Response.json({ message: "Non autorisé." }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  return Response.json(await statistiques(), { headers: { "cache-control": "no-store" } });
}
