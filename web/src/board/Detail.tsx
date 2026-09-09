"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { libelleJour } from "@/lib/dates";
import type { Patch } from "./api";
import type { Membre, TacheCarte } from "./Carte";
import { Initiale, Reporte } from "./visuel";
import type { Statut } from "./deplacement";

const STATUT: Record<Statut, string> = { a_faire: "À faire", en_cours: "En cours", bloque: "Bloqué" };
const PASTILLE: Record<Statut, string> = { a_faire: "border-accent/40 bg-a-faire-voile text-accent", en_cours: "border-en-cours/40 bg-en-cours-voile text-en-cours", bloque: "border-bloque/40 bg-bloque-voile text-bloque" };

type Props = {
  tache: TacheCarte | null; membres: Membre[]; onFermer: () => void;
  onTerminer: (id: string) => Promise<void>; onAbandonner: (id: string) => Promise<void>; onSupprimer: (id: string) => Promise<void>;
  onReporter: (t: TacheCarte) => void; onRaison: (t: TacheCarte) => void; onModifier: (id: string, patch: Patch) => Promise<void>;
};

/**
 * Le détail d'une Tâche, en panneau latéral, sans quitter le Board — on trie en rafale. Tout ce
 * qui se modifie librement se modifie ici : le titre, l'Assigné, les Aidants, les Notes. Pas
 * l'Engagement Sur le feu, qui ne bouge que par un Report (invariant 4). Les trois fins vivent
 * en bas : Terminé en primaire, Abandonner à côté, Supprimer à l'écart et derrière une confirmation.
 */
