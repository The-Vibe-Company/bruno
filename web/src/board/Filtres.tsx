"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** La recherche texte — et rien d'autre. Portée par l'URL, donc partageable. Le filtre par Membre vit à côté de la date. */
export function Recherche() {
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
  return (
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" aria-label="Rechercher"
      className="w-[200px] border-b border-bord bg-transparent pb-0.5 text-sm text-texte outline-none placeholder:text-texte-sourd focus:border-accent" />
  );
}
