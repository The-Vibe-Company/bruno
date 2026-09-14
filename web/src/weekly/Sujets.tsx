"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Chevron, Choix } from "@/board/Choix";
import { Initiale } from "@/board/visuel";
import type { Rubrique, SujetLu } from "@/api/sujets";

export type MembreWeekly = { id: string; nom: string; avatar: string | null };

/** Les trois encarts, dans l'ordre où on en parle. */
const RUBRIQUES: { id: Rubrique; titre: string; vide: string; exemple: string }[] = [
  { id: "skills", titre: "Skills of the week", vide: "Aucun skill.", exemple: "Un skill, son lien… ⏎" },
  { id: "projects", titre: "Projects of the week", vide: "Aucun projet.", exemple: "Un projet, où il en est… ⏎" },
  { id: "wins", titre: "Wins of the week", vide: "Aucune victoire.", exemple: "Une victoire, même petite… ⏎" },
];

/** Un lien dans une ligne de texte se clique — c'est comme ça qu'on partage un skill. */
function Texte({ texte }: { texte: string }) {
  return (
    <>
      {texte.split(/(https?:\/\/\S+)/g).map((m, i) =>
        /^https?:\/\//.test(m)
          ? <a key={i} href={m} target="_blank" rel="noreferrer noopener" className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">{m.replace(/^https?:\/\//, "")}</a>
          : <span key={i}>{m}</span>,
      )}
    </>
  );
}

/**
 * Les trois encarts de la semaine, côte à côte : les skills, les projets, les victoires. Le « + »
 * de chaque encart ouvre la ligne de saisie — pour qui, puis quoi. N'importe qui écrit sur la
 * liste de n'importe qui : c'est une réunion, pas un dossier personnel.
 */
