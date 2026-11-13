"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { AUCUN } from "@/lib/filtre-membres";
import { retenirMembres } from "@/lib/filtre-membres-client";

/**
 * Les visages de chacun, actif ou inactif au clic. Le même filtre sur Sur le feu, le Daily et
 * Fait, à droite de la date.
 *
 * C'est le **serveur** qui dit qui est retenu (`retenus`) : lui seul connaît l'URL, le cookie et
 * le défaut de la page. Le composant n'a plus à le deviner — c'est ce qui faisait rallumer tout
 * le monde en changeant d'onglet.
 *
 * Qui est retenu porte un **anneau d'accent** ; les autres passent en gris et rapetissent d'un
 * cheveu. Une simple différence d'opacité ne se voyait pas : on ne savait pas qui était filtré.
 */
export function FiltreMembres({ membres, retenus }: {
  membres: { id: string; nom: string; avatar?: string | null }[];
  retenus: string[];
}) {
  const router = useRouter(); const chemin = usePathname(); const params = useSearchParams();
  const [, demarrer] = useTransition();
  /**
   * L'anneau bouge tout de suite, la page suit. Avant, le clic attendait l'aller-retour vers le
   * serveur avant que quoi que ce soit change à l'écran — et le serveur est à Washington.
   */
  const venuDuServeur = retenus.join(",");
  const [actifs, setActifs] = useState(() => new Set(retenus));
  const [base, setBase] = useState(venuDuServeur);
  if (base !== venuDuServeur) { setBase(venuDuServeur); setActifs(new Set(retenus)); }

  const poser = (suivant: Set<string>) => {
    setActifs(suivant);
    // Éteindre tout le monde est un choix, pas l'absence de choix : l'URL le dit, l'écran se vide.
    const choix = suivant.size === 0 ? AUCUN : [...suivant].join(",");
    const p = new URLSearchParams(params.toString());
    p.set("membres", choix);
    setBase(choix);
    // Le cookie est ce que les autres pages liront ; `refresh` vide le cache du routeur, sinon
    // l'onglet d'à côté sortirait tel qu'il était avant le clic.
    retenirMembres(choix);
    demarrer(() => { router.replace(`${chemin}?${p}`); router.refresh(); });
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
