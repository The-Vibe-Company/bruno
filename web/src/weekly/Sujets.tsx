"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AffectationsMembre } from "@/api/affectations";
import type { Rubrique, SujetLu } from "@/api/sujets";
import { Chevron, Choix } from "@/board/Choix";
import { Initiale } from "@/board/visuel";
import { libelleDuree } from "@/lib/dates";

export type MembreWeekly = { id: string; nom: string; avatar: string | null };

/**
 * Chaque encart dit une chose différente, et se remplit différemment :
 * — `phrase` : une ligne, courte. « On a signé AFP. » Les Leads et les Wins sont ça.
 * — `lien` : un titre, et l'adresse où aller voir. Les Skills et les Posts sont ça.
 * — `recap` : rien à saisir. Les Projets de la semaine et qui a bossé dessus se lisent des
 *   Affectations déjà posées — les redemander serait les demander deux fois.
 */
type Forme = "phrase" | "lien" | "recap";
const RUBRIQUES: { id: Rubrique; titre: string; forme: Forme; vide: string; exemple: string; teinte: string }[] = [
  { id: "skills", titre: "Skills of the week", forme: "lien", vide: "Aucun skill cette semaine.", exemple: "Le nom du skill", teinte: "bg-accent" },
  { id: "projects", titre: "Projects of the week", forme: "recap", vide: "Personne sur un Projet cette semaine.", exemple: "", teinte: "bg-en-cours" },
  { id: "leads", titre: "Lead of the week", forme: "phrase", vide: "Aucun lead cette semaine.", exemple: "Un lead, en une phrase", teinte: "bg-bloque" },
  { id: "posts", titre: "Posts of the week", forme: "lien", vide: "Aucun post cette semaine.", exemple: "Le sujet du post", teinte: "bg-accent" },
  { id: "wins", titre: "Wins of the week", forme: "phrase", vide: "Aucune victoire cette semaine.", exemple: "Ce qu'on a fait, en une phrase", teinte: "bg-en-cours" },
];

/** L'adresse sans son protocole ni son slash final : c'est plus court, et ça se lit. */
const joli = (lien: string) => lien.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** Un lien collé dans une phrase se clique quand même. */
function Texte({ texte }: { texte: string }) {
  return (
    <>
      {texte.split(/(https?:\/\/\S+)/g).map((m, i) =>
        /^https?:\/\//.test(m)
          ? <a key={i} href={m} target="_blank" rel="noreferrer noopener" className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">{joli(m)}</a>
          : <span key={i}>{m}</span>,
      )}
    </>
  );
}

/** Qui a bossé sur ce Projet cette semaine, et depuis quand. */
type SurLeProjet = { id: string; nom: string; couleur: string; depuis: string; qui: MembreWeekly[] };

/**
 * Le Weekly : cinq encarts. Quatre se remplissent à la main — une phrase pour les Leads et les
 * Wins, un titre et un lien pour les Skills et les Posts. Le cinquième ne se remplit pas : les
 * Projets de la semaine et qui a bossé dessus se lisent des Affectations.
 */