export function Sujets({ lundi, membres, initiaux, moiId }: {
  lundi: string; membres: MembreWeekly[]; initiaux: SujetLu[]; moiId: string;
}) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [sujets, setSujets] = useState(initiaux);
  const [erreur, setErreur] = useState<string | null>(null);
  // Le serveur a parlé — ou on a changé de semaine : on repart de ses données.
  const [base, setBase] = useState(initiaux);
  if (base !== initiaux) { setBase(initiaux); setSujets(initiaux); }

  const nommer = (id: string) => membres.find((m) => m.id === id);

  async function ajouter(rubrique: Rubrique, membreId: string, texte: string) {
    setErreur(null);
    const provisoire: SujetLu = { id: `provisoire-${crypto.randomUUID()}`, lundi, rubrique, membreId, texte, auteur: null, createdAt: new Date().toISOString() };
    setSujets((s) => [...s, provisoire]);
    try {
      const r = await fetch("/api/sujets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lundi, rubrique, membreId, texte }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
      const cree: SujetLu = await r.json();
      setSujets((s) => s.map((x) => (x.id === provisoire.id ? cree : x)));
    } catch (e) {
      setErreur((e as Error).message);
      setSujets((s) => s.filter((x) => x.id !== provisoire.id));
    }
    demarrer(() => router.refresh());
  }

  async function assigner(id: string, membreId: string) {
    setErreur(null);
    const avant = sujets;
    setSujets((s) => s.map((x) => (x.id === id ? { ...x, membreId } : x)));
    try {
      const r = await fetch(`/api/sujets/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ membreId }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
    } catch (e) { setErreur((e as Error).message); setSujets(avant); }
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
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {RUBRIQUES.map((r) => (
          <Encart key={r.id} rubrique={r} membres={membres} moiId={moiId} nommer={nommer}
            lignes={sujets.filter((s) => s.rubrique === r.id)}
            onAjouter={(membreId, texte) => ajouter(r.id, membreId, texte)}
            onAssigner={assigner} onRetirer={retirer} />
        ))}
      </div>
    </>
  );
}

function Encart({ rubrique, lignes, membres, moiId, nommer, onAjouter, onAssigner, onRetirer }: {
  rubrique: (typeof RUBRIQUES)[number];
  lignes: SujetLu[]; membres: MembreWeekly[]; moiId: string;
  nommer: (id: string) => MembreWeekly | undefined;
  onAjouter: (membreId: string, texte: string) => void;
  onAssigner: (id: string, membreId: string) => void;
  onRetirer: (id: string) => void;
}) {
  const [ouvert, setOuvert] = useState(true);
  const [saisie, setSaisie] = useState(false);
  const [pour, setPour] = useState(moiId);
  const [texte, setTexte] = useState("");
  const options = membres.map((m) => ({ valeur: m.id, libelle: m.nom, pastille: <Initiale nom={m.nom} avatar={m.avatar} /> }));

  function valider() {
    const t = texte.trim();
    if (!t) return;
    setTexte("");
    onAjouter(pour, t);
  }
  function ouvrirSaisie() { setOuvert(true); setSaisie(true); }

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-bord-2 bg-surface">
      <header className="flex h-12 flex-none items-center gap-1 px-3">
        <button onClick={() => setOuvert((o) => !o)} className="flex h-full min-w-0 flex-1 items-center gap-2 text-left">
          <span className={`flex-none text-texte-sourd transition-transform ${ouvert ? "rotate-90" : ""}`}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 2l4 4-4 4" /></svg>
          </span>
          <h2 className="truncate text-[15px] font-medium tracking-tight">{rubrique.titre}</h2>
          <span className="flex-none text-xs tabular-nums text-texte-sourd">{lignes.length}</span>
        </button>
        <button onClick={ouvrirSaisie} aria-label={`Ajouter — ${rubrique.titre}`} title="Ajouter"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-texte-faible hover:bg-surface-2 hover:text-texte">
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" /></svg>
        </button>
      </header>

      {ouvert && (
        <div className="px-3 pb-3">
          <ul className="flex flex-col">
            {lignes.length === 0 && !saisie && <li className="border-t border-bord-2 py-3 text-[13.5px] text-texte-faible">{rubrique.vide}</li>}
            {lignes.map((s) => {
              const m = nommer(s.membreId);
              return (
                <li key={s.id} className="group flex items-start gap-2.5 border-t border-bord-2 py-2.5">
                  <Choix valeur={s.membreId} onChoisir={(id) => onAssigner(s.id, id)} titre="Pour qui ?" options={options} align="start">
                    <button aria-label={`Pour ${m?.nom ?? "?"} — changer`} className="mt-px flex-none rounded-full ring-offset-2 ring-offset-surface hover:ring-2 hover:ring-bord-fort">
                      <Initiale nom={m?.nom ?? "?"} avatar={m?.avatar} grande />
                    </button>
                  </Choix>
                  <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[14.5px] leading-snug"><Texte texte={s.texte} /></span>
                  <button onClick={() => onRetirer(s.id)} aria-label="Retirer"
                    className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded text-texte-faible opacity-0 hover:text-bloque focus:opacity-100 group-hover:opacity-100">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 2l6 6M8 2l-6 6" /></svg>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Pour qui, puis quoi : le choix reste d'une ligne à l'autre, on en enchaîne plusieurs. */}
          {saisie && (
            <div className="mt-2 flex items-center gap-2 border-t border-bord-2 pt-2.5">
              <Choix valeur={pour} onChoisir={setPour} titre="Pour qui ?" options={options} align="start">
                <button aria-label="Pour qui ?" className="flex h-8 flex-none items-center gap-1 rounded-lg border border-bord-2 px-1.5 text-[12.5px] text-texte-sourd hover:border-bord-fort hover:text-texte">
                  <Initiale nom={nommer(pour)?.nom ?? "?"} avatar={nommer(pour)?.avatar} />
                  {pour === moiId ? "moi" : nommer(pour)?.nom}
                  <Chevron />
                </button>
              </Choix>
              <input autoFocus value={texte} onChange={(e) => setTexte(e.target.value)} aria-label={rubrique.titre} placeholder={rubrique.exemple}
                onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") { setTexte(""); setSaisie(false); } }}
                onBlur={() => { if (!texte.trim()) setSaisie(false); }}
                className="h-8 min-w-0 flex-1 rounded-lg border border-bord-fort bg-fond px-2 text-[13.5px] outline-none placeholder:text-texte-faible focus:border-accent" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
