"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { aujourdhui, libelleJour, libelleLong } from "@/lib/dates";
import { RAISONS_BLOCAGE } from "./raisons-blocage";
import { Chevron, Choix } from "./Choix";
import { Initiale } from "./visuel";
import type { Statut } from "./deplacement";

export type Membre = { id: string; nom: string; avatar?: string | null };
export type Demande = { id: string; titre: string; statut: Statut } | null;

/**
 * Le droit d'entrée Sur le feu — invariant 2, le seul verrou dur de Bruno.
 * Deux champs et deux seulement, pré-remplis « moi » et « aujourd'hui », validables en un
 * tap. Ni blocage sec, ni valeur par défaut silencieuse : on voit toujours à quoi on s'engage.
 */
export function DroitEntree({ demande, membres, moiId, onConfirmer, onAnnuler }: {
  demande: Demande; membres: Membre[]; moiId: string;
  onConfirmer: (d: { id: string; titre: string; assigneId: string; engagement: string; statut: Statut; raison?: string }) => Promise<void>;
  onAnnuler: () => void;
}) {
  // Une demande sans identifiant, c'est une Tâche qui n'existe pas encore : son titre se tape ici.
  const neuve = demande?.id === "";
  const [titre, setTitre] = useState("");
  const [assigneId, setAssigneId] = useState(moiId);
  const [engagement, setEngagement] = useState(aujourdhui());
  const [occupe, setOccupe] = useState(false);
  const [raison, setRaison] = useState("");
  const ouvert = demande !== null;
  const versBloque = demande?.statut === "bloque";

  const pret = !occupe && (!versBloque || !!raison.trim()) && (!neuve || !!titre.trim());

  async function confirmer() {
    if (!demande || !pret) return;
    setOccupe(true);
    try { await onConfirmer({ id: demande.id, titre: titre.trim() || demande.titre, assigneId, engagement, statut: demande.statut, raison: versBloque ? raison.trim() : undefined }); }
    finally { setOccupe(false); setTitre(""); setAssigneId(moiId); setEngagement(aujourdhui()); setRaison(""); }
  }

  return (
    <Dialog.Root open={ouvert} onOpenChange={(o) => !o && onAnnuler()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-fond-page/70" />
        <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 flex w-[440px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-2xl border border-bord-fort bg-surface p-6 shadow-2xl outline-none">
          <div>
            <p className="text-[13px] text-accent">Passer Sur le feu</p>
            {neuve ? (
              <>
                <Dialog.Title className="sr-only">Nouvelle tâche Sur le feu</Dialog.Title>
                <input autoFocus value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Qu’est-ce qu’il y a à faire ?" aria-label="Titre"
                  onKeyDown={(e) => { if (e.key === "Enter") confirmer(); }}
                  className="mt-1.5 w-full bg-transparent text-[21px] font-medium leading-tight tracking-tight text-texte outline-none placeholder:text-texte-faible" />
              </>
            ) : (
              <Dialog.Title className="mt-1.5 text-[21px] font-medium leading-tight tracking-tight">{demande?.titre}</Dialog.Title>
            )}
          </div>
          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5 text-[13px] text-texte-sourd">
              Assigné
              <Choix valeur={assigneId} onChoisir={setAssigneId} options={membres.map((m) => ({ valeur: m.id, libelle: m.nom, pastille: <Initiale nom={m.nom} avatar={m.avatar} /> }))}>
                <button type="button" className="flex h-11 w-full items-center gap-2 rounded-lg border border-bord-fort bg-fond px-3 text-left text-[15.5px] text-texte hover:border-bord">
                  <Initiale nom={membres.find((m) => m.id === assigneId)?.nom ?? "?"} avatar={membres.find((m) => m.id === assigneId)?.avatar} />
                  <span className="flex-1">{membres.find((m) => m.id === assigneId)?.nom}</span>
                  {assigneId === moiId && <span className="text-[13px] text-texte-faible">moi</span>}
                  <Chevron />
                </button>
              </Choix>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] text-texte-sourd">
              Engagement
              <span className="flex h-11 items-center justify-between rounded-lg border border-bord-fort bg-fond px-3 text-[15.5px] text-texte">
                <span className="flex-1">{libelleLong(engagement)}</span>
                <input type="date" value={engagement} min={aujourdhui()} onChange={(e) => e.target.value && setEngagement(e.target.value)} className="w-8 bg-transparent text-transparent outline-none [color-scheme:dark]" aria-label="Choisir une date" />
                <span className="text-[13px] text-texte-faible">{libelleJour(engagement)}</span>
              </span>
            </label>
            {versBloque && (
              <label className="flex flex-col gap-1.5 text-[13px] text-texte-sourd">
                Pourquoi c’est bloqué ?
                <span className="flex flex-wrap gap-1.5">
                  {RAISONS_BLOCAGE.map((r) => (
                    <button key={r} type="button" onClick={() => setRaison(raison === r ? "" : r)} className={`h-8 rounded-md border px-2.5 text-[12.5px] ${raison === r ? "border-bloque bg-bloque-voile text-texte" : "border-bord-fort text-texte-2"}`}>{r}</button>
                  ))}
                </span>
                <input value={raison} onChange={(e) => setRaison(e.target.value)} placeholder="ou dis-le avec tes mots" aria-label="Raison du blocage" className="h-10 rounded-lg border border-bord-fort bg-fond px-3 text-[14px] text-texte outline-none focus:border-accent" />
              </label>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={confirmer} disabled={!pret} className="h-11 flex-1 rounded-lg bg-accent text-[14.5px] font-medium text-sur-accent disabled:opacity-60">Passer Sur le feu</button>
            <Dialog.Close asChild><button className="h-11 px-3 text-sm text-texte-sourd">Annuler</button></Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
