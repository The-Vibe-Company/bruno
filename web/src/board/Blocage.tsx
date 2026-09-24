"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { RAISONS_BLOCAGE } from "./raisons-blocage";

export type DemandeBlocage = { id: string; titre: string; raison: string | null; dependDeId?: string | null; mode: "bloquer" | "modifier" } | null;
export type Candidate = { id: string; titre: string };
/** La raison qui appelle une Tâche : la dernière de la liste, celle qui dit « une autre Tâche ». */
const DEPEND = RAISONS_BLOCAGE[RAISONS_BLOCAGE.length - 1];

/**
 * « Pourquoi c'est bloqué ? » — la feuille qui s'ouvre quand une Tâche passe en Bloqué. Sans
 * raison, une colonne Bloqué n'est qu'un parking ; avec, chaque carte dit ce qu'elle attend.
 */
export function Blocage({ demande, candidates = [], onConfirmer, onAnnuler }: {
  demande: DemandeBlocage; candidates?: Candidate[];
  onConfirmer: (id: string, raison: string, dependDeId: string | null) => Promise<void>; onAnnuler: () => void;
}) {
  return demande ? <Feuille key={demande.id + demande.mode} demande={demande} candidates={candidates} onConfirmer={onConfirmer} onAnnuler={onAnnuler} /> : null;
}

function Feuille({ demande, candidates, onConfirmer, onAnnuler }: {
  demande: NonNullable<DemandeBlocage>; candidates: Candidate[];
  onConfirmer: (id: string, raison: string, dependDeId: string | null) => Promise<void>; onAnnuler: () => void;
}) {
  const [raison, setRaison] = useState(demande.raison ?? "");
  const [dependDeId, setDependDeId] = useState<string | null>(demande.dependDeId ?? null);
  const [recherche, setRecherche] = useState("");
  const [occupe, setOccupe] = useState(false);
  // « Dépend d'une autre Tâche » appelle une question de plus : laquelle ? Sans réponse, la
  // raison reste vraie mais vague — avec, on peut aller voir ce qu'on attend.
  const surUneTache = raison.trim() === DEPEND;
  const attendue = candidates.find((c) => c.id === dependDeId) ?? null;
  const trouvees = candidates
    .filter((c) => c.id !== demande.id && c.titre.toLowerCase().includes(recherche.trim().toLowerCase()))
    .slice(0, 6);
  const pret = raison.trim().length > 0 && !occupe;
  async function valider() {
    if (!pret) return;
    setOccupe(true);
    try { await onConfirmer(demande.id, raison.trim(), surUneTache ? dependDeId : null); } finally { setOccupe(false); }
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

          {surUneTache && (attendue ? (
            <div className="flex items-center gap-2 rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2">
              <span className="flex-1 truncate text-[13.5px]">{attendue.titre}</span>
              <button type="button" onClick={() => { setDependDeId(null); setRecherche(""); }} className="text-[12.5px] text-texte-sourd hover:text-texte">Changer</button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Laquelle ?" aria-label="Chercher la Tâche attendue"
                className="h-10 rounded-lg border border-bord-fort bg-fond px-3 text-[14px] outline-none placeholder:text-texte-faible focus:border-accent" />
              <ul className="max-h-[168px] overflow-y-auto">
                {trouvees.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setDependDeId(c.id)} className="w-full truncate rounded-md px-2 py-1.5 text-left text-[13.5px] hover:bg-surface-2">{c.titre}</button>
                  </li>
                ))}
                {trouvees.length === 0 && <li className="px-2 py-1.5 text-[13px] text-texte-faible">Aucune Tâche de ce nom.</li>}
              </ul>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button onClick={valider} disabled={!pret} className="h-10 flex-1 rounded-lg bg-bloque text-[14px] font-medium text-sur-accent disabled:opacity-50">{demande.mode === "bloquer" ? "Bloquer" : "Enregistrer"}</button>
            <Dialog.Close asChild><button className="h-10 px-3 text-sm text-texte-sourd">Annuler</button></Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
