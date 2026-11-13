"use client";
import * as Dialog from "@radix-ui/react-dialog";
import type { Evenement } from "@/api/contrat";
import { ajouterJours, heureDe, jourDe } from "@/agenda/periode";
import { Initiale } from "@/board/visuel";

/** D'où vient une réunion : la personne, et lequel de ses agendas. */
export type Source = { qui: string; avatar: string | null; agenda: string; origine: "google" | "outlook" | "autre" };

const OUVRIR: Record<Source["origine"], string> = { google: "Ouvrir dans Google Agenda", outlook: "Ouvrir dans Outlook", autre: "Ouvrir l’original" };

/**
 * Une réunion en grand. Le bloc de la grille n'a la place que pour un titre ; au clic, tout ce que
 * l'agenda en dit : quand, où, avec qui, le lien de visio, et la description.
 */
export function Fiche({ e, couleur, source, children }: { e: Evenement; couleur: string; source?: Source; children: React.ReactNode }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="anime-voile fixed inset-0 z-40 bg-fond-page/70" />
        <Dialog.Content aria-describedby={undefined}
          className="anime-boite fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-3rem)] w-[560px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-2xl border border-bord-fort bg-surface p-6 shadow-2xl outline-none">
          <div className="flex items-start gap-3">
            <span className="mt-2 h-3 w-3 flex-none rounded-full" style={{ background: couleur }} />
            <div className="min-w-0 flex-1">
              <Dialog.Title className="break-words text-[22px] font-semibold leading-snug tracking-tight">{e.titre}</Dialog.Title>
              <p className="mt-1 text-[14.5px] text-texte-2">{quand(e)}</p>
            </div>
            <Dialog.Close aria-label="Fermer" className="-mr-2 -mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-md text-texte-sourd hover:bg-surface-2 hover:text-texte">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><path d="M3 3l8 8M11 3l-8 8" /></svg>
            </Dialog.Close>
          </div>

          {e.visio && (
            <a href={e.visio} target="_blank" rel="noreferrer"
              className="flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-accent px-4 text-[14px] font-medium text-sur-accent hover:bg-accent-survol">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden><rect x="1.5" y="4" width="9" height="8" rx="1.5" /><path d="M10.5 7l4-2.5v7l-4-2.5z" /></svg>
              Rejoindre la visio
            </a>
          )}

          <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-[14px]">
            {source && (
              <Ligne titre="Agenda de">
                <span className="flex items-center gap-2">
                  <Initiale nom={source.qui} avatar={source.avatar} grande />
                  <span>{source.qui}</span>
                  <span className="truncate text-texte-faible">· {source.agenda}</span>
                </span>
              </Ligne>
            )}
            {e.lieu && <Ligne titre="Lieu"><span className="break-words">{e.lieu}</span></Ligne>}
            {e.participants.length > 0 && (
              <Ligne titre={`Invités · ${e.participants.length}`}>
                <ul className="flex flex-col gap-1">
                  {e.participants.map((p, i) => <li key={`${p}-${i}`} className="truncate">{p}</li>)}
                </ul>
              </Ligne>
            )}
          </dl>

          {e.description && (
            <div className="whitespace-pre-wrap break-words rounded-lg border border-bord-2 bg-fond px-4 py-3 text-[14px] leading-relaxed text-texte-2">
              {e.description}
            </div>
          )}

          {e.lien && (
            <a href={e.lien} target="_blank" rel="noreferrer" className="self-start text-[13.5px] text-texte-sourd underline-offset-2 hover:text-texte hover:underline">
              {OUVRIR[source?.origine ?? "autre"]} ↗
            </a>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Ligne({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="pt-0.5 text-[13px] text-texte-faible">{titre}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

const jourLong = (j: string) => {
  const l = new Date(j + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return l.charAt(0).toUpperCase() + l.slice(1);
};

/** « Mercredi 25 novembre · 21:00 – 22:45 », ou ce qu'il faut quand ça dure plus d'un jour. */
function quand(e: Evenement): string {
  if (e.journee) {
    const dernier = ajouterJours(e.fin, -1);
    return dernier > e.debut ? `Du ${jourLong(e.debut).toLowerCase()} au ${jourLong(dernier).toLowerCase()}` : `${jourLong(e.debut)} · toute la journée`;
  }
  const a = new Date(e.debut);
  const b = new Date(e.fin);
  const ja = jourDe(a);
  const jb = jourDe(b);
  if (ja === jb || b.getTime() === a.getTime()) return `${jourLong(ja)} · ${heureDe(a)} – ${heureDe(b)}`;
  return `${jourLong(ja)}, ${heureDe(a)} – ${jourLong(jb).toLowerCase()}, ${heureDe(b)}`;
}
