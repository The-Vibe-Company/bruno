"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { libelleBlocage, libelleJour } from "@/lib/dates";
import { Calendrier, IconeCalendrier } from "./Calendrier";
import type { Patch } from "./api";
import type { Membre, TacheCarte } from "./Carte";
import { Chevron, Choix } from "./Choix";
import { Initiale, Reporte } from "./visuel";
import type { Statut } from "./deplacement";

const STATUT: Record<Statut, string> = { a_faire: "À faire", en_cours: "En cours", bloque: "Bloqué" };
const PASTILLE: Record<Statut, string> = { a_faire: "border-accent/40 bg-a-faire-voile text-texte", en_cours: "border-en-cours/40 bg-en-cours-voile text-texte", bloque: "border-bloque/40 bg-bloque-voile text-texte" };
const POINT: Record<Statut, string> = { a_faire: "bg-accent", en_cours: "bg-en-cours", bloque: "bg-bloque" };

/** Une Tâche telle que la fiche la montre — Sur le feu ou non : sans Statut, une Idée en a une aussi. */
export type TacheFiche = Omit<TacheCarte, "statut"> & {
  statut: Statut | null;
  bucket: "sur_le_feu" | "a_trier" | "a_venir" | "idees";
  /** Finie : elle a quitté le Board, mais elle garde ses Notes, ses Aidants et ses Reports. */
  fin?: { etat: "termine" | "abandonne"; jour: string } | null;
};

const BUCKET: Record<TacheFiche["bucket"], string> = { sur_le_feu: "Sur le feu", a_trier: "À trier", a_venir: "À venir", idees: "Idées" };

