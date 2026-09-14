"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AffectationsMembre } from "@/api/affectations";
import type { SujetLu } from "@/api/sujets";
import { Initiale } from "@/board/visuel";

export type MembreWeekly = { id: string; nom: string; avatar: string | null };

/** Un lien dans une ligne de texte se clique — c'est comme ça qu'on partage un skill. */
function Texte({ texte }: { texte: string }) {
  const morceaux = texte.split(/(https?:\/\/\S+)/g);
  return (
    <>
      {morceaux.map((m, i) =>
        /^https?:\/\//.test(m)
          ? <a key={i} href={m} target="_blank" rel="noreferrer noopener" className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">{m.replace(/^https?:\/\//, "")}</a>
          : <span key={i}>{m}</span>,
      )}
    </>
  );
}

/**
 * Le Weekly : une colonne par personne, son Affectation de la semaine en tête, puis ce dont elle
 * veut parler. On écrit sur la liste de n'importe qui — c'est une réunion, pas un dossier
 * personnel. Un lien collé devient cliquable : c'est comme ça qu'on montre un skill.
 */
export function Sujets({ lundi, membres, affectations, initiaux, moiId }: {
  lundi: string; membres: MembreWeekly[]; affectations: AffectationsMembre[]; initiaux: SujetLu[]; moiId: string;
}) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [sujets, setSujets] = useState(initiaux);
  const [erreur, setErreur] = useState<string | null>(null);
  // Le serveur a parlé : on repart de ses données.
  const [base, setBase] = useState(initiaux);
  if (base !== initiaux) { setBase(initiaux); setSujets(initiaux); }

  async function ajouter(membreId: string, texte: string) {
    setErreur(null);
    const provisoire: SujetLu = { id: `provisoire-${crypto.randomUUID()}`, lundi, membreId, texte, auteur: null, createdAt: new Date().toISOString() };
    setSujets((s) => [...s, provisoire]);
    try {
      const r = await fetch("/api/sujets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lundi, membreId, texte }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
      const cree: SujetLu = await r.json();
      setSujets((s) => s.map((x) => (x.id === provisoire.id ? cree : x)));
    } catch (e) {
      setErreur((e as Error).message);
      setSujets((s) => s.filter((x) => x.id !== provisoire.id));
    }
    demarrer(() => router.refresh());
  }

  async function retirer(id: string) {
    setErreur(null);
    const avant = sujets;
    setSujets((s) => s.filter((x) => x.id !== id));
    try {
      const r = await fetch(`/api/sujets/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
    } catch (e) { setErreur((e as Error).message); setSujets(avant); }
    demarrer(() => router.refresh());
  }

  return (
    <>
      {erreur && (
        <p role="alert" className="mb-4 rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">
          {erreur} <button className="ml-2 underline" onClick={() => setErreur(null)}>ok</button>
        </p>
      )}
      <div className="grid items-start gap-x-8 gap-y-8" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(membres.length, 1), 3)}, minmax(0, 1fr))` }}>
        {membres.map((m) => (
          <Colonne key={m.id} membre={m} moi={m.id === moiId}
            sur={affectations.find((a) => a.membreId === m.id)?.affectations ?? []}
            sujets={sujets.filter((s) => s.membreId === m.id)}
            onAjouter={(texte) => ajouter(m.id, texte)} onRetirer={retirer} />
        ))}
      </div>
    </>
  );
}

function Colonne({ membre, moi, sur, sujets, onAjouter, onRetirer }: {
  membre: MembreWeekly; moi: boolean; sur: AffectationsMembre["affectations"]; sujets: SujetLu[];
  onAjouter: (texte: string) => void; onRetirer: (id: string) => void;
}) {
  const [texte, setTexte] = useState("");
  function valider() {
    const t = texte.trim();
    if (!t) return;
    setTexte("");
    onAjouter(t);
  }
  return (
    <section className="flex flex-col">
      <header className="flex items-center gap-2 border-b border-bord-2 pb-2.5">
        <Initiale nom={membre.nom} avatar={membre.avatar} grande />
        <h2 className="flex-1 text-[17px] font-medium tracking-tight">{membre.nom}</h2>
        {moi && <span className="text-[12px] text-texte-faible">moi</span>}
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3">
        {sur.length === 0 && <span className="text-[14px] text-texte-faible">Aucune Affectation</span>}
        {sur.map((a) => (
          <span key={a.id} className="flex items-center gap-2">
            <span className="h-[16px] w-[3px]" style={{ background: a.couleur }} />
            <span className="text-[15px] font-medium leading-none tracking-tight">{a.nom}</span>
          </span>
        ))}
      </div>

      <ul className="flex flex-col">
        {sujets.map((s) => (
          <li key={s.id} className="group flex items-start gap-2 border-t border-bord-2 py-2.5">
            <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-texte-tres-faible" />
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[14.5px] leading-snug"><Texte texte={s.texte} /></span>
            <button onClick={() => onRetirer(s.id)} aria-label="Retirer ce Sujet"
              className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded text-texte-faible opacity-0 hover:text-bloque focus:opacity-100 group-hover:opacity-100">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 2l6 6M8 2l-6 6" /></svg>
            </button>
          </li>
        ))}
      </ul>

      <input value={texte} onChange={(e) => setTexte(e.target.value)} aria-label={`Un sujet pour ${membre.nom}`}
        placeholder="Un sujet, un lien… ⏎"
        onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") setTexte(""); }}
        className="mt-1.5 h-9 rounded-lg border border-transparent bg-transparent px-2 text-[14px] outline-none placeholder:text-texte-faible hover:border-bord-2 focus:border-accent focus:bg-fond" />
    </section>
  );
}
