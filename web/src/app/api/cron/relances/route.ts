/**
 * Point d'entrée des Relances, appelé par Vercel Cron toutes les 15 minutes — la granularité des
 * Créneaux. Le moteur décide qui, de quoi, et ne livre jamais deux fois (BRU-24).
 *
 * `?apercu=1` montre ce qui partirait sans rien envoyer ; `&quand=2026-09-08T09:15` rejoue un
 * instant (heure de Bruno). Le cron de Vercel envoie
 * `Authorization: Bearer $CRON_SECRET` ; sans secret configuré, la route reste ouverte en dev.
 */
import { relancer, relancesDues } from "@/relances/moteur";
import { instant, instantDepuis } from "@/relances/temps";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const attendu = process.env.CRON_SECRET;
  if (attendu && request.headers.get("authorization") !== `Bearer ${attendu}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  const url = new URL(request.url);
  const rejoue = url.searchParams.get("quand");
  const i = (rejoue && instantDepuis(rejoue)) || instant();
  if (url.searchParams.get("apercu")) {
    const dues = await relancesDues(i);
    return Response.json({ instant: i, dues: dues.map((r) => ({ membre: r.nom, heure: r.heure, ...r.message })) });
  }
  const bilan = await relancer(undefined, i);
  return Response.json({ instant: i, ...bilan });
}
