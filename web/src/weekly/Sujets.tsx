"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Chevron, Choix } from "@/board/Choix";
import { Initiale } from "@/board/visuel";
import type { Rubrique, SujetLu } from "@/api/sujets";

export type MembreWeekly = { id: string; nom: string; avatar: string | null };

/** Les trois encarts, dans l'ordre où on en parle. */
const RUBRIQUES: { id: Rubrique; titre: string; vide: string; exemple: string }[] = [
  { id: "skills", titre: "Skills of the week", vide: "Aucun skill cette semaine.", exemple: "Un skill, son lien… ⏎" },
  { id: "projects", titre: "Projects of the week", vide: "Aucun projet cette semaine.", exemple: "Un projet, où il en est… ⏎" },
  { id: "wins", titre: "Wins of the week", vide: "Aucune victoire cette semaine.", exemple: "Une victoire, même petite… ⏎" },
];

/** Un lien dans une ligne de texte se clique — c'est comme ça qu'on partage un skill. */
function Texte({ texte }: { texte: string }) {
  return (
    <>
      {texte.split(/(https?:\/\/\S+)/g).map((m, i) =>
        /^https?:\/\//.test(m)
          ? <a key={i} href={m} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()} className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">{m.replace(/^https?:\/\//, "")}</a>
          : <span key={i}>{m}</span>,
      )}
    </>
  );
}

/**
 * Le Weekly : trois encarts repliables — les skills, les projets, les victoires de la semaine.
 * Chaque ligne porte quelqu'un : on choisit qui avant d'écrire, et la pastille se reclique pour
 * en changer. N'importe qui écrit sur la liste de n'importe qui — c'est une réunion, pas un
 * dossier personnel. Une semaine, une page blanche.
 */
export function Sujets({ lundi, membres, initiaux, moiId }: {
  lundi: string; membres: MembreWeekly[]; initiaux: SujetLu[]; moiId: string;
}) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [sujets, setSujets] = useState(initiaux);
  const [erreur, setErreur] = useState<string | null>(null);
  // Le serveur a parlé : on repart de ses données.
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
    <div className="flex flex-col gap-4">
      {erreur && (
        <p role="alert" className="rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">
          {erreur} <button className="ml-2 underline" onClick={() => setErreur(null)}>ok</button>
        </p>
      )}
      {RUBRIQUES.map((r) => (
        <Encart key={r.id} rubrique={r} membres={membres} moiId={moiId} nommer={nommer}
          lignes={sujets.filter((s) => s.rubrique === r.id)}
          onAjouter={(membreId, texte) => ajouter(r.id, membreId, texte)}
          onAssigner={assigner} onRetirer={retirer} />
      ))}
    </div>
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
  const [pour, setPour] = useState(moiId);
  const [texte, setTexte] = useState("");
  const options = membres.map((m) => ({ valeur: m.id, libelle: m.nom, pastille: <Initiale nom={m.nom} avatar={m.avatar} /> }));

  function valider() {
    const t = texte.trim();
    if (!t) return;
    setTexte("");
    onAjouter(pour, t);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-bord-2 bg-surface">
      <header className="flex h-12 items-center gap-2 px-4">
        <button onClick={() => setOuvert((o) => !o)} className="flex h-full flex-1 items-center gap-2.5 text-left">
          <span className={`text-texte-sourd transition-transform ${ouvert ? "rotate-90" : ""}`}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 2l4 4-4 4" /></svg>
          </span>
          <h2 className="text-[15.5px] font-medium tracking-tight">{rubrique.titre}</h2>
        </button>
        <span className="text-xs tabular-nums text-texte-sourd">{lignes.length}</span>
      </header>

      {ouvert && (
        <div className="px-4 pb-3">
          <ul className="flex flex-col">
            {lignes.length === 0 && <li className="border-t border-bord-2 py-3 text-[14px] text-texte-faible">{rubrique.vide}</li>}
            {lignes.map((s) => {
              const m = nommer(s.membreId);
              return (
                <li key={s.id} className="group flex items-start gap-3 border-t border-bord-2 py-2.5">
                  <Choix valeur={s.membreId} onChoisir={(id) => onAssigner(s.id, id)} titre="Pour qui ?" options={options} align="start">
                    <button aria-label={`Pour ${m?.nom ?? "?"} — changer`} className="mt-px flex-none rounded-full ring-offset-2 ring-offset-surface hover:ring-2 hover:ring-bord-fort">
                      <Initiale nom={m?.nom ?? "?"} avatar={m?.avatar} grande />
                    </button>
                  </Choix>
                  <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[15px] leading-snug"><Texte texte={s.texte} /></span>
                  <button onClick={() => onRetirer(s.id)} aria-label="Retirer"
                    className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded text-texte-faible opacity-0 hover:text-bloque focus:opacity-100 group-hover:opacity-100">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 2l6 6M8 2l-6 6" /></svg>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Pour qui, puis quoi : on choisit la personne une fois, on enchaîne les lignes. */}
          <div className="mt-2 flex items-center gap-2.5 border-t border-bord-2 pt-2.5">
            <Choix valeur={pour} onChoisir={setPour} titre="Pour qui ?" options={options} align="start">
              <button aria-label="Pour qui ?" className="flex h-8 items-center gap-1.5 rounded-lg border border-bord-2 px-2 text-[13px] text-texte-sourd hover:border-bord-fort hover:text-texte">
                <Initiale nom={nommer(pour)?.nom ?? "?"} avatar={nommer(pour)?.avatar} />
                {pour === moiId ? "moi" : nommer(pour)?.nom}
                <Chevron />
              </button>
            </Choix>
            <input value={texte} onChange={(e) => setTexte(e.target.value)} aria-label={rubrique.titre} placeholder={rubrique.exemple}
              onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") setTexte(""); }}
              className="h-8 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-[14px] outline-none placeholder:text-texte-faible hover:border-bord-2 focus:border-accent focus:bg-fond" />
          </div>
        </div>
      )}
    </section>
  );
}
