"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { aujourdhui, demain, lundiProchain } from "@/lib/dates";
import { Calendrier, IconeCalendrier } from "./Calendrier";

export type DemandeAVenir = { id: string; titre: string } | null;

/**
 * Passer une Tâche À venir, c'est dire pour quand — une Tâche À venir porte un Engagement.
 * Les mêmes raccourcis que la feuille de Report, et « sans date » pour ce qu'on ne sait pas
 * encore placer. Rien de dur ici : le seul verrou de Bruno est l'entrée Sur le feu.
 */
export function PourQuand({ demande, onConfirmer, onAnnuler }: {
  demande: DemandeAVenir; onConfirmer: (id: string, engagement: string | null) => Promise<void>; onAnnuler: () => void;
}) {
  const [autre, setAutre] = useState<string>("");
  const [occupe, setOccupe] = useState(false);
  const choisir = async (engagement: string | null) => {
    if (!demande) return;
    setOccupe(true);
    try { await onConfirmer(demande.id, engagement); } finally { setOccupe(false); setAutre(""); }
  };
  return (
    <Dialog.Root open={demande !== null} onOpenChange={(o) => !o && onAnnuler()}>
      <Dialog.Portal>
        <Dialog.Overlay className="anime-voile fixed inset-0 bg-fond-page/70" />
        <Dialog.Content aria-describedby={undefined} className="anime-boite fixed left-1/2 top-1/2 flex w-[440px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-2xl border border-bord-fort bg-surface p-6 shadow-2xl outline-none">
          <div>
            <p className="text-[13px] text-texte-sourd">Passer À venir</p>
            <Dialog.Title className="mt-1.5 text-[21px] font-medium leading-tight tracking-tight">{demande?.titre}</Dialog.Title>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="text-[13px] text-texte-sourd">Pour quand ?</p>
            <div className="flex gap-2">
              <Choix libelle="demain" sous={libelleLongCourt(demain())} valeur={demain()} occupe={occupe} onChoisir={choisir} />
              <Choix libelle="lundi" sous={libelleLongCourt(lundiProchain())} valeur={lundiProchain()} occupe={occupe} onChoisir={choisir} />
              <Calendrier valeur={autre || null} min={aujourdhui()} align="end"
                onChoisir={(jour) => { setAutre(jour); choisir(jour); }}>
                <button type="button" disabled={occupe} aria-label="Autre date"
                  className="flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-bord-fort text-[15px] font-medium hover:border-accent disabled:opacity-60">
                  <span className="flex items-center gap-1.5">autre<IconeCalendrier /></span>
                  {autre && <span className="text-[12.5px] font-normal text-texte-sourd">{libelleLongCourt(autre)}</span>}
                </button>
              </Calendrier>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => choisir(null)} disabled={occupe} className="h-10 rounded-lg border border-bord-fort px-4 text-[14.5px]">Sans date</button>
            <Dialog.Close asChild><button className="h-10 px-3 text-sm text-texte-sourd">Annuler</button></Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Choix({ libelle, sous, valeur, occupe, onChoisir }: { libelle: string; sous?: string; valeur: string | null; occupe: boolean; onChoisir: (v: string | null) => void }) {
  return (
    <button onClick={() => onChoisir(valeur)} disabled={occupe}
      className="flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-bord-fort text-[15px] font-medium hover:border-accent disabled:opacity-60">
      {libelle}{sous && <span className="text-[12.5px] font-normal text-texte-sourd">{sous}</span>}
    </button>
  );
}

/** « mardi 8 » — le jour et le numéro, sans le mois. */
function libelleLongCourt(jour: string): string {
  return new Date(jour + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", timeZone: "UTC" });
}
