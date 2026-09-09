"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { membresActifs } from "@/lib/filtre-membres";

/**
 * Les initiales de chacun — le profil, plus tard — chacune active ou inactive au clic. Le même
 * filtre sur Sur le feu, le Daily et Fait, toujours à droite de la date, porté par l'URL.
 */
export function FiltreMembres({ membres }: { membres: { id: string; nom: string }[] }) {
  const router = useRouter(); const chemin = usePathname(); const params = useSearchParams();
  const actifs = membresActifs(params.get("membres") ?? undefined, membres);
  const basculer = (id: string) => {
    const suivant = new Set(actifs);
    if (suivant.has(id)) suivant.delete(id); else suivant.add(id);
    const p = new URLSearchParams(params.toString());
    if (suivant.size === 0 || suivant.size === membres.length) p.delete("membres"); else p.set("membres", [...suivant].join(","));
    router.replace(p.size ? `${chemin}?${p}` : chemin);
  };
  return (
    <div role="group" aria-label="Membres" className="flex items-center gap-1.5">
      {membres.map((m) => {
        const actif = actifs.has(m.id);
        return (
          <button key={m.id} aria-pressed={actif} title={m.nom} onClick={() => basculer(m.id)}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${actif ? "bg-bord-faible text-texte" : "border border-bord-faible text-texte-tres-faible hover:text-texte-sourd"}`}>
            {m.nom.trim().charAt(0).toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
