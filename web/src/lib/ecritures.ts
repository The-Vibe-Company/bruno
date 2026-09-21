/**
 * Ce que cet onglet vient d'écrire. Le direct s'en sert pour reconnaître ses propres gestes.
 *
 * Sans ça, chaque action coûtait deux rafraîchissements : celui que l'écran demande en
 * confirmant, puis celui du direct, qui voyait « ça a changé » sans savoir que c'était nous.
 * Et un rafraîchissement vide le cache des onglets préchargés : le suivant repartait à froid.
 *
 * Chaque écriture porte un numéro. Le direct en « absorbe » une par changement qu'il voit :
 * le premier changement qui suit une écriture est le nôtre, les suivants sont ceux des autres.
 */
let numero = 0;
let quand = 0;

/** La fenêtre dans laquelle un changement reçu peut encore être le nôtre. */
const FENETRE = 3000;

export const derniereEcriture = () => ({ numero, recente: Date.now() - quand < FENETRE });

let installe = false;

/**
 * Une fois pour toutes : toute écriture partie de cet onglet vers l'API est notée. On le fait au
 * niveau de `fetch` plutôt que dans chaque formulaire — un geste ajouté demain sera compté sans
 * qu'on ait à y penser.
 */
export function surveillerEcritures() {
  if (installe || typeof window === "undefined") return;
  installe = true;
  const origine = window.fetch.bind(window);
  window.fetch = (entree: RequestInfo | URL, init?: RequestInit) => {
    const methode = (init?.method ?? (entree instanceof Request ? entree.method : "GET")).toUpperCase();
    const url = typeof entree === "string" ? entree : entree instanceof URL ? entree.href : entree.url;
    // Le pouls et le flux ne sont pas des gestes : ce sont eux qui écoutent.
    if (methode !== "GET" && url.includes("/api/") && !/\/api\/(pouls|direct)\b/.test(url)) { numero += 1; quand = Date.now(); }
    return origine(entree, init);
  };
}