export function Sujets({ lundi, membres, initiaux, moiId, projets }: {
  lundi: string; membres: MembreWeekly[]; initiaux: SujetLu[]; moiId: string;
  /** Qui est sur quel Projet pendant cette semaine — c'est le récap, tel quel. */
  projets: AffectationsMembre[];
}) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [sujets, setSujets] = useState(initiaux);
  const [erreur, setErreur] = useState<string | null>(null);
  const [base, setBase] = useState(initiaux);
  if (base !== initiaux) { setBase(initiaux); setSujets(initiaux); }

  const nommer = (id: string) => membres.find((m) => m.id === id);

  // Le récap : une ligne par Projet, avec tous ceux qui y étaient cette semaine.
  const recap: SurLeProjet[] = [];
  for (const m of projets) {
    for (const a of m.affectations) {
      const deja = recap.find((r) => r.id === a.affectationId);
      const qui = nommer(m.membreId);
      if (deja) { if (qui) deja.qui.push(qui); if (a.depuis < deja.depuis) deja.depuis = a.depuis; }
      else recap.push({ id: a.affectationId, nom: a.nom, couleur: a.couleur, depuis: a.depuis, qui: qui ? [qui] : [] });
    }
  }

  async function ajouter(rubrique: Rubrique, membreId: string, texte: string, lien: string | null) {
    setErreur(null);
    const provisoire: SujetLu = { id: `provisoire-${crypto.randomUUID()}`, lundi, rubrique, membreId, texte, lien, auteur: null, createdAt: new Date().toISOString() };
    setSujets((s) => [...s, provisoire]);
    try {
      const r = await fetch("/api/sujets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lundi, rubrique, membreId, texte, lien }) });
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
      {/*
        * En grille, la deuxième rangée attend la carte la plus haute de la première : entre les
        * Skills et les Posts, ça faisait un trou. En colonnes, chaque carte se pose sous la
        * précédente de sa colonne. On y perd la lecture de gauche à droite — ce sont cinq encarts
        * indépendants, ça n'a pas d'importance.
        */}
      <div className="gap-4 [column-fill:balance] lg:columns-3">
        {RUBRIQUES.map((r) => (
          <Encart key={r.id} rubrique={r} membres={membres} moiId={moiId} nommer={nommer}
            lignes={sujets.filter((s) => s.rubrique === r.id)} recap={recap}
            onAjouter={(membreId, texte, lien) => ajouter(r.id, membreId, texte, lien)}
            onAssigner={assigner} onRetirer={retirer} />
        ))}
      </div>
    </>
  );
}

function Encart({ rubrique, lignes, recap, membres, moiId, nommer, onAjouter, onAssigner, onRetirer }: {
  rubrique: (typeof RUBRIQUES)[number];
  lignes: SujetLu[]; recap: SurLeProjet[]; membres: MembreWeekly[]; moiId: string;
  nommer: (id: string) => MembreWeekly | undefined;
  onAjouter: (membreId: string, texte: string, lien: string | null) => void;
  onAssigner: (id: string, membreId: string) => void;
  onRetirer: (id: string) => void;
}) {
  const [ouvert, setOuvert] = useState(true);
  const [saisie, setSaisie] = useState(false);
  const [pour, setPour] = useState(moiId);
  const [texte, setTexte] = useState("");
  const [lien, setLien] = useState("");
  const options = membres.map((m) => ({ valeur: m.id, libelle: m.nom, pastille: <Initiale nom={m.nom} avatar={m.avatar} /> }));
  const auto = rubrique.forme === "recap";
  const combien = auto ? recap.length : lignes.length;

  function valider() {
    const t = texte.trim();
    if (!t) return;
    const l = lien.trim();
    // Une adresse mal formée ferait refuser la requête : on attend qu'elle tienne debout.
    if (l && !/^https?:\/\//.test(l)) return;
    setTexte(""); setLien("");
    onAjouter(pour, t, l || null);
  }

  return (
    <section className="mb-4 flex break-inside-avoid flex-col overflow-hidden rounded-xl border border-bord-2 bg-surface">
      <header className="flex h-12 flex-none items-center gap-2 px-3">
        <button onClick={() => setOuvert((o) => !o)} className="flex h-full min-w-0 flex-1 items-center gap-2.5 text-left">
          <span className={`h-[15px] w-[3px] flex-none rounded-full ${rubrique.teinte}`} />
          <h2 className="truncate text-[15px] font-medium tracking-tight">{rubrique.titre}</h2>
          <span className="flex-none text-xs tabular-nums text-texte-sourd">{combien}</span>
        </button>
        {!auto && (
          <button onClick={() => { setOuvert(true); setSaisie(true); }} aria-label={`Ajouter — ${rubrique.titre}`} title="Ajouter"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-texte-faible hover:bg-surface-2 hover:text-texte">
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" /></svg>
          </button>
        )}
      </header>

      {ouvert && (
        <div className="px-3 pb-3">
          {combien === 0 && !saisie && <p className="border-t border-bord-2 py-3 text-[13.5px] text-texte-faible">{rubrique.vide}</p>}

          {/* Le récap : on ne le remplit pas, on le lit. */}
          {auto && recap.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 border-t border-bord-2 py-2.5">
              <span className="h-[18px] w-[3px] flex-none rounded-full" style={{ background: p.couleur }} />
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium tracking-tight">{p.nom}</span>
              <span className="flex flex-none -space-x-1.5">
                {p.qui.map((q) => <span key={q.id} title={q.nom} className="rounded-full ring-2 ring-surface"><Initiale nom={q.nom} avatar={q.avatar} grande /></span>)}
              </span>
              <span className="flex-none text-[11px] text-texte-faible">{libelleDuree(p.depuis)}</span>
            </div>
          ))}

          {!auto && lignes.map((s) => {
            const m = nommer(s.membreId);
            return (
              <div key={s.id} className="group flex items-start gap-2.5 border-t border-bord-2 py-2.5">
                <Choix valeur={s.membreId} onChoisir={(id) => onAssigner(s.id, id)} titre="Pour qui ?" options={options} align="start">
                  <button aria-label={`Pour ${m?.nom ?? "?"} — changer`} className="mt-px flex-none rounded-full ring-offset-2 ring-offset-surface hover:ring-2 hover:ring-bord-fort">
                    <Initiale nom={m?.nom ?? "?"} avatar={m?.avatar} grande />
                  </button>
                </Choix>
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-pre-wrap break-words text-[14.5px] leading-snug"><Texte texte={s.texte} /></span>
                  {s.lien && (
                    <a href={s.lien} target="_blank" rel="noreferrer noopener" className="mt-0.5 block truncate text-[12.5px] text-accent hover:underline">{joli(s.lien)}</a>
                  )}
                </span>
                <button onClick={() => onRetirer(s.id)} aria-label="Retirer"
                  className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded text-texte-faible opacity-0 hover:text-bloque focus:opacity-100 group-hover:opacity-100">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 2l6 6M8 2l-6 6" /></svg>
                </button>
              </div>
            );
          })}

          {/* Pour qui, puis quoi : le choix reste d'une ligne à l'autre, on en enchaîne plusieurs. */}
          {saisie && !auto && (
            <div className="mt-2 flex flex-col gap-1.5 border-t border-bord-2 pt-2.5">
              <div className="flex items-center gap-2">
                <Choix valeur={pour} onChoisir={setPour} titre="Pour qui ?" options={options} align="start">
                  <button aria-label="Pour qui ?" className="flex h-8 flex-none items-center gap-1 rounded-lg border border-bord-2 px-1.5 text-[12.5px] text-texte-sourd hover:border-bord-fort hover:text-texte">
                    <Initiale nom={nommer(pour)?.nom ?? "?"} avatar={nommer(pour)?.avatar} />
                    {pour === moiId ? "moi" : nommer(pour)?.nom}
                    <Chevron />
                  </button>
                </Choix>
                <input autoFocus value={texte} onChange={(e) => setTexte(e.target.value)} aria-label={rubrique.titre} placeholder={`${rubrique.exemple}… ⏎`}
                  onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") { setTexte(""); setLien(""); setSaisie(false); } }}
                  onBlur={() => { if (!texte.trim() && !lien.trim()) setSaisie(false); }}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-bord-fort bg-fond px-2 text-[13.5px] outline-none placeholder:text-texte-faible focus:border-accent" />
              </div>
              {rubrique.forme === "lien" && (
                <input value={lien} onChange={(e) => setLien(e.target.value)} aria-label="Le lien" placeholder="https://… ⏎" inputMode="url"
                  onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") { setTexte(""); setLien(""); setSaisie(false); } }}
                  className="h-8 w-full rounded-lg border border-bord-fort bg-fond px-2 text-[13px] outline-none placeholder:text-texte-faible focus:border-accent" />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
