"use client";
import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AffectationsMembre, Sur } from "@/api/affectations";
import { Initiale } from "./Carte";

export type Choix = { id: string; nom: string; couleur: string };

/**
 * Qui est sur quoi, en un coup d'œil — et, sur ma case, là où ça se change : un clic ouvre
 * « Sur quoi es-tu aujourd'hui ? », on coche une ou plusieurs Affectations, à partir
 * d'aujourd'hui. Décocher, c'est « je ne suis plus dessus ». Rien de tout ça dans les Réglages.
 */
export function Affectations({ membres, moiId, choix }: { membres: AffectationsMembre[]; moiId: string; choix: Choix[] }) {
  return (
    <div className="grid flex-none border-b border-bord-2" style={{ gridTemplateColumns: `repeat(${Math.max(membres.length, 1)}, minmax(0, 1fr))` }}>
      {membres.map((m, i) => (
        <div key={m.membreId} className={`flex flex-col gap-1 px-7 py-4 ${i < membres.length - 1 ? "border-r border-bord-2" : ""}`}>
          <span className="flex items-center gap-2 text-[13.5px] text-texte-sourd"><Initiale nom={m.nom} />{m.nom}</span>
          {m.membreId === moiId ? <Mienne sur={m.affectations} choix={choix} /> : <Lignes sur={m.affectations} />}
        </div>
      ))}
    </div>
  );
}

function Lignes({ sur }: { sur: Sur[] }) {
  return (
    <div className="mt-0.5 flex flex-col gap-1">
      {sur.length === 0 && (
        <span className="flex items-center gap-2.5">
          <span className="h-[18px] w-1 border border-dashed border-texte-tres-faible" />
          <span className="text-lg font-medium leading-none tracking-tight text-texte-sourd">Aucune Affectation</span>
        </span>
      )}
      {sur.map((a) => (
        <span key={a.id} className="flex items-center gap-2.5">
          <span className="h-[18px] w-1" style={{ background: a.couleur }} />
          <span className="text-lg font-medium leading-none tracking-tight">{a.nom}</span>
        </span>
      ))}
    </div>
  );
}

/** Ma case : la même chose, cliquable, avec le sélecteur en dessous. */
function Mienne({ sur, choix }: { sur: Sur[]; choix: Choix[] }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const dessus = new Set(sur.map((a) => a.affectationId));

  const ouvrir = (o: boolean) => { if (o) { setCoches(new Set(dessus)); setErreur(null); } setOuvert(o); };
  const basculer = (id: string) => setCoches((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const prises = [...coches].filter((id) => !dessus.has(id));
  const quittees = sur.filter((a) => !coches.has(a.affectationId));
  const libelle = prises.length > 0 ? "Commencer aujourd'hui" : quittees.length > 0 ? "Je ne suis plus dessus" : "Commencer aujourd'hui";

  async function confirmer() {
    setOccupe(true); setErreur(null);
    try {
      for (const affectationId of prises) await poster("/api/affectations/en-cours", { affectationId });
      for (const a of quittees) await poster(`/api/affectations/en-cours/${a.id}/fin`);
      setOuvert(false);
      demarrer(() => router.refresh());
    } catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  }

  return (
    <Popover.Root open={ouvert} onOpenChange={ouvrir}>
      <Popover.Trigger asChild>
        <button aria-label="Sur quoi es-tu aujourd'hui ?" className="-mx-2 mt-0.5 flex flex-col items-start gap-1 rounded-md px-2 py-1 text-left hover:bg-surface-2">
          {sur.length === 0 && (
            <span className="flex items-center gap-2.5">
              <span className="h-[18px] w-1 border border-dashed border-texte-tres-faible" />
              <span className="text-lg font-medium leading-none tracking-tight text-texte-sourd">Aucune Affectation</span>
              <span className="ml-1.5 text-sm text-accent">Choisir</span>
            </span>
          )}
          {sur.map((a) => (
            <span key={a.id} className="flex items-center gap-2.5">
              <span className="h-[18px] w-1" style={{ background: a.couleur }} />
              <span className="text-lg font-medium leading-none tracking-tight">{a.nom}</span>
            </span>
          ))}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className="z-40 w-80 overflow-hidden rounded-xl border border-bord-fort bg-surface shadow-[0_20px_60px_rgb(0_0_0/0.35)] outline-none">
          <div className="border-b border-bord-2 px-3.5 pb-2.5 pt-3.5 text-[13px] text-texte-sourd">Sur quoi es-tu aujourd’hui ?</div>
          <ul>
            {choix.map((c) => {
              const coche = coches.has(c.id);
              return (
                <li key={c.id}>
                  <button role="checkbox" aria-checked={coche} onClick={() => basculer(c.id)} className="flex h-[46px] w-full items-center gap-3 border-b border-bord-2 px-3.5 text-left hover:bg-surface-2">
                    <span className="h-[18px] w-1" style={{ background: c.couleur }} />
                    <span className="flex-1 text-[15.5px]">{c.nom}</span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${coche ? "bg-accent" : "border-[1.5px] border-texte-tres-faible"}`}>
                      {coche && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="stroke-sur-accent" strokeWidth="1.8"><path d="M1.5 5.5l2.5 2.5L8.5 2.5" /></svg>}
                    </span>
                  </button>
                </li>
              );
            })}
            {choix.length === 0 && <li className="px-3.5 py-3 text-sm text-texte-sourd">Aucune Affectation active — ajoutez-en une dans les Réglages.</li>}
          </ul>
          {erreur && <p role="alert" className="px-3.5 pt-3 text-sm text-bloque">{erreur}</p>}
          <div className="flex items-center gap-2 p-3.5">
            <button onClick={confirmer} disabled={occupe || (prises.length === 0 && quittees.length === 0)} className="h-10 flex-1 rounded-lg bg-accent px-4 text-[14.5px] font-medium text-sur-accent disabled:opacity-50">{libelle}</button>
            <Popover.Close className="h-10 px-3 text-sm text-texte-sourd">Annuler</Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

async function poster(chemin: string, corps?: unknown) {
  const r = await fetch(chemin, { method: "POST", headers: corps ? { "content-type": "application/json" } : undefined, body: corps ? JSON.stringify(corps) : undefined });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
}
