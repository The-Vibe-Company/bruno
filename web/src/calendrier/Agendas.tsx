"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Agenda } from "@/api/contrat";
import { Initiale } from "@/board/visuel";

type Personne = { id: string; nom: string; avatar: string | null };

async function appel(chemin: string, method: string, corps?: unknown) {
  const r = await fetch(chemin, {
    method,
    headers: corps ? { "content-type": "application/json" } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
}

const ORIGINE: Record<Agenda["origine"], string> = { google: "Google", outlook: "Outlook", autre: "iCal" };

/**
 * Brancher et débrancher les agendas de chacun. Google et Outlook se branchent par leur
 * propriétaire — c'est lui qui dit oui chez le fournisseur ; un lien iCal se colle pour n'importe qui.
 */
export function Agendas({ personnes, agendas, moiId, couleurs, erreurs, outlookPret }: {
  personnes: Personne[]; agendas: Agenda[]; moiId: string;
  couleurs: Record<string, string>; erreurs: Record<string, string>; outlookPret: boolean;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [pour, setPour] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [url, setUrl] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const fermerFormulaire = () => { setPour(null); setNom(""); setUrl(""); setErreur(null); };

  const ajouter = async () => {
    if (!pour) return;
    setErreur(null); setOccupe(true);
    try {
      await appel("/api/agendas", "POST", { membreId: pour, nom, url });
      fermerFormulaire();
      router.refresh();
    } catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };

  const retirer = async (a: Agenda) => {
    if (!confirm(`Débrancher « ${a.nom} » ? Ses événements disparaîtront du Calendrier.`)) return;
    try { await appel(`/api/agendas/${a.id}`, "DELETE"); router.refresh(); }
    catch (e) { setErreur((e as Error).message); }
  };

  return (
    <Dialog.Root open={ouvert} onOpenChange={(o) => { setOuvert(o); if (!o) fermerFormulaire(); }}>
      <Dialog.Trigger asChild>
        <button className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-sur-accent hover:bg-accent-survol">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M6 1.5v9M1.5 6h9" /></svg>
          Agendas
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="anime-voile fixed inset-0 z-40 bg-fond-page/70" />
        <Dialog.Content aria-describedby={undefined} className="anime-boite fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-3rem)] w-[560px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-2xl border border-bord-fort bg-surface p-6 shadow-2xl outline-none">
          <div>
            <Dialog.Title className="text-[22px] font-semibold tracking-tight">Agendas</Dialog.Title>
            <p className="mt-1 text-sm text-texte-sourd">Autant qu’on veut par personne. Bruno lit, il n’écrit jamais dedans.</p>
          </div>

          {personnes.map((m) => {
            const siens = agendas.filter((a) => a.membreId === m.id);
            const moi = m.id === moiId;
            return (
              <section key={m.id} className="flex flex-col gap-2">
                <header className="flex items-center gap-2 border-b border-bord-2 pb-2">
                  <Initiale nom={m.nom} avatar={m.avatar} grande />
                  <h3 className="flex-1 text-[15px] font-medium">{m.nom}{moi && <span className="ml-1.5 text-[12.5px] font-normal text-texte-faible">vous</span>}</h3>
                </header>

                {siens.length === 0 && <p className="text-[13.5px] text-texte-faible">Rien de branché.</p>}
                <ul className="flex flex-col">
                  {siens.map((a) => (
                    <li key={a.id} className="flex items-center gap-2.5 py-1.5">
                      <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: couleurs[a.id] }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px]">{a.nom}</span>
                        <span className={`block truncate text-[12px] ${erreurs[a.id] ? "text-bloque" : "text-texte-faible"}`}>
                          {ORIGINE[a.origine]}{a.fournisseur === "ical" && a.origine !== "autre" ? " · lien iCal" : ""}{erreurs[a.id] ? ` · ${erreurs[a.id]}` : ""}
                        </span>
                      </span>
                      {erreurs[a.id] && moi && a.fournisseur !== "ical" && (
                        <a href={`/api/auth/agenda/${a.fournisseur}`} className="text-[13px] text-accent hover:text-accent-survol">Rebrancher</a>
                      )}
                      <button onClick={() => retirer(a)} className="text-[13px] text-texte-sourd hover:text-texte">Débrancher</button>
                    </li>
                  ))}
                </ul>

                {pour === m.id ? (
                  <form className="flex flex-col gap-2 rounded-lg border border-bord-fort bg-fond p-3" onSubmit={(e) => { e.preventDefault(); ajouter(); }}>
                    <input autoFocus value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Outlook MONKA" aria-label="Nom de l’agenda" maxLength={80}
                      className="h-9 rounded-md border border-bord-fort bg-surface px-2.5 text-[14px] outline-none focus:border-accent" />
                    <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics" aria-label="Lien iCal"
                      className="h-9 rounded-md border border-bord-fort bg-surface px-2.5 font-mono text-[12.5px] outline-none focus:border-accent" />
                    <p className="text-[12.5px] leading-relaxed text-texte-sourd">
                      <b className="font-medium text-texte-2">Outlook</b> : Paramètres → Calendrier → Calendriers partagés → Publier un calendrier → lien ICS.{" "}
                      <b className="font-medium text-texte-2">Google</b> : Paramètres de l’agenda → Intégrer l’agenda → Adresse secrète au format iCal.
                    </p>
                    {erreur && <p role="alert" className="rounded-md border border-bloque/40 bg-bloque-voile px-2.5 py-1.5 text-[13px]">{erreur}</p>}
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={fermerFormulaire} className="h-9 px-2 text-[13.5px] text-texte-sourd">Annuler</button>
                      <button type="submit" disabled={occupe || !nom.trim() || !url.trim()} className="h-9 rounded-md bg-accent px-3.5 text-[13.5px] font-medium text-sur-accent disabled:opacity-50">
                        {occupe ? "Lecture…" : "Brancher"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- une redirection OAuth, pas une page */}
                    {moi && <a href="/api/auth/agenda/google" className={bouton}>+ Google</a>}
                    {moi && (outlookPret
                      // eslint-disable-next-line @next/next/no-html-link-for-pages -- une redirection OAuth, pas une page
                      ? <a href="/api/auth/agenda/microsoft" className={bouton}>+ Outlook</a>
                      : <span title="La connexion Outlook n’est pas encore configurée sur Bruno : collez le lien iCal." className={`${bouton} cursor-not-allowed opacity-45`}>+ Outlook</span>)}
                    <button onClick={() => { fermerFormulaire(); setPour(m.id); }} className={bouton}>+ Lien iCal</button>
                  </div>
                )}
              </section>
            );
          })}

          {erreur && !pour && <p role="alert" className="rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">{erreur}</p>}
          <p className="text-[12.5px] leading-relaxed text-texte-faible">
            Un Gmail perso ou l’Outlook d’un client refusent souvent les applis extérieures : le lien iCal passe toujours.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const bouton = "inline-flex h-8 items-center rounded-lg border border-bord-fort px-3 text-[13px] text-texte-2 hover:border-accent hover:text-texte";
