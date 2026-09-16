"use client";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { aujourdhui, decalerMois, grilleDuMois, libelleMois, moisDe } from "@/lib/dates";

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

/**
 * Le calendrier de Bruno, à la place de celui du navigateur.
 *
 * Celui de Chrome arrivait en bleu système, avec sa propre police et ses propres mots : au
 * milieu d'une fiche, on voyait la couture. Celui-ci est une bulle comme les autres, au clavier
 * comme à la souris — flèches pour se déplacer, Entrée pour choisir, Échap pour fermer.
 *
 * `min` grise le passé sans le cacher : voir que le 14 existe et qu'il est hors d'atteinte vaut
 * mieux qu'un trou dans la grille.
 */
export function Calendrier({ valeur, min, onChoisir, onEffacer, align = "start", children }: {
  valeur: string | null;
  min?: string;
  onChoisir: (jour: string) => void;
  onEffacer?: () => void;
  align?: "start" | "center" | "end";
  children: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const aujourd = aujourdhui();
  const depart = valeur ?? (min && min > aujourd ? min : aujourd);
  const [mois, setMois] = useState(() => moisDe(depart));
  const [curseur, setCurseur] = useState(depart);
  const grille = useRef<HTMLDivElement>(null);

  // Le clavier déplace le curseur ; la case qui le porte prend le focus, donc le lecteur d'écran l'annonce.
  useEffect(() => {
    if (!ouvert) return;
    grille.current?.querySelector<HTMLButtonElement>('[data-curseur="oui"]')?.focus();
  }, [ouvert, curseur]);

  const interdit = (jour: string) => (min ? jour < min : false);
  const bouger = (jours: number) => {
    const suivant = grilleDuMois(mois).flat();
    const cible = suivant[suivant.indexOf(curseur) + jours] ?? decalerJours(curseur, jours);
    setCurseur(cible);
    setMois(moisDe(cible));
  };
  const clavier = (e: React.KeyboardEvent) => {
    const pas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (pas[e.key] !== undefined) { e.preventDefault(); bouger(pas[e.key]); return; }
    if (e.key === "PageUp" || e.key === "PageDown") { e.preventDefault(); setMois((m) => decalerMois(m, e.key === "PageUp" ? -1 : 1)); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!interdit(curseur)) choisir(curseur); }
  };
  const choisir = (jour: string) => { setOuvert(false); onChoisir(jour); };
  /** Rouvrir, c'est repartir de la date en cours — pas du mois qu'on feuilletait la fois d'avant. */
  const basculer = (o: boolean) => {
    setOuvert(o);
    if (o) { setMois(moisDe(depart)); setCurseur(depart); }
  };

  const precedentPossible = !min || decalerMois(mois, -1) + "-31" >= min.slice(0, 7) + "-01";

  return (
    <Popover.Root open={ouvert} onOpenChange={basculer}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align={align} sideOffset={6} onPointerDown={(e) => e.stopPropagation()} onKeyDown={clavier}
          className="anime-bulle z-50 w-[272px] rounded-xl border border-bord-fort bg-surface p-3 shadow-[0_20px_60px_rgb(0_0_0/0.35)] outline-none">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[13.5px] font-medium first-letter:uppercase">{libelleMois(mois)}</span>
            <span className="flex gap-0.5">
              <Fleche sens="precedent" actif={precedentPossible} onClick={() => setMois(decalerMois(mois, -1))} />
              <Fleche sens="suivant" actif onClick={() => setMois(decalerMois(mois, 1))} />
            </span>
          </div>

          <div className="grid grid-cols-7 pb-1">
            {JOURS.map((j, i) => <span key={i} className="text-center text-[11px] font-medium text-texte-faible">{j}</span>)}
          </div>

          <div ref={grille} role="grid" aria-label="Choisir une date" className="grid grid-cols-7 gap-y-0.5">
            {grilleDuMois(mois).flat().map((jour) => {
              const dehors = jour.slice(0, 7) !== mois.slice(0, 7);
              const bloque = interdit(jour);
              const choisi = jour === valeur;
              return (
                <button key={jour} type="button" role="gridcell" aria-selected={choisi} aria-current={jour === aujourd ? "date" : undefined}
                  disabled={bloque} data-curseur={jour === curseur ? "oui" : undefined} tabIndex={jour === curseur ? 0 : -1}
                  onClick={(e) => { e.stopPropagation(); choisir(jour); }} onMouseEnter={() => setCurseur(jour)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[13px] tabular-nums outline-none transition-colors
                    ${choisi ? "bg-accent font-medium text-sur-accent"
                      : bloque ? "text-texte-tres-faible"
                      : dehors ? "text-texte-faible hover:bg-surface-2"
                      : "text-texte hover:bg-surface-2"}
                    ${jour === aujourd && !choisi ? "font-medium text-accent" : ""}
                    focus-visible:ring-2 focus-visible:ring-accent`}>
                  {+jour.slice(8, 10)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={() => choisir(aujourd)} disabled={interdit(aujourd)}
              className="h-7 rounded-md px-2 text-[12.5px] text-accent hover:bg-surface-2 disabled:opacity-40">Aujourd’hui</button>
            {onEffacer && (
              <button type="button" onClick={() => { setOuvert(false); onEffacer(); }}
                className="h-7 rounded-md px-2 text-[12.5px] text-texte-sourd hover:bg-surface-2 hover:text-texte">Retirer</button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Sortir de la grille affichée : le curseur peut aller au mois d'à côté. */
function decalerJours(jour: string, n: number): string {
  const d = new Date(jour + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function Fleche({ sens, actif, onClick }: { sens: "precedent" | "suivant"; actif: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!actif} aria-label={sens === "precedent" ? "Mois précédent" : "Mois suivant"}
      className="flex h-7 w-7 items-center justify-center rounded-md text-texte-sourd hover:bg-surface-2 hover:text-texte disabled:opacity-30 disabled:hover:bg-transparent">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d={sens === "precedent" ? "M6.5 2l-3 3 3 3" : "M3.5 2l3 3-3 3"} />
      </svg>
    </button>
  );
}

/** L'icône que portent les déclencheurs de date. */
export const IconeCalendrier = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" className="flex-none opacity-70" aria-hidden="true">
    <rect x="1.5" y="3" width="11" height="9.5" rx="2" /><path d="M1.5 6h11M4.5 1.5v3M9.5 1.5v3" />
  </svg>
);
