"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Membre } from "./DroitEntree";

/** Recherche texte et filtre par Assigné — et rien d'autre. Portés par l'URL, donc partageables. */
export function Filtres({ membres }: { membres: Membre[] }) {
  const router = useRouter(); const chemin = usePathname(); const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (q.trim()) p.set("q", q.trim()); else p.delete("q");
      if (p.toString() !== params.toString()) router.replace(`${chemin}?${p}`);
    }, 250);
    return () => clearTimeout(t);
  }, [q, params, chemin, router]);
  const assigne = params.get("assigne") ?? "";
  return (
    <div className="flex items-center gap-6 text-sm text-texte-sourd">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" aria-label="Rechercher"
        className="w-[200px] border-b border-bord bg-transparent pb-0.5 text-texte outline-none placeholder:text-texte-sourd focus:border-accent" />
      <select value={assigne} aria-label="Assigné" onChange={(e) => { const p = new URLSearchParams(params.toString()); if (e.target.value) p.set("assigne", e.target.value); else p.delete("assigne"); router.replace(`${chemin}?${p}`); }}
        className="bg-transparent text-texte-sourd outline-none">
        <option value="">Tous les Assignés</option>
        {membres.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
      </select>
    </div>
  );
}
