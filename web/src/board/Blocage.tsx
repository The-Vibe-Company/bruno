"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { RAISONS_BLOCAGE } from "./raisons-blocage";

export type DemandeBlocage = { id: string; titre: string; raison: string | null; mode: "bloquer" | "modifier" } | null;

/**
 * « Pourquoi c'est bloqué ? » — la feuille qui s'ouvre quand une Tâche passe en Bloqué. Sans
 * raison, une colonne Bloqué n'est qu'un parking ; avec, chaque carte dit ce qu'elle attend.
 */
export function Blocage({ demande, onConfirmer, onAnnuler }: { demande: DemandeBlocage; onConfirmer: (id: string, raison: string) => Promise<void>; onAnnuler: () => void }) {
  return demande ? <Feuille key={demande.id + demande.mode} demande={demande} onConfirmer={onConfirmer} onAnnuler={onAnnuler} /> : null;
}

function Feuille({ demande, onConfirmer, onAnnuler }: { demande: NonNullable<DemandeBlocage>; onConfirmer: (id: string, raison: string) => Promise<void>; onAnnuler: () => void }) {
  const [raison, setRaison] = useState(demande.raison ?? "");
  const [occupe, setOccupe] = useState(false);
  const pret = raison.trim().length > 0 && !occupe;
  async function valider() {
    if (!pret) return;
    setOccupe(true);
    try { await onConfirmer(demande.id, raison.trim()); } finally { setOccupe(false); }
  }
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onAnnuler()}>
      <Dialog.Portal>
        <Dialog.Overlay className="anime-voile fixed inset-0 bg-fond-page/70" />
        <Dialog.Content aria-describedby={undefined} className="anime-boite fixed left-1/2 top-1/2 flex w-[420px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-bord-fort bg-surface p-5 shadow-2xl outline-none">
          <div>
            <Dialog.Title className="text-[19px] font-semibold tracking-tight">Pourquoi c’est bloqué ?</Dialog.Title>
            <p className="mt-1 text-[13px] text-texte-sourd">{demande.titre}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RAISONS_BLOCAGE.map((r) => (
              <button key={r} type="button" onClick={() => setRaison(raison.trim() === r ? "" : r)}
                className={`h-9 rounded-lg border px-3 text-[13.5px] ${raison.trim() === r ? "border-bloque bg-bloque-voile" : "border-bord-fort text-texte-2"}`}>{r}</button>
            ))}
          </div>
          <input autoFocus value={raison} onChange={(e) => setRaison(e.target.value)} onKeyDown={(e) => e.key === "Enter" && valider()} placeholder="ou dis-le avec tes mots" aria-label="Raison du blocage"
            className="h-10 rounded-lg border border-bord-fort bg-fond px-3 text-[14px] outline-none placeholder:text-texte-faible focus:border-accent" />
          <div className="flex items-center gap-2">
            <button onClick={valider} disabled={!pret} className="h-10 flex-1 rounded-lg bg-bloque text-[14px] font-medium text-sur-accent disabled:opacity-50">{demande.mode === "bloquer" ? "Bloquer" : "Enregistrer"}</button>
            <Dialog.Close asChild><button className="h-10 px-3 text-sm text-texte-sourd">Annuler</button></Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
