/**
 * Point d'entrée des Relances, appelé par Vercel Cron toutes les 15 minutes.
 *
 * Le contenu réel — quelles Tâches, quel ton selon le Créneau, quelle notification groupée —
 * est le sujet de BRU-24. Cette route existe déjà pour une raison précise : elle prouve, au
 * déploiement, que la planification au quart d'heure est acceptée par le plan Vercel. C'était
 * la condition ouverte de l'ADR 0001.
 */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const attendu = process.env.CRON_SECRET;
  if (attendu && request.headers.get("authorization") !== `Bearer ${attendu}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  return Response.json({
    ok: true,
    implemente: false,
    ticket: "BRU-24 — Le moteur de Relance",
    heure: new Date().toISOString(),
  });
}
