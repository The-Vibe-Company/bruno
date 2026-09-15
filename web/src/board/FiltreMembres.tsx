"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { membresActifs } from "@/lib/filtre-membres";

/**
 * Les visages de chacun, actif ou inactif au clic. Le même filtre sur Sur le feu, le Daily et
 * Fait, à droite de la date, porté par l'URL.
 *
 * Qui est retenu porte un **anneau d'accent** ; les autres passent en gris et rapetissent d'un
 * cheveu. Une simple différence d'opacité ne se voyait pas : on ne savait pas qui était filtré.
 */
export function FiltreMembres({ membres, defaut }: { membres: { id: string; nom: string; avatar?: string | null }[]; defaut?: string[] }) {
  const router = useRouter(); const chemin = usePathname(); const params = useSearchParams();
  const [, demarrer] = useTransition();
  /**
   * L'anneau bouge tout de suite, la page suit. Avant, le clic attendait l'aller-retour vers le
   * serveur avant que quoi que ce soit change à l'écran — et le serveur est à Washington.
   */
  const brut = params.get("membres");
  const [actifs, setActifs] = useState(() => membresActifs(brut ?? undefined, membres, defaut));
  const [base, setBase] = useState(brut);
  if (base !== brut) { setBase(brut); setActifs(membresActifs(brut ?? undefined, membres, defaut)); }
  /** Revenir au défaut, c'est retirer le paramètre : l'URL ne porte que ce qui s'écarte de lui. */
  const parDefaut = new Set(defaut?.length ? defaut : membres.map((m) => m.id));
  const memeQueLeDefaut = (s: Set<string>) => s.size === parDefaut.size && [...s].every((id) => parDefaut.has(id));
  const poser = (suivant: Set<string>) => {
    setActifs(suivant);
    const p = new URLSearchParams(params.toString());
    if (suivant.size === 0 || memeQueLeDefaut(suivant)) p.delete("membres"); else p.set("membres", [...suivant].join(","));
    const url = p.size ? `${chemin}?${p}` : chemin;
    setBase(p.get("membres"));
    demarrer(() => router.replace(url));
  };
  /** Un clic bascule ; ⌘-clic (ou Ctrl) garde celui-là seul. */
  const basculer = (id: string) => { const s = new Set(actifs); if (s.has(id)) s.delete(id); else s.add(id); poser(s); };
  const seul = (id: string) => poser(new Set([id]));
  return (
    <div role="group" aria-label="Membres" className="flex items-center gap-3">
      {membres.map((m) => {
        const actif = actifs.has(m.id);
        return (
          <button key={m.id} aria-pressed={actif} title={`${m.nom} — ⌘-clic : seulement ${m.nom}`} onClick={(e) => (e.metaKey || e.ctrlKey ? seul(m.id) : basculer(m.id))}
            className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-xs font-medium ring-offset-2 ring-offset-fond transition-all ${
              actif
                ? "bg-bord-faible text-texte ring-2 ring-accent"
                : "scale-90 bg-bord-faible text-texte-tres-faible opacity-40 grayscale hover:opacity-70"
            }`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- une data URL */}
            {m.avatar ? <img src={m.avatar} alt={m.nom} className="h-full w-full object-cover" /> : m.nom.trim().charAt(0).toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
