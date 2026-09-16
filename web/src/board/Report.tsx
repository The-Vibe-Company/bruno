"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { aujourdhui, demain, libelleJour, libelleReport, lundiProchain } from "@/lib/dates";
import { Calendrier, IconeCalendrier } from "./Calendrier";

export type DemandeReport = { id: string; titre: string; reportsCount: number } | null;
const RAISONS = ["pas eu le temps", "bloqué par quelqu’un", "plus prioritaire"];

/**
 * Reporter — le seul chemin qui déplace un Engagement Sur le feu, et il exige une raison
 * (règle 8) : sans raison ce serait un bouton snooze, et un snooze est un trou noir.
 * « Demain » est pré-sélectionné (règle 9), et Abandonner est proposé juste en dessous
 * (règle 10) : la moitié des Tâches reportées cinq fois ne devraient pas exister.
 */
export function Report({ demande, onReporter, onAbandonner, onAnnuler }: {
  demande: DemandeReport;
  onReporter: (id: string, corps: { raison: string; nouvelEngagement: string }) => Promise<void>;
  onAbandonner: (id: string) => Promise<void>;
  onAnnuler: () => void;
}) {
  const [raison, setRaison] = useState("");
  const [quand, setQuand] = useState<string>(demain());
  const [occupe, setOccupe] = useState(false);
  const pret = raison.trim().length > 0 && !occupe;
  const reinit = () => { setRaison(""); setQuand(demain()); };

  async function valider() {
    if (!demande || !pret) return;
    setOccupe(true);
    try { await onReporter(demande.id, { raison: raison.trim(), nouvelEngagement: quand }); reinit(); }
    finally { setOccupe(false); }
  }
  async function abandonner() {
    if (!demande) return;
    setOccupe(true);
    try { await onAbandonner(demande.id); reinit(); } finally { setOccupe(false); }
  }

  const estRapide = (r: string) => raison.trim() === r;
  const choixDate = [
    { valeur: demain(), libelle: "demain", sous: libelleCourt(demain()) },
    { valeur: lundiProchain(), libelle: "lundi", sous: libelleCourt(lundiProchain()) },
  ];
  const autre = !choixDate.some((c) => c.valeur === quand);

  return (
    <Dialog.Root open={demande !== null} onOpenChange={(o) => { if (!o) { reinit(); onAnnuler(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="anime-voile fixed inset-0 bg-fond-page/70" />
        <Dialog.Content aria-describedby={undefined} className="anime-boite fixed left-1/2 top-1/2 flex w-[440px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-2xl border border-bord-fort bg-surface p-6 shadow-2xl outline-none">
          <div>
            <Dialog.Title className="text-[22px] font-semibold tracking-tight">Reporter</Dialog.Title>
            <p className="mt-1 text-sm text-texte-sourd">
              {demande?.titre}{demande && demande.reportsCount > 0 && <> · déjà reporté {demande.reportsCount}×</>}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="text-sm text-texte-sourd">Pourquoi ?</p>
            <div className="flex flex-wrap gap-1.5">
              {RAISONS.map((r) => (
                <button key={r} type="button" onClick={() => setRaison(estRapide(r) ? "" : r)}
                  className={`min-h-[42px] rounded-[10px] border px-3.5 text-[15px] ${estRapide(r) ? "border-accent bg-accent-voile" : "border-bord-fort text-texte-2"}`}>
                  {r}
                </button>
              ))}
            </div>
            <input value={raison} onChange={(e) => setRaison(e.target.value)} placeholder="ou dis-le avec tes mots" aria-label="Raison"
              className="h-12 rounded-xl border border-bord-fort bg-fond px-3.5 text-[15.5px] outline-none placeholder:text-texte-faible focus:border-accent" />
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="text-sm text-texte-sourd">Nouvel Engagement</p>
            <div className="flex gap-2">
              {choixDate.map((c) => (
                <button key={c.valeur} type="button" onClick={() => setQuand(c.valeur)}
                  className={`flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border text-[15.5px] font-medium ${quand === c.valeur ? "border-accent bg-accent-voile" : "border-bord-fort"}`}>
                  {c.libelle}<span className="text-[12.5px] font-normal text-texte-sourd">{c.sous}</span>
                </button>
              ))}
              <Calendrier valeur={autre ? quand : null} min={aujourdhui()} onChoisir={setQuand} align="end">
                <button type="button" aria-label="Autre date"
                  className={`flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border text-[15.5px] font-medium ${autre ? "border-accent bg-accent-voile" : "border-bord-fort hover:border-accent"}`}>
                  <span className="flex items-center gap-1.5">autre<IconeCalendrier /></span>
                  {autre && <span className="text-[12.5px] font-normal text-texte-sourd">{libelleCourt(quand)}</span>}
                </button>
              </Calendrier>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={valider} disabled={!pret} className="h-[52px] rounded-xl bg-accent text-base font-medium text-sur-accent disabled:opacity-50">
              {libelleReport(quand)}
            </button>
            <button onClick={abandonner} disabled={occupe} className="h-12 rounded-xl border border-bord-fort text-base disabled:opacity-60">Abandonner cette Tâche</button>
            <Dialog.Close asChild><button className="h-10 text-sm text-texte-sourd">Annuler</button></Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** « mardi 8 » ou « 14 sept. » selon la distance — ce que montre la maquette. */
function libelleCourt(jour: string): string {
  const l = libelleJour(jour);
  if (l === "demain" || l === "aujourd'hui") return new Date(jour + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", timeZone: "UTC" });
  return l;
}
