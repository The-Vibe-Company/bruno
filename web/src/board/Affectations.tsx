"use client";
import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AffectationsMembre, Sur } from "@/api/affectations";
import { libelleDuree } from "@/lib/dates";
import { Initiale } from "./visuel";

export type Choix = { id: string; nom: string; couleur: string };
export type Genre = "affectation" | "projet";

/** Les deux axes. Même mécanique, deux chemins — et deux poids à l'écran. */
const CHEMIN: Record<Genre, string> = { affectation: "/api/affectations", projet: "/api/projets" };
const GROUPE: Record<Genre, string> = { affectation: "Affectations", projet: "Projets" };

/** Une ligne du bandeau : d'où elle vient, pour savoir quoi fermer et comment l'écrire. */
type Ligne = Sur & { genre: Genre };
/** Une coche : `genre:affectationId` — les deux axes ont leurs propres identifiants. */
const cle = (genre: Genre, id: string) => `${genre}:${id}`;

/**
 * Qui est sur quoi, en un coup d'œil — **une ligne par personne**, ses Affectations et ses Projets
 * dans la même case. Deux bandeaux superposés répétaient les mêmes noms pour rien.
 *
 * Un clic ouvre « Sur quoi es-tu ? » : les Affectations, puis les Projets, et on coche. N'importe
 * qui peut bouger celles de n'importe qui. Décocher, c'est « je ne suis plus dessus ». Le bandeau
 * garde toujours la même hauteur. Rien de tout ça dans les Réglages.
 */
export function Affectations({ membres, projets = [], moiId, choix, choixProjets = [], lectureSeule = false }: {
  membres: AffectationsMembre[];
  projets?: AffectationsMembre[];
  moiId: string;
  choix: Choix[];
  choixProjets?: Choix[];
  lectureSeule?: boolean;
}) {
  const lignesDe = (membreId: string): Ligne[] => [
    ...(membres.find((m) => m.membreId === membreId)?.affectations ?? []).map((a) => ({ ...a, genre: "affectation" as const })),
    ...(projets.find((m) => m.membreId === membreId)?.affectations ?? []).map((a) => ({ ...a, genre: "projet" as const })),
  ];
  return (
    <div className="grid flex-none border-b border-bord-2" style={{ gridTemplateColumns: `repeat(${Math.max(membres.length, 1)}, minmax(0, 1fr))` }}>
      {membres.map((m, i) => (
        <div key={m.membreId} className={`flex h-10 min-w-0 items-center gap-3 overflow-hidden px-5 ${i < membres.length - 1 ? "border-r border-bord-2" : ""}`}>
          <span className="flex flex-none items-center gap-1.5 text-[12px] text-texte-sourd"><Initiale nom={m.nom} avatar={m.avatar} />{m.nom}</span>
          {lectureSeule
            ? <Lignes sur={lignesDe(m.membreId)} />
            : <Case membreId={m.membreId} nom={m.nom} moi={m.membreId === moiId} sur={lignesDe(m.membreId)} choix={{ affectation: choix, projet: choixProjets }} />}
        </div>
      ))}
    </div>
  );
}

/**
 * Ce à quoi une personne est rattachée, côte à côte — jamais l'une sous l'autre. Une Affectation
 * porte le trait plein et le nom en gras ; un Projet, un trait fin et un nom plus léger : on lit
 * la différence sans l'expliquer.
 */
function Lignes({ sur, choisir = false }: { sur: Ligne[]; choisir?: boolean }) {
  return (
    <span className="flex min-w-0 flex-nowrap items-center gap-x-4">
      {sur.length === 0 && (
        <span className="flex items-center gap-2">
          <span className="h-[14px] w-[3px] border border-dashed border-texte-tres-faible" />
          <span className="text-[14.5px] font-medium leading-none tracking-tight text-texte-sourd">Rien pour l’instant</span>
          {choisir && <span className="ml-1 text-xs text-accent">Choisir</span>}
        </span>
      )}
      {sur.map((a) => (
        <span key={cle(a.genre, a.affectationId)} className="flex min-w-0 items-center gap-2">
          <span className={a.genre === "affectation" ? "h-[14px] w-[3px] flex-none" : "h-[11px] w-[2px] flex-none"} style={{ background: a.couleur }} />
          <span className={`truncate leading-none tracking-tight ${a.genre === "affectation" ? "text-[14.5px] font-medium" : "text-[13px] text-texte-2"}`}>{a.nom}</span>
          <span className="flex-none text-[11px] text-texte-faible">{libelleDuree(a.depuis)}</span>
        </span>
      ))}
    </span>
  );
}

async function poster(chemin: string, corps?: unknown): Promise<AffectationsMembre[]> {
  const r = await fetch(chemin, { method: "POST", headers: corps ? { "content-type": "application/json" } : undefined, body: corps ? JSON.stringify(corps) : undefined });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
  return r.json();
}

