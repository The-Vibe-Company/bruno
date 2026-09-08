"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import { libelleJour } from "@/lib/dates";
import { Initiale } from "./Carte";

export type TacheAttente = {
  id: string; titre: string; bucket: "a_trier" | "a_venir" | "idees"; transcriptionBrute: string | null;
  engagement: string | null; auteur: { nom: string } | null; assigne: { nom: string } | null;
};
type Bucket = TacheAttente["bucket"];
const LIBELLE: Record<Bucket, string> = { a_trier: "À trier", a_venir: "À venir", idees: "Idées" };

function Chevron({ ouvert }: { ouvert: boolean }) {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className={`text-texte-sourd transition-transform ${ouvert ? "rotate-90" : ""}`}><path d="M4 2l4 4-4 4" /></svg>;
}

/** Une carte à trier : le titre nettoyé, l'auteur, la transcription brute, et trois destinations. Glissable vers le kanban. */
function CarteATrier({ t, onDestination, onSupprimer }: { t: TacheAttente; onDestination: (t: TacheAttente, b: "sur_le_feu" | "a_venir" | "idees") => void; onSupprimer: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: t.id, data: { depuisPanneau: true } });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`mt-2 cursor-grab rounded-[10px] border border-bord-fort bg-surface px-3.5 py-3 shadow-md select-none ${isDragging ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2.5">
        <span className="flex-1 text-[15px]">{t.titre}</span>
        {t.auteur && <Initiale nom={t.auteur.nom} />}
      </div>
      {t.transcriptionBrute && <p className="mt-1 text-[13.5px] italic text-texte-sourd">« {t.transcriptionBrute} »</p>}
      <div className="mt-2.5 flex gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => onDestination(t, "sur_le_feu")} className="h-[30px] rounded-[5px] bg-accent px-3 text-[13px] font-medium text-sur-accent">Sur le feu</button>
        <button onClick={() => onDestination(t, "a_venir")} className="h-[30px] rounded-[5px] border border-bord-fort px-3 text-[13px]">À venir</button>
        <button onClick={() => onDestination(t, "idees")} className="h-[30px] rounded-[5px] border border-bord-fort px-3 text-[13px]">Idées</button>
        <AlertDialog.Root>
          <AlertDialog.Trigger asChild>
            <button aria-label="Supprimer" className="ml-auto flex h-[30px] w-[30px] items-center justify-center rounded-[5px] border border-bord-fort text-texte-sourd hover:text-bloque">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2l8 8M10 2l-8 8" /></svg>
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-fond-page/60" />
            <AlertDialog.Content className="fixed left-1/2 top-1/2 w-[380px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-bord bg-surface p-5 shadow-2xl outline-none">
              <AlertDialog.Title className="text-lg font-semibold tracking-tight">Supprimer cette Tâche ?</AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-[14.5px] text-texte-sourd">Elle disparaît pour de bon, sans trace. Pour une Capture ratée ou un doublon, c’est le bon geste.</AlertDialog.Description>
              <div className="mt-5 flex justify-end gap-2">
                <AlertDialog.Cancel asChild><button className="h-10 rounded-lg border border-bord-fort px-4 text-[14.5px]">Annuler</button></AlertDialog.Cancel>
                <AlertDialog.Action asChild><button onClick={() => onSupprimer(t.id)} className="h-10 rounded-lg bg-bloque px-4 text-[14.5px] font-medium text-sur-accent">Supprimer</button></AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  );
}

export function EnAttente({ taches, onDestination, onSupprimer, onOuvrir }: {
  taches: TacheAttente[];
  onDestination: (t: TacheAttente, b: "sur_le_feu" | "a_venir" | "idees") => void;
  onSupprimer: (id: string) => void; onOuvrir: (id: string) => void;
}) {
  const [ouverts, setOuverts] = useState<Record<Bucket, boolean>>({ a_trier: true, a_venir: false, idees: false });
  const par = (b: Bucket) => taches.filter((t) => t.bucket === b);
  return (
    <aside className="flex w-[380px] flex-none flex-col border-l border-bord-faible bg-surface-3">
      <header className="flex h-16 flex-none items-center px-6"><h2 className="text-[22px] font-medium tracking-tight">En attente</h2></header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6">
        {(["a_trier", "a_venir", "idees"] as Bucket[]).map((b) => (
          <section key={b}>
            <button onClick={() => setOuverts((o) => ({ ...o, [b]: !o[b] }))} className="flex h-[52px] w-full items-center gap-2.5 border-b border-bord-faible text-left">
              <Chevron ouvert={ouverts[b]} />
              <span className="flex-1 text-base font-medium">{LIBELLE[b]}</span>
              <span className={`text-sm ${b === "a_trier" && par(b).length ? "text-accent" : "text-texte-sourd"}`}>{par(b).length}</span>
            </button>
            {ouverts[b] && (b === "a_trier"
              ? par(b).map((t) => <CarteATrier key={t.id} t={t} onDestination={onDestination} onSupprimer={onSupprimer} />)
              : par(b).map((t) => (
                <button key={t.id} onClick={() => onOuvrir(t.id)} className="mt-2 flex w-full items-center gap-2.5 rounded-[10px] border border-bord-2 bg-surface px-3.5 py-2.5 text-left">
                  <span className="flex-1 text-[15px]">{t.titre}</span>
                  {t.engagement && <span className="text-[13px] text-texte-sourd">{libelleJour(t.engagement)}</span>}
                  {t.assigne && <Initiale nom={t.assigne.nom} />}
                </button>
              )))}
            {ouverts[b] && par(b).length === 0 && <p className="py-3 text-sm text-texte-faible">Rien ici.</p>}
          </section>
        ))}
      </div>
    </aside>
  );
}
