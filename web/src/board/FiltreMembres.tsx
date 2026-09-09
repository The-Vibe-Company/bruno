"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { membresActifs } from "@/lib/filtre-membres";

/**
 * Les initiales de chacun — le profil, plus tard — chacune active ou inactive au clic. Le même
 * filtre sur Sur le feu, le Daily et Fait, toujours à droite de la date, porté par l'URL.
 */
export function FiltreMembres({ membres }: { membres: { id: string; nom: string; avatar?: string | null }[] }) {
  const router = useRouter(); const chemin = usePathname(); const params = useSearchParams();
  const actifs = membresActifs(params.get("membres") ?? undefined, membres);
  const poser = (suivant: Set<string>) => {
    const p = new URLSearchParams(params.toString());
    if (suivant.size === 0 || suivant.size === membres.length) p.delete("membres"); else p.set("membres", [...suivant].join(","));
    router.replace(p.size ? `${chemin}?${p}` : chemin);
  };
  /** Un clic bascule ; ⌘-clic (ou Ctrl) garde celui-là seul. */
  const basculer = (id: string) => { const s = new Set(actifs); if (s.has(id)) s.delete(id); else s.add(id); poser(s); };
  const seul = (id: string) => poser(new Set([id]));
  return (
    <div role="group" aria-label="Membres" className="flex items-center gap-1.5">
      {membres.map((m) => {
        const actif = actifs.has(m.id);
        return (
          <button key={m.id} aria-pressed={actif} title={`${m.nom} — ⌘-clic : seulement ${m.nom}`} onClick={(e) => (e.metaKey || e.ctrlKey ? seul(m.id) : basculer(m.id))}
            className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-xs font-medium transition-opacity ${actif ? "bg-bord-faible text-texte" : "border border-bord-faible text-texte-tres-faible opacity-45 hover:opacity-80"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- une data URL */}
            {m.avatar ? <img src={m.avatar} alt={m.nom} className="h-full w-full object-cover" /> : m.nom.trim().charAt(0).toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