export function Detail(props: Props) {
  const { tache, onFermer } = props;
  return (
    <Dialog.Root open={tache !== null} onOpenChange={(o) => !o && onFermer()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-fond-page/60" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 right-0 flex w-[440px] max-w-full flex-col border-l border-bord-2 bg-fond shadow-2xl outline-none">
          {tache && <Fiche key={tache.id} {...props} tache={tache} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Fiche({ tache, membres, onFermer, onTerminer, onAbandonner, onSupprimer, onReporter, onRaison, onModifier }: Props & { tache: TacheCarte }) {
  const [occupe, setOccupe] = useState(false);
  const [titre, setTitre] = useState(tache.titre);
  const [notes, setNotes] = useState(tache.notes ?? "");
  type Report = { id: string; raison: string; ancienEngagement: string; nouvelEngagement: string; createdAt: string; auteur: string | null };
  // L'historique des Reports, chargé à l'ouverture : visible de tous, avec qui et pourquoi.
  const [historique, setHistorique] = useState<Report[] | null>(null);
  useEffect(() => {
    if (tache.reportsCount === 0) return;
    let vivant = true;
    fetch(`/api/taches/${tache.id}/reports`).then((r) => r.json()).then((liste: Report[]) => { if (vivant) setHistorique(liste); }).catch(() => {});
    return () => { vivant = false; };
  }, [tache.id, tache.reportsCount]);

  const agir = (fn: (id: string) => Promise<void>) => async () => {
    setOccupe(true);
    try { await fn(tache.id); onFermer(); } finally { setOccupe(false); }
  };
  const poserTitre = () => { const t = titre.trim(); if (t && t !== tache.titre) onModifier(tache.id, { titre: t }); else setTitre(tache.titre); };
  const poserNotes = () => { const n = notes.trim(); if (n !== (tache.notes ?? "")) onModifier(tache.id, { notes: n || null }); };
  const basculerAidant = (id: string) => onModifier(tache.id, { aidantIds: tache.aidantIds.includes(id) ? tache.aidantIds.filter((x) => x !== id) : [...tache.aidantIds, id] });

  const ligne = "flex min-h-[46px] items-center gap-3 px-3.5 border-b border-bord-2 last:border-b-0";
  return (
    <>
      <header className="flex items-center justify-between px-6 pt-5 pb-3">
        <span className="text-[13px] text-texte-sourd">Sur le feu · {STATUT[tache.statut]}</span>
        <AlertDialog.Root>
          <AlertDialog.Trigger asChild>
            <button className="text-[13px] text-texte-sourd hover:text-bloque" disabled={occupe}>Supprimer</button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-fond-page/60" />
            <AlertDialog.Content className="fixed left-1/2 top-1/2 w-[380px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-bord bg-surface p-5 shadow-2xl outline-none">
              <AlertDialog.Title className="text-lg font-semibold tracking-tight">Supprimer cette Tâche ?</AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-[14.5px] text-texte-sourd">
                Elle disparaît pour de bon, sans trace. Si vous avez décidé de ne pas la faire, préférez « Abandonner » : ça reste consultable.
              </AlertDialog.Description>
              <div className="mt-5 flex justify-end gap-2">
                <AlertDialog.Cancel asChild><button className="h-10 rounded-lg border border-bord-fort px-4 text-[14.5px]">Annuler</button></AlertDialog.Cancel>
                <AlertDialog.Action asChild><button onClick={agir(onSupprimer)} className="h-10 rounded-lg bg-bloque px-4 text-[14.5px] font-medium text-sur-accent">Supprimer</button></AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-4">
        <div>
          <Dialog.Title className="sr-only">{tache.titre}</Dialog.Title>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} onBlur={poserTitre} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setTitre(tache.titre); e.currentTarget.blur(); } }}
            aria-label="Titre" className="-mx-1 w-[calc(100%+0.5rem)] rounded-md border border-transparent bg-transparent px-1 text-2xl font-semibold leading-tight tracking-tight outline-none hover:border-bord-faible focus:border-accent" />
          <p className="mt-1.5 text-sm text-texte-sourd">
            {STATUT[tache.statut]}
            {tache.reportsCount > 0 && <> · <Reporte n={tache.reportsCount} /></>}
          </p>
        </div>

        <dl className="overflow-hidden rounded-xl border border-bord bg-surface text-[15px]">
          <div className={ligne}>
            <dt className="w-24 text-sm text-texte-sourd">Assigné</dt>
            <dd className="flex flex-1 items-center gap-2">
              <Initiale nom={tache.assigne?.nom ?? "?"} />
              <select value={tache.assigneId ?? ""} onChange={(e) => e.target.value && onModifier(tache.id, { assigneId: e.target.value })} aria-label="Assigné"
                className="-ml-1 flex-1 appearance-none rounded-md border border-transparent bg-transparent px-1 py-1 outline-none hover:border-bord-faible focus:border-accent">
                {!tache.assigneId && <option value="">personne</option>}
                {membres.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            </dd>
          </div>
          <div className={ligne}>
            <dt className="w-24 text-sm text-texte-sourd">Aidants</dt>
            <dd className="flex flex-1 flex-wrap gap-1.5 py-2">
              {membres.filter((m) => m.id !== tache.assigneId).map((m) => {
                const aide = tache.aidantIds.includes(m.id);
                return (
                  <button key={m.id} aria-pressed={aide} onClick={() => basculerAidant(m.id)}
                    className={`flex h-7 items-center gap-1.5 rounded-full border pl-0.5 pr-2.5 text-[13px] ${aide ? "border-accent/50 bg-accent-voile text-texte" : "border-bord-faible text-texte-sourd hover:text-texte"}`}>
                    <Initiale nom={m.nom} />{m.nom}
                  </button>
                );
              })}
              {membres.filter((m) => m.id !== tache.assigneId).length === 0 && <span className="text-texte-faible">—</span>}
            </dd>
          </div>
          <div className={ligne}>
            <dt className="w-24 text-sm text-texte-sourd">Engagement</dt>
            <dd className="flex flex-1 items-center gap-2">
              {tache.engagement ? libelleJour(tache.engagement) : "—"}
              {tache.engagement && <button onClick={() => onReporter(tache)} className="ml-auto text-[12.5px] text-texte-sourd hover:text-texte">reporter</button>}
            </dd>
          </div>
          <div className={ligne}>
            <dt className="w-24 text-sm text-texte-sourd">Statut</dt>
            <dd className="flex flex-1 items-center gap-2">
              <span className={`rounded-md border px-2 py-0.5 text-[13px] font-medium ${PASTILLE[tache.statut]}`}>{STATUT[tache.statut]}</span>
            </dd>
          </div>
          {tache.statut === "bloque" && (
            <div className={ligne}>
              <dt className="w-24 text-sm text-texte-sourd">Raison</dt>
              <dd className="flex flex-1 items-center gap-2">
                <span className={tache.raisonBlocage ? "" : "italic text-texte-faible"}>{tache.raisonBlocage ?? "à préciser"}</span>
                <button onClick={() => onRaison(tache)} className="ml-auto text-[12.5px] text-texte-sourd hover:text-texte">changer</button>
              </dd>
            </div>
          )}
          <div className={ligne}>
            <dt className="w-24 text-sm text-texte-sourd">Reports</dt>
            <dd className="flex-1">{tache.reportsCount}</dd>
          </div>
        </dl>

        {historique && historique.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm text-texte-sourd">Reports</h3>
            <ol className="flex flex-col gap-1.5 rounded-xl border border-bord bg-surface px-3.5 py-3 text-[14px]">
              {historique.map((h) => (
                <li key={h.id} className="flex items-baseline gap-2">
                  <span className="flex-1">« {h.raison} »</span>
                  <span className="whitespace-nowrap text-[12.5px] text-texte-sourd">{libelleJour(h.ancienEngagement)} → {libelleJour(h.nouvelEngagement)}{h.auteur ? ` · ${h.auteur}` : ""}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm text-texte-sourd">Notes</h3>
          <div className="rounded-xl border border-bord bg-surface px-3.5 py-3 text-[15px] leading-relaxed">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={poserNotes} rows={notes ? Math.min(8, notes.split("\n").length + 1) : 2} placeholder="Une note, un contexte, un lien…" aria-label="Notes"
              className="w-full resize-none bg-transparent outline-none placeholder:text-texte-faible" />
            {tache.transcriptionBrute && (
              <>
                <hr className="my-3 border-bord-2" />
                <p className="text-sm italic text-texte-sourd">« {tache.transcriptionBrute} »</p>
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="flex flex-col gap-2 border-t border-bord-faible px-6 pt-4 pb-6">
        <button onClick={agir(onTerminer)} disabled={occupe} className="h-[46px] rounded-lg bg-accent text-[14.5px] font-medium text-sur-accent disabled:opacity-60">Terminé</button>
        <div className="flex gap-2">
          <button onClick={() => onReporter(tache)} disabled={occupe || !tache.engagement} title={tache.engagement ? undefined : "Rien à reporter : cette Tâche n’a pas d’Engagement"} className="h-[42px] flex-1 rounded-lg border border-bord-fort text-[14.5px] disabled:opacity-50">Reporter</button>
          <button onClick={agir(onAbandonner)} disabled={occupe} className="h-[42px] flex-1 rounded-lg border border-bord-fort text-[14.5px] disabled:opacity-60">Abandonner</button>
        </div>
      </footer>
    </>
  );
}
