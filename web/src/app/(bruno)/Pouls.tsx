"use client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Present } from "@/api/presence";
import { derniereEcriture, surveillerEcritures } from "@/lib/ecritures";

/** À quelle fréquence on annonce sa présence. La fenêtre du serveur est de vingt secondes. */
const ANNONCE = 8000;
const PAGES: Record<string, string> = { "/": "Sur le feu", "/daily": "le Daily", "/weekly": "le Weekly", "/fait": "Fait", "/recurrences": "les Récurrences", "/reglages": "les Réglages" };
const ou = (page: string) => PAGES[page] ?? page;

/**
 * Voir les autres travailler, en direct.
 *
 * Deux choses, deux sens. On **annonce** où l'on est toutes les huit secondes — une écriture, il
 * en faut bien une. Et l'on **écoute** un flux que le serveur garde ouvert : dès que ce qui est
 * affiché change, il le dit, et la page se redemande. La carte déplacée par Stan apparaît dans
 * la seconde, sans rien toucher.
 *
 * Le composant vit dans le rail, donc dans le layout : monté une fois, il suit d'une page à
 * l'autre. Onglet en arrière-plan, tout s'arrête — personne ne regarde.
 */
export function Pouls() {
  const chemin = usePathname();
  const router = useRouter();
  const [presents, setPresents] = useState<Present[]>([]);
  const derniere = useRef<string | null>(null);
  /** Le numéro de la dernière écriture de cet onglet dont on a déjà vu passer le changement. */
  const absorbee = useRef(0);

  useEffect(() => { surveillerEcritures(); }, []);

  /** Ce qu'on fait d'un état reçu, d'où qu'il vienne : le flux, ou l'annonce de repli. */
  const appliquer = useCallback((pouls: { version: string; presents: Present[] }) => {
    setPresents(pouls.presents);
    const avant = derniere.current;
    derniere.current = pouls.version;
    // Le premier état sert de référence : on ne recharge pas la page qu'on vient d'ouvrir.
    if (avant === null || avant === pouls.version) return;
    // Le premier changement qui suit un geste d'ici, c'est ce geste : l'écran l'a déjà confirmé.
    const { numero, recente } = derniereEcriture();
    if (recente && numero > absorbee.current) { absorbee.current = numero; return; }
    router.refresh();
  }, [router]);

  // J'annonce que je suis là, et sur quelle page.
  useEffect(() => {
    let vivant = true;
    const annoncer = async () => {
      if (!vivant || document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/pouls", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ page: chemin }) });
        if (!r.ok || !vivant) return;
        // L'annonce rapporte le même état que le flux : si celui-ci est coupé quelque part
        // (un proxy qui n'aime pas les connexions longues), on retombe sur huit secondes de retard
        // plutôt que sur rien du tout.
        appliquer(await r.json());
      } catch { /* le réseau tousse : l'annonce suivante réessaiera */ }
    };
    annoncer();
    const minuteur = setInterval(annoncer, ANNONCE);
    document.addEventListener("visibilitychange", annoncer);
    return () => { vivant = false; clearInterval(minuteur); document.removeEventListener("visibilitychange", annoncer); };
  }, [chemin, appliquer]);

  // J'écoute ce que fait le reste de l'équipe.
  useEffect(() => {
    let flux: EventSource | null = null;
    const ouvrir = () => {
      if (flux || document.visibilityState !== "visible") return;
      flux = new EventSource("/api/direct");
      flux.onmessage = (e) => appliquer(JSON.parse(e.data));
      // `EventSource` se reconnecte seul ; on le laisse faire plutôt que de compter les échecs.
    };
    const fermer = () => { flux?.close(); flux = null; };
    const suivreLOnglet = () => (document.visibilityState === "visible" ? ouvrir() : fermer());
    ouvrir();
    document.addEventListener("visibilitychange", suivreLOnglet);
    return () => { document.removeEventListener("visibilitychange", suivreLOnglet); fermer(); };
  }, [appliquer]);

  if (presents.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-1.5 pb-2" aria-label="Qui est là">
      {presents.map((p) => (
        <span key={p.membreId} className="group relative flex h-7 w-7 items-center justify-center" title={`${p.nom} · ${ou(p.page)}`}>
          <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-bord-faible text-[10px] font-medium">
            {/* eslint-disable-next-line @next/next/no-img-element -- une data URL */}
            {p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" /> : p.nom.trim().charAt(0).toUpperCase()}
          </span>
          {/* La pastille verte : la même convention que partout ailleurs — cette personne est en ligne. */}
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-fond bg-en-cours" />
        </span>
      ))}
    </div>
  );
}
