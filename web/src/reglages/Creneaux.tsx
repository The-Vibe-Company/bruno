"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decaler, suivantLibre } from "./heures";

type Nature = "point_du_matin" | "rappel" | "bilan";
export type Creneau = { id: string; heure: string; nature: Nature };
const LIBELLE: Record<Nature, string> = { point_du_matin: "Point du matin", rappel: "Rappel", bilan: "Bilan" };
const MINIMUM = 3;

async function appel(chemin: string, method: string, corps?: unknown): Promise<Creneau[]> {
  const r = await fetch(chemin, { method, headers: corps ? { "content-type": "application/json" } : undefined, body: corps ? JSON.stringify(corps) : undefined });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
  return r.json();
}

/**
 * Mes Créneaux. Il n'y a rien à régler que des heures : la nature se lit, elle ne se choisit
 * pas. Retirer n'est possible qu'au-dessus de trois — le bouton le dit avant que l'API le refuse.
 */
export function Creneaux({ initiaux }: { initiaux: Creneau[] }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [liste, setListe] = useState(initiaux);
  const [erreur, setErreur] = useState<string | null>(null);
  const peutRetirer = liste.length > MINIMUM;

  const agir = async (fn: () => Promise<Creneau[]>) => {
    setErreur(null);
    try { setListe(await fn()); } catch (e) { setErreur((e as Error).message); }
    demarrer(() => router.refresh());
  };
  const bouger = (c: Creneau, quarts: number) => agir(() => appel(`/api/creneaux/${c.id}`, "PATCH", { heure: decaler(c.heure, quarts) }));

  return (
    <section>
      <header className="flex items-baseline justify-between border-b border-accent pb-2.5">
        <h2 className="text-xl font-medium tracking-tight">Mes Créneaux</h2>
      </header>
      {erreur && <p role="alert" className="mt-3 rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">{erreur}</p>}
      <ul>
        {liste.map((c) => (
          <li key={c.id} className="grid grid-cols-[120px_1fr_auto] items-center border-b border-bord-2 py-3">
            <span className="flex items-center gap-2">
              <span className="border-b border-accent pb-0.5 text-xl font-medium tracking-tight tabular-nums">{c.heure}</span>
              <span className="flex flex-col gap-0.5">
                <button aria-label={`${c.heure}, un quart d’heure plus tard`} onClick={() => bouger(c, 1)} className="text-texte-sourd hover:text-texte">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 5l4-4 4 4" /></svg>
                </button>
                <button aria-label={`${c.heure}, un quart d’heure plus tôt`} onClick={() => bouger(c, -1)} className="text-texte-sourd hover:text-texte">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1l4 4 4-4" /></svg>
                </button>
              </span>
            </span>
            <span className="text-[15.5px]">{LIBELLE[c.nature]}</span>
            {c.nature === "rappel"
              ? <button onClick={() => agir(() => appel(`/api/creneaux/${c.id}`, "DELETE"))} disabled={!peutRetirer}
                  title={peutRetirer ? undefined : "Trois Créneaux au minimum"} className="text-[13.5px] text-texte-sourd hover:text-texte disabled:opacity-40">Retirer</button>
              : <span className="text-[13.5px] text-texte-faible">{c.nature === "point_du_matin" ? "obligatoire" : "obligatoire"}</span>}
          </li>
        ))}
      </ul>
      <button onClick={() => agir(() => appel("/api/creneaux", "POST", { heure: suivantLibre(liste.map((c) => c.heure)) }))}
        className="py-3.5 text-[15px] text-accent hover:text-accent-survol">+ Ajouter un Créneau</button>
    </section>
  );
}