type Props = {
  tache: TacheFiche | null; membres: Membre[]; onFermer: () => void;
  onTerminer: (id: string) => Promise<void>; onAbandonner: (id: string) => Promise<void>; onSupprimer: (id: string) => Promise<void>;
  onModifier: (id: string, patch: Patch) => Promise<void>;
  /** Sur le feu seulement — une Tâche finie ou rangée ailleurs n'a ni Report ni Statut. */
  onReporter?: (t: TacheFiche) => void; onRaison?: (t: TacheFiche) => void; onStatut?: (t: TacheFiche, statut: Statut) => void;
  /** Une Tâche finie : la seule action qui lui reste. */
  onRouvrir?: (id: string) => Promise<void>;
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
        <Dialog.Overlay className="anime-voile fixed inset-0 bg-fond-page/60" />
        <Dialog.Content aria-describedby={undefined} className="anime-panneau fixed inset-y-0 right-0 flex w-[440px] max-w-full flex-col border-l border-bord-2 bg-fond shadow-2xl outline-none">
          {tache && <Fiche key={tache.id} {...props} tache={tache} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Fiche({ tache, membres, onFermer, onTerminer, onAbandonner, onSupprimer, onReporter, onRaison, onModifier, onStatut, onRouvrir }: Props & { tache: TacheFiche }) {
  // Hors Sur le feu, il n'y a ni Statut ni Report : l'Engagement se pose et se retire librement.
  // Finie, il ne reste qu'à lire — et à rouvrir si c'était une erreur.
  const finie = !!tache.fin;
  const surLeFeu = tache.bucket === "sur_le_feu" && !finie;
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
  // Ce qui est déjà parti au serveur : on ne renvoie pas deux fois la même chose, et on n'oublie
  // rien non plus. Sans ça, Échap fermait la fiche et la note tapée était perdue.
  const posees = useRef({ titre: tache.titre, notes: tache.notes ?? "" });
  const poserTitre = () => {
    const t = titre.trim();
    if (t && t !== posees.current.titre) { posees.current.titre = t; onModifier(tache.id, { titre: t }); }
    else if (!t) setTitre(posees.current.titre);
  };
  const poserNotes = () => {
    const n = notes.trim();
    if (n !== posees.current.notes) { posees.current.notes = n; onModifier(tache.id, { notes: n || null }); }
  };
  // À la fermeture — Échap, clic à côté, croix — on pose ce qui n'a pas encore été posé.
  const sauver = useRef(() => {});
  useEffect(() => { sauver.current = () => { poserTitre(); poserNotes(); }; });
  useEffect(() => () => sauver.current(), []);
  /** Changer d'Assigné ne touche pas aux Aidants — sauf que le nouvel Assigné, s'il aidait, cesse d'aider. */
  const assigner = (assigneId: string) => onModifier(tache.id, { assigneId, ...(tache.aidantIds.includes(assigneId) ? { aidantIds: tache.aidantIds.filter((x) => x !== assigneId) } : {}) });
  const candidats = membres.filter((m) => m.id !== tache.assigneId && !tache.aidantIds.includes(m.id));

  const ligne = "flex min-h-7 items-center gap-3";
  const libelle = "w-24 flex-none text-sm text-texte-sourd";
  return (
    <>
      <header className="flex items-center justify-between px-6 pt-5 pb-3">
        <span className="text-[13px] text-texte-sourd">
          {tache.fin ? `${tache.fin.etat === "termine" ? "Terminé" : "Abandonné"} · ${libelleJour(tache.fin.jour)}` : `${BUCKET[tache.bucket]}${surLeFeu && tache.statut ? ` · ${STATUT[tache.statut]}` : ""}`}
        </span>
        <AlertDialog.Root>
          <AlertDialog.Trigger asChild>
            <button className="text-[13px] text-texte-sourd hover:text-bloque" disabled={occupe}>Supprimer</button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="anime-voile fixed inset-0 bg-fond-page/60" />
            <AlertDialog.Content className="anime-boite fixed left-1/2 top-1/2 w-[380px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-bord bg-surface p-5 shadow-2xl outline-none">
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
            {tache.fin ? (tache.fin.etat === "termine" ? "Terminé" : "Abandonné") : BUCKET[tache.bucket]}
            {tache.reportsCount > 0 && <> · <Reporte n={tache.reportsCount} /></>}
          </p>
        </div>

        {/* Les propriétés, en clair : un libellé, une valeur, rien autour — la même fiche que sur l'iPhone. */}
        <dl className="flex flex-col gap-3.5 text-[15px]">
          <div className={ligne}>
            <dt className={libelle}>Assigné</dt>
            <dd className="flex flex-1 items-center gap-2">
              <Choix valeur={tache.assigneId} onChoisir={assigner} titre="Assigner à" options={membres.map((m) => ({ valeur: m.id, libelle: m.nom, pastille: <Initiale nom={m.nom} avatar={m.avatar} /> }))}>
                <button aria-label="Assigné" className="-ml-1 flex h-7 items-center gap-2 rounded-md px-1 text-texte hover:bg-surface-2">
                  <Initiale nom={tache.assigne?.nom ?? "?"} avatar={tache.assigne?.avatar} />{tache.assigne?.nom ?? <span className="text-texte-faible">personne</span>}<Chevron />
                </button>
              </Choix>
            </dd>
          </div>
          <div className={ligne}>
            <dt className={libelle}>Aidants</dt>
            <dd className="flex flex-1 flex-wrap items-center gap-1.5">
              {tache.aidantIds.map((id) => { const m = membres.find((x) => x.id === id); return m && (
                <span key={id} className="flex h-7 items-center gap-1.5 rounded-full border border-bord bg-surface pl-0.5 pr-1 text-[13px]">
                  <Initiale nom={m.nom} avatar={m.avatar} />{m.nom}
                  <button onClick={() => onModifier(tache.id, { aidantIds: tache.aidantIds.filter((x) => x !== id) })} aria-label={`Retirer ${m.nom}`} className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-texte-faible hover:text-texte">
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 2l6 6M8 2l-6 6" /></svg>
                  </button>
                </span>
              ); })}
              {candidats.length > 0 && (
                <Choix valeur={null} onChoisir={(id) => onModifier(tache.id, { aidantIds: [...tache.aidantIds, id] })} titre="Ajouter un Aidant" options={candidats.map((m) => ({ valeur: m.id, libelle: m.nom, pastille: <Initiale nom={m.nom} avatar={m.avatar} /> }))}>
                  <button aria-label="Ajouter un Aidant" className="flex h-7 w-7 items-center justify-center rounded-full border border-bord-fort text-texte-sourd hover:text-texte">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 1.5v9M1.5 6h9" /></svg>
                  </button>
                </Choix>
              )}
              {candidats.length === 0 && tache.aidantIds.length === 0 && <span className="text-texte-faible">—</span>}
            </dd>
          </div>
          <div className={ligne}>
            <dt className={libelle}>Engagement</dt>
            <dd className="flex flex-1 items-center gap-2">
              {finie ? (
                <>{tache.engagement ? libelleJour(tache.engagement) : "—"}</>
              ) : surLeFeu ? (
                <>
                  {tache.engagement ? libelleJour(tache.engagement) : "—"}
                  {tache.engagement && <button onClick={() => onReporter?.(tache)} className="text-[12.5px] text-texte-sourd hover:text-texte">Reporter</button>}
                </>
              ) : (
                <>
                  <Calendrier valeur={tache.engagement} onChoisir={(jour) => onModifier(tache.id, { engagement: jour })}
                    onEffacer={tache.engagement ? () => onModifier(tache.id, { engagement: null }) : undefined}>
                    <button type="button" aria-label="Engagement" className="flex h-7 items-center gap-1.5 rounded-md px-1.5 hover:bg-surface-2">
                      <IconeCalendrier />
                      <span className={tache.engagement ? "" : "text-texte-faible"}>{tache.engagement ? libelleJour(tache.engagement) : "quand ?"}</span>
                    </button>
                  </Calendrier>
                </>
              )}
            </dd>
          </div>
          {(surLeFeu || finie) && (<>
          {surLeFeu && tache.statut && <div className={ligne}>
            <dt className={libelle}>Statut</dt>
            <dd className="flex flex-1 items-center gap-2">
              <Choix valeur={tache.statut} onChoisir={(v) => onStatut?.(tache, v as Statut)} titre="Statut"
                options={(["a_faire", "en_cours", "bloque"] as Statut[]).map((s) => ({ valeur: s, libelle: s === "bloque" ? "Bloqué…" : STATUT[s], pastille: <span className={`h-[7px] w-[7px] rounded-full ${POINT[s]}`} /> }))}>
                <button aria-label="Statut" className={`flex h-7 items-center gap-1.5 rounded-full border pl-2.5 pr-2 text-[13px] font-medium ${PASTILLE[tache.statut]}`}>
                  <span className={`h-[7px] w-[7px] rounded-full ${POINT[tache.statut]}`} />{STATUT[tache.statut]}<Chevron />
                </button>
              </Choix>
              {tache.statut === "bloque" && (<>
                <button onClick={() => onRaison?.(tache)} className={`truncate text-[13.5px] ${tache.raisonBlocage ? "text-bloque" : "italic text-texte-faible"}`} title="Changer la raison">{tache.raisonBlocage ?? "raison à préciser"}</button>
                {/* Depuis quand elle attend : c'est ce qui compte, plus que le jour où on l'a bloquée. */}
                {tache.bloqueLe && <span className="flex-none text-[12.5px] text-texte-sourd">{libelleBlocage(tache.bloqueLe)}</span>}
              </>)}
            </dd>
          </div>}
          <div className={ligne}>
            <dt className={libelle}>Reports</dt>
            <dd className="flex-1">{tache.reportsCount}</dd>
          </div>
          </>)}
        </dl>

        <hr className="border-bord-2" />

        {/* Puis du texte, directement — comme une page. */}
        <div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={poserNotes} rows={Math.max(4, Math.min(14, notes.split("\n").length + 1))} placeholder="Une note, un contexte, un lien…" aria-label="Notes"
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-texte-faible" />
          {tache.transcriptionBrute && <p className="mt-1 text-sm italic leading-relaxed text-texte-sourd">« {tache.transcriptionBrute} »</p>}
        </div>

        {historique && historique.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm text-texte-sourd">Reports</h3>
            <ol className="flex flex-col gap-1.5 text-[14px]">
              {historique.map((h) => (
                <li key={h.id} className="flex items-baseline gap-2">
                  <span className="flex-1">« {h.raison} »</span>
                  <span className="whitespace-nowrap text-[12.5px] text-texte-sourd">{libelleJour(h.ancienEngagement)} → {libelleJour(h.nouvelEngagement)} · {h.auteur ?? "Bruno"}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-2 border-t border-bord-faible px-6 pt-4 pb-6">
        {finie ? (
          <button onClick={agir(onRouvrir ?? (async () => {}))} disabled={occupe || !onRouvrir} className="h-[46px] rounded-lg border border-bord-fort text-[14.5px] font-medium disabled:opacity-60">Rouvrir</button>
        ) : (
          <>
            <button onClick={agir(onTerminer)} disabled={occupe} className="h-[46px] rounded-lg bg-accent text-[14.5px] font-medium text-sur-accent disabled:opacity-60">Terminé</button>
            <div className="flex gap-2">
              {surLeFeu && <button onClick={() => onReporter?.(tache)} disabled={occupe || !tache.engagement} title={tache.engagement ? undefined : "Rien à reporter : cette Tâche n’a pas d’Engagement"} className="h-[42px] flex-1 rounded-lg border border-bord-fort text-[14.5px] disabled:opacity-50">Reporter</button>}
              <button onClick={agir(onAbandonner)} disabled={occupe} className="h-[42px] flex-1 rounded-lg border border-bord-fort text-[14.5px] disabled:opacity-60">Abandonner</button>
            </div>
          </>
        )}
      </footer>
    </>
  );
}