/** Une case cliquable, avec le sélecteur en dessous — les deux axes dans le même. */
function Case({ membreId, nom, moi, sur, choix }: { membreId: string; nom: string; moi: boolean; sur: Ligne[]; choix: Record<Genre, Choix[]> }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  /** Ce qui est coché, et pour chaque coche la période en cours qu'elle a ouverte — c'est elle qu'on ferme. */
  const [coches, setCoches] = useState<Map<string, string>>(new Map());
  const [enRoute, setEnRoute] = useState<Set<string>>(new Set());
  const [erreur, setErreur] = useState<string | null>(null);
  const question = moi ? "Sur quoi es-tu aujourd’hui ?" : `Sur quoi est ${nom} aujourd’hui ?`;

  const depuisLeServeur = () => new Map(sur.map((a) => [cle(a.genre, a.affectationId), a.id]));
  const ouvrir = (o: boolean) => { if (o) { setCoches(depuisLeServeur()); setErreur(null); } setOuvert(o); };

  /**
   * Un clic suffit : cocher, c'est commencer aujourd'hui ; décocher, c'est ne plus être dessus.
   * Rien à confirmer — la coche bouge tout de suite, le serveur suit, et si ça rate elle revient.
   */
  async function basculer(genre: Genre, affectationId: string) {
    const k = cle(genre, affectationId);
    if (enRoute.has(k)) return;
    const enCoursId = coches.get(k);
    setErreur(null);
    setEnRoute((e) => new Set(e).add(k));
    setCoches((c) => { const n = new Map(c); if (enCoursId) n.delete(k); else n.set(k, "…"); return n; });
    try {
      const apres = enCoursId
        ? await poster(`${CHEMIN[genre]}/en-cours/${enCoursId}/fin`)
        : await poster(`${CHEMIN[genre]}/en-cours`, { affectationId, membreId });
      // Le serveur renvoie qui est sur quoi, pour cet axe : on y relit ses identifiants, sans
      // attendre le rendu. Les coches de l'autre axe ne bougent pas.
      const miennes = apres.find((m) => m.membreId === membreId);
      if (miennes) {
        setCoches((c) => {
          const n = new Map([...c].filter(([x]) => !x.startsWith(`${genre}:`)));
          for (const a of miennes.affectations) n.set(cle(genre, a.affectationId), a.id);
          return n;
        });
      }
      demarrer(() => router.refresh());
    } catch (e) {
      setErreur((e as Error).message);
      setCoches((c) => { const n = new Map(c); if (enCoursId) n.set(k, enCoursId); else n.delete(k); return n; });
    } finally {
      setEnRoute((e) => { const n = new Set(e); n.delete(k); return n; });
    }
  }

  const genres: Genre[] = ["affectation", "projet"];
  const rien = genres.every((g) => choix[g].length === 0);

  return (
    <Popover.Root open={ouvert} onOpenChange={ouvrir}>
      <Popover.Trigger asChild>
        <button aria-label={question} className="-mx-1.5 flex min-w-0 items-center rounded-md px-1.5 py-0.5 text-left hover:bg-surface-2">
          <Lignes sur={sur} choisir />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className="anime-bulle z-40 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-bord-fort bg-surface shadow-[0_20px_60px_rgb(0_0_0/0.35)] outline-none">
          <div className="border-b border-bord-2 px-3.5 pb-2.5 pt-3.5 text-[13px] text-texte-sourd">{question}</div>
          {rien && <p className="px-3.5 py-3 text-sm text-texte-sourd">Rien d’actif — ajoutez-en dans les Réglages.</p>}
          {genres.map((genre) => choix[genre].length > 0 && (
            <ul key={genre}>
              <li className="px-3.5 pb-1 pt-2.5 text-[11.5px] uppercase tracking-wide text-texte-faible">{GROUPE[genre]}</li>
              {choix[genre].map((c) => {
                const k = cle(genre, c.id);
                const coche = coches.has(k);
                return (
                  <li key={k}>
                    <button role="checkbox" aria-checked={coche} disabled={enRoute.has(k)} onClick={() => basculer(genre, c.id)}
                      className="flex h-[44px] w-full items-center gap-3 border-b border-bord-2 px-3.5 text-left hover:bg-surface-2 disabled:opacity-60">
                      <span className="h-[18px] w-1 flex-none" style={{ background: c.couleur }} />
                      <span className="flex-1 truncate text-[15.5px]">{c.nom}</span>
                      <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${coche ? "bg-accent" : "border-[1.5px] border-texte-tres-faible"}`}>
                        {coche && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="stroke-sur-accent" strokeWidth="1.8"><path d="M1.5 5.5l2.5 2.5L8.5 2.5" /></svg>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ))}
          {erreur && <p role="alert" className="px-3.5 pt-3 text-sm text-bloque">{erreur}</p>}
          <div className="flex justify-end p-2.5">
            <Popover.Close className="h-9 rounded-lg px-3 text-sm text-texte-sourd hover:bg-surface-2 hover:text-texte">Fermer</Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
