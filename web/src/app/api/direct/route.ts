/**
 * Le direct : une connexion qui reste ouverte, et par laquelle le serveur parle quand quelque
 * chose bouge (BRU-77). Avant, le navigateur redemandait toutes les cinq secondes — on voyait
 * arriver les Tâches des autres avec cinq secondes de retard, et on redemandait pour rien 99
 * fois sur 100.
 *
 * Ce n'est pas Postgres qui nous réveille : Neon ne tient pas `LISTEN/NOTIFY` sur une connexion
 * poolée. C'est donc le serveur qui regarde souvent, ce qui est déjà tout autre chose : une
 * requête minuscule près de la base, au lieu d'un aller-retour Paris–Washington par client.
 *
 * Le flux se referme au bout de quatre minutes et le navigateur rouvre tout seul (`EventSource`
 * le fait) : mieux vaut une reconnexion prévue qu'une coupure au milieu.
 */
import { etat } from "@/api/presence";
import { membreCourant } from "@/api/membre-courant";
import { reponseErreur } from "@/api/route-outils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** À quelle fréquence le serveur regarde. Deux requêtes minuscules, à côté de la base. */
const REGARD = 500;
/** Un silence trop long et les intermédiaires ferment : un commentaire suffit à tenir la ligne. */
const SOUFFLE = 20_000;
const DUREE = 4 * 60_000;

export async function GET(request: Request) {
  let ctx;
  try { ctx = await membreCourant(request); } catch (e) { return reponseErreur(e); }

  const encodeur = new TextEncoder();
  const flux = new ReadableStream({
    start(controleur) {
      let dernier = "";
      let ferme = false;
      const ecrire = (texte: string) => { if (!ferme) controleur.enqueue(encodeur.encode(texte)); };

      const regarder = async () => {
        if (ferme) return;
        try {
          const maintenant = await etat(ctx);
          const serialise = JSON.stringify(maintenant);
          if (serialise !== dernier) { dernier = serialise; ecrire(`data: ${serialise}\n\n`); }
        } catch {
          // La base tousse : on garde la ligne ouverte, le regard suivant réessaiera.
        }
      };

      const minuteur = setInterval(regarder, REGARD);
      const souffle = setInterval(() => ecrire(": souffle\n\n"), SOUFFLE);
      const fin = setTimeout(() => fermer(), DUREE);

      function fermer() {
        if (ferme) return;
        ferme = true;
        clearInterval(minuteur); clearInterval(souffle); clearTimeout(fin);
        try { controleur.close(); } catch { /* déjà fermé */ }
      }
      request.signal.addEventListener("abort", fermer);
      // Le premier état part tout de suite : on n'attend pas qu'il change pour savoir qui est là.
      void regarder();
    },
  });

  return new Response(flux, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Sans ça, un proxy qui tamponne garderait nos messages pour lui.
      "x-accel-buffering": "no",
    },
  });
}
