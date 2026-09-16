"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Present } from "@/api/presence";

/** Le rythme du pouls. Cinq secondes : assez vif pour qu'on se croie en direct, assez lent pour trois personnes. */
const BATTEMENT = 5000;
const PAGES: Record<string, string> = { "/": "Sur le feu", "/daily": "le Daily", "/weekly": "le Weekly", "/fait": "Fait", "/recurrences": "les Récurrences", "/reglages": "les Réglages" };
const ou = (page: string) => PAGES[page] ?? page;

/**
 * Voir les autres travailler. Le pouls dit « je suis là », et rapporte deux choses : qui d'autre
 * regarde Bruno en ce moment, et une empreinte de ce qui est affiché. Quand l'empreinte change,
 * c'est que quelqu'un a bougé quelque chose — on redemande la page au serveur, et la carte
 * déplacée par Stan apparaît sans qu'on ait rien à faire.
 *
 * Il vit dans le rail, donc dans le layout : monté une fois, il suit d'une page à l'autre. Un
 * onglet en arrière-plan ne bat pas — personne ne le regarde, et le serveur est à Washington.
 */
export function Pouls() {
  const chemin = usePathname();
  const router = useRouter();
  const [presents, setPresents] = useState<Present[]>([]);
  const derniere = useRef<string | null>(null);

  useEffect(() => {
    let vivant = true;
    const battre = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/pouls", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ page: chemin }) });
        if (!r.ok || !vivant) return;
        const pouls: { version: string; presents: Present[] } = await r.json();
        if (!vivant) return;
        setPresents(pouls.presents);
        // Le premier battement sert de référence : on ne recharge pas la page qu'on vient d'ouvrir.
        if (derniere.current !== null && derniere.current !== pouls.version) router.refresh();
        derniere.current = pouls.version;
      } catch { /* le réseau tousse : le battement d'après réessaiera */ }
    };
    battre();
    const minuteur = setInterval(battre, BATTEMENT);
    // Revenir sur l'onglet, c'est vouloir la dernière version tout de suite.
    document.addEventListener("visibilitychange", battre);
    return () => { vivant = false; clearInterval(minuteur); document.removeEventListener("visibilitychange", battre); };
  }, [chemin, router]);

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
