"use client";
import type { ReactNode } from "react";
import { useState } from "react";

/**
 * L'Agenda et Hier, sur un petit écran. Sous 1280 px, cinq colonnes ne laissaient que 120 px
 * aux cartes : l'Agenda et Hier partagent alors un volet à gauche, et on passe de l'un à l'autre.
 * Les trois colonnes de Tâches gardent la place.
 *
 * Au-delà de 1280 px, l'enveloppe s'efface (`xl:contents`) : Hier reprend la première colonne,
 * l'Agenda la dernière, comme avant.
 */
export function Volet({ agenda, hier }: { agenda: ReactNode; hier: ReactNode }) {
  const [vue, setVue] = useState<"agenda" | "hier">("agenda");
  return (
    <div className="flex min-h-0 flex-col border-r border-bord-2 xl:contents">
      <div className="flex flex-none items-center border-b border-bord-2 px-3 py-2 xl:hidden">
        <span className="flex h-8 items-center rounded-lg border border-bord-2 p-0.5 text-[13px]">
          {(["agenda", "hier"] as const).map((v) => (
            <button key={v} onClick={() => setVue(v)} aria-pressed={vue === v}
              className={`flex h-full items-center rounded-md px-3 ${vue === v ? "bg-surface-2 font-medium text-texte" : "text-texte-sourd hover:text-texte"}`}>
              {v === "agenda" ? "Agenda" : "Hier"}
            </button>
          ))}
        </span>
      </div>
      {/* Le volet dit déjà « Agenda » : la colonne n'a pas à le répéter, ni à tirer un deuxième filet. */}
      <div className={`flex min-h-0 flex-1 flex-col max-xl:[&>section]:border-l-0 max-xl:[&>section>header]:hidden xl:col-start-5 xl:row-start-1 ${vue === "agenda" ? "" : "max-xl:hidden"}`}>{agenda}</div>
      <div className={`flex min-h-0 flex-1 flex-col max-xl:[&>section]:border-r-0 [&>section]:flex-1 xl:col-start-1 xl:row-start-1 ${vue === "hier" ? "" : "max-xl:hidden"}`}>{hier}</div>
    </div>
  );
}
