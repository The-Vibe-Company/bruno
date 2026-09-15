"use client";
import * as Popover from "@radix-ui/react-popover";
import { useState, type ReactNode } from "react";

export type Option = { valeur: string; libelle: string; pastille?: ReactNode };

/**
 * Le sélecteur de Bruno — le même partout, à la place des menus natifs : un déclencheur à soi,
 * une liste qui s'ouvre dessous, une pastille devant chaque choix, une coche sur le courant.
 */
export function Choix({ valeur, options, onChoisir, titre, children, align = "start" }: {
  valeur: string | null; options: Option[]; onChoisir: (valeur: string) => void; titre?: string; children: ReactNode; align?: "start" | "end";
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <Popover.Root open={ouvert} onOpenChange={setOuvert}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align={align} sideOffset={6} onPointerDown={(e) => e.stopPropagation()} className="anime-bulle z-50 w-56 overflow-hidden rounded-xl border border-bord-fort bg-surface py-1 shadow-[0_20px_60px_rgb(0_0_0/0.35)] outline-none">
          {titre && <div className="px-3 pb-1 pt-1.5 text-[12px] text-texte-sourd">{titre}</div>}
          <ul className="max-h-72 overflow-y-auto">
            {options.map((o) => {
              const courant = o.valeur === valeur;
              return (
                <li key={o.valeur}>
                  <button role="option" aria-selected={courant} onClick={(e) => { e.stopPropagation(); setOuvert(false); if (!courant) onChoisir(o.valeur); }}
                    className="flex h-10 w-full items-center gap-2.5 px-3 text-left text-[13.5px] text-texte hover:bg-surface-2">
                    {o.pastille && <span className="flex w-5 flex-none items-center justify-center">{o.pastille}</span>}
                    <span className="flex-1 truncate">{o.libelle}</span>
                    {courant && <svg width="12" height="12" viewBox="0 0 10 10" fill="none" className="stroke-accent" strokeWidth="1.8"><path d="M1.5 5.5l2.5 2.5L8.5 2.5" /></svg>}
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Le chevron des déclencheurs. */
export const Chevron = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" className="opacity-70"><path d="M2 3.5l3 3 3-3" /></svg>;
