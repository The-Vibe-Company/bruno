"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import { libelleJour } from "@/lib/dates";
import { Initiale } from "./Carte";
import { poserReplie, useReplie } from "./replie";

export type TacheAttente = {
  id: string; titre: string; bucket: "a_trier" | "a_venir" | "idees"; transcriptionBrute: string | null;
  engagement: string | null; auteur: { nom: string } | null; assigne: { nom: string } | null;
};
type Bucket = TacheAttente["bucket"];
const LIBELLE: Record<Bucket, string> = { a_trier: "À trier", a_venir: "À venir", idees: "Idées" };
const BUCKETS: Bucket[] = ["a_trier", "a_venir", "idees"];

/** Une icône par Bucket, pour le rail replié : la boîte à trier, le calendrier, l'ampoule. */
function Icone({ bucket }: { bucket: Bucket }) {
  const commun = { width: 18, height: 18, viewBox: "0 0 18 18", fill: "none", stroke: "currentColor", strokeWidth: 1.5 };
  if (bucket === "a_trier") return <svg {...commun}><path d="M2 10.5h4l1.5 2h3l1.5-2h4" /><path d="M3 4.5h12l1 6v4H2v-4z" /></svg>;
  if (bucket === "a_venir") return <svg {...commun}><rect x="2" y="3.5" width="14" height="12" rx="2" /><path d="M2 7.5h14M6 1.5v4M12 1.5v4" /></svg>;
  return <svg {...commun}><path d="M6.5 13.5h5M7.5 16h3" /><path d="M9 2a4.5 4.5 0 0 0-2.5 8.2c.6.5 1 1 1 1.8h3c0-.8.4-1.3 1-1.8A4.5 4.5 0 0 0 9 2z" /></svg>;
}

function Bascule({ replie, onClick }: { replie: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={replie ? "Déplier En attente" : "Replier En attente"} className="flex h-8 w-8 items-center justify-center rounded-md text-texte-sourd hover:bg-surface-2 hover:text-texte">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className={replie ? "rotate-180" : ""}><path d="M4 2l5 5-5 5" /><path d="M10 2v10" /></svg>
    </button>
  );
}

function Chevron({ ouvert }: { ouvert: boolean }) {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className={`text-texte-sourd transition-transform ${ouvert ? "rotate-90" : ""}`}><path d="M4 2l4 4-4 4" /></svg>;
}

/** Une carte à trier : le titre nettoyé, l'auteur, la transcription brute, et trois destinations. Glissable vers le kanban. */
function CarteATrier({ t, onDestination, onSupprimer }: { t: TacheAttente; onDestination: (t: TacheAttente, b: "sur_le_feu" | "a_venir" | "idees") => void; onSupprimer: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: t.id, data: { depuisPanneau: true } });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`mt-1.5 cursor-grab rounded-lg border border-bord-fort bg-surface px-3 py-2.5 shadow-md select-none ${isDragging ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[13.5px]">{t.titre}</span>
        {t.auteur && <Initiale nom={t.auteur.nom} />}
      </div>
      {t.transcriptionBrute && <p className="mt-0.5 text-[12px] italic text-texte-sourd">« {t.transcriptionBrute} »</p>}
      <div className="mt-2 flex gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => onDestination(t, "sur_le_feu")} className="h-[26px] rounded-[5px] bg-accent px-2.5 text-[12px] font-medium text-sur-accent">Sur le feu</button>
        <button onClick={() => onDestination(t, "a_venir")} className="h-[26px] rounded-[5px] border border-bord-fort px-2.5 text-[12px]">À venir</button>
        <button onClick={() => onDestination(t, "idees")} className="h-[26px] rounded-[5px] border border-bord-fort px-2.5 text-[12px]">Idées</button>
        <AlertDialog.Root>
          <AlertDialog.Trigger asChild>
            <button aria-label="Supprimer" className="ml-auto flex h-[26px] w-[26px] items-center justify-center rounded-[5px] border border-bord-fort text-texte-sourd hover:text-bloque">
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
  const replie = useReplie();
  const par = (b: Bucket) => taches.filter((t) => t.bucket === b);

  // Replié : un rail, trois onglets — l'icône et le nombre. Un clic déplie sur la section voulue.
  if (replie) {
    return (
      <aside className="flex w-14 flex-none flex-col items-center gap-1 border-l border-bord-faible bg-surface-3 py-4">
        <Bascule replie onClick={() => poserReplie(false)} />
        {BUCKETS.map((b) => (
          <button key={b} onClick={() => { setOuverts((o) => ({ ...o, [b]: true })); poserReplie(false); }} aria-label={`${LIBELLE[b]} · ${par(b).length}`} title={LIBELLE[b]}
            className="mt-2 flex w-12 flex-col items-center gap-1 rounded-md py-2 text-texte-sourd hover:bg-surface-2 hover:text-texte">
            <Icone bucket={b} />
            <span className={`text-[12.5px] font-medium tabular-nums ${b === "a_trier" && par(b).length ? "text-accent" : ""}`}>{par(b).length}</span>
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside className="flex w-[320px] flex-none flex-col border-l border-bord-faible bg-surface-3">
      <header className="flex h-12 flex-none items-center pl-5 pr-3"><h2 className="flex-1 text-[17px] font-medium tracking-tight">En attente</h2><Bascule replie={false} onClick={() => poserReplie(true)} /></header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
        {BUCKETS.map((b) => (
          <section key={b}>
            <button onClick={() => setOuverts((o) => ({ ...o, [b]: !o[b] }))} className="flex h-10 w-full items-center gap-2 border-b border-bord-faible text-left">
              <Chevron ouvert={ouverts[b]} />
              <span className="flex-1 text-[14px] font-medium">{LIBELLE[b]}</span>
              <span className={`text-xs ${b === "a_trier" && par(b).length ? "text-accent" : "text-texte-sourd"}`}>{par(b).length}</span>
            </button>
            {ouverts[b] && (b === "a_trier"
              ? par(b).map((t) => <CarteATrier key={t.id} t={t} onDestination={onDestination} onSupprimer={onSupprimer} />)
              : par(b).map((t) => (
                <button key={t.id} onClick={() => onOuvrir(t.id)} className="mt-1.5 flex w-full items-center gap-2 rounded-lg border border-bord-2 bg-surface px-3 py-2 text-left">
                  <span className="flex-1 text-[13.5px]">{t.titre}</span>
                  {t.engagement && <span className="text-[12px] text-texte-sourd">{libelleJour(t.engagement)}</span>}
                  {t.assigne && <Initiale nom={t.assigne.nom} />}
                </button>
              )))}
            {ouverts[b] && par(b).length === 0 && <p className="py-2.5 text-[13px] text-texte-faible">Rien ici.</p>}
          </section>
        ))}
      </div>
    </aside>
  );
}
