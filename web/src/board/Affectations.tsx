"use client";
import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AffectationsMembre, Sur } from "@/api/affectations";
import { libelleDuree } from "@/lib/dates";
import { Initiale } from "./visuel";

export type Choix = { id: string; nom: string; couleur: string };

/**
 * Qui est sur quoi, en un coup d'œil — et là où ça se change : un clic sur une case ouvre
 * « Sur quoi es-tu aujourd'hui ? » (ou « Sur quoi est Stan ? » : n'importe qui peut bouger
 * l'Affectation de n'importe qui), on coche une ou plusieurs, à partir d'aujourd'hui. Décocher,
 * c'est « je ne suis plus dessus ». Le bandeau garde toujours la même hauteur : plusieurs
 * Affectations se posent côte à côte. Rien de tout ça dans les Réglages.
 */
export function Affectations({ membres, moiId, choix, lectureSeule = false }: { membres: AffectationsMembre[]; moiId: string; choix: Choix[]; lectureSeule?: boolean }) {
  return (
    <div className="grid flex-none border-b border-bord-2" style={{ gridTemplateColumns: `repeat(${Math.max(membres.length, 1)}, minmax(0, 1fr))` }}>
      {membres.map((m, i) => (
        <div key={m.membreId} className={`flex h-10 min-w-0 items-center gap-3 overflow-hidden px-5 ${i < membres.length - 1 ? "border-r border-bord-2" : ""}`}>
          <span className="flex flex-none items-center gap-1.5 text-[12px] text-texte-sourd"><Initiale nom={m.nom} avatar={m.avatar} />{m.nom}</span>
          {lectureSeule ? <Lignes sur={m.affectations} /> : <Case membreId={m.membreId} nom={m.nom} moi={m.membreId === moiId} sur={m.affectations} choix={choix} />}
        </div>
      ))}
    </div>
  );
}

/** Les Affectations d'une personne, côte à côte — jamais l'une sous l'autre. */
function Lignes({ sur, choisir = false }: { sur: Sur[]; choisir?: boolean }) {
  return (
    <span className="flex min-w-0 flex-nowrap items-center gap-x-4">
      {sur.length === 0 && (
        <span className="flex items-center gap-2">
          <span className="h-[14px] w-[3px] border border-dashed border-texte-tres-faible" />
          <span className="text-[14.5px] font-medium leading-none tracking-tight text-texte-sourd">Aucune Affectation</span>
          {choisir && <span className="ml-1 text-xs text-accent">Choisir</span>}
        </span>
      )}
      {sur.map((a) => (
        <span key={a.id} className="flex items-center gap-2">
          <span className="h-[14px] w-[3px]" style={{ background: a.couleur }} />
          <span className="truncate text-[14.5px] font-medium leading-none tracking-tight">{a.nom}</span>
          <span className="text-[11px] text-texte-faible">{libelleDuree(a.depuis)}</span>
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

/** Une case cliquable, avec le sélecteur en dessous. */
function Case({ membreId, nom, moi, sur, choix }: { membreId: string; nom: string; moi: boolean; sur: Sur[]; choix: Choix[] }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  /** Ce qui est coché, et pour chaque coche l'Affectation en cours qu'elle a ouverte — c'est elle qu'on ferme. */
  const [coches, setCoches] = useState<Map<string, string>>(new Map());
  const [enRoute, setEnRoute] = useState<Set<string>>(new Set());
  const [erreur, setErreur] = useState<string | null>(null);
  const question = moi ? "Sur quoi es-tu aujourd’hui ?" : `Sur quoi est ${nom} aujourd’hui ?`;

  const depuisLeServeur = () => new Map(sur.map((a) => [a.affectationId, a.id]));
  const ouvrir = (o: boolean) => { if (o) { setCoches(depuisLeServeur()); setErreur(null); } setOuvert(o); };

  /**
   * Un clic suffit : cocher, c'est commencer aujourd'hui ; décocher, c'est ne plus être dessus.
   * Rien à confirmer — la coche bouge tout de suite, le serveur suit, et si ça rate elle revient.
   */
  async function basculer(affectationId: string) {
    if (enRoute.has(affectationId)) return;
    const enCoursId = coches.get(affectationId);
    setErreur(null);
    setEnRoute((e) => new Set(e).add(affectationId));
    setCoches((c) => { const n = new Map(c); if (enCoursId) n.delete(affectationId); else n.set(affectationId, "…"); return n; });
    try {
      const apres = enCoursId
        ? await poster(`/api/affectations/en-cours/${enCoursId}/fin`)
        : await poster("/api/affectations/en-cours", { affectationId, membreId });
      // Le serveur renvoie qui est sur quoi : on y relit les identifiants, sans attendre le rendu.
      const miennes = apres.find((m) => m.membreId === membreId);
      if (miennes) setCoches(new Map(miennes.affectations.map((a) => [a.affectationId, a.id])));
      demarrer(() => router.refresh());
    } catch (e) {
      setErreur((e as Error).message);
      setCoches((c) => { const n = new Map(c); if (enCoursId) n.set(affectationId, enCoursId); else n.delete(affectationId); return n; });
    } finally {
      setEnRoute((e) => { const n = new Set(e); n.delete(affectationId); return n; });
    }
  }

  return (
    <Popover.Root open={ouvert} onOpenChange={ouvrir}>
      <Popover.Trigger asChild>
        <button aria-label={question} className="-mx-1.5 flex min-w-0 items-center rounded-md px-1.5 py-0.5 text-left hover:bg-surface-2">
          <Lignes sur={sur} choisir />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className="z-40 w-80 overflow-hidden rounded-xl border border-bord-fort bg-surface shadow-[0_20px_60px_rgb(0_0_0/0.35)] outline-none">
          <div className="border-b border-bord-2 px-3.5 pb-2.5 pt-3.5 text-[13px] text-texte-sourd">{question}</div>
          <ul>
            {choix.map((c) => {
              const coche = coches.has(c.id);
              return (
                <li key={c.id}>
                  <button role="checkbox" aria-checked={coche} disabled={enRoute.has(c.id)} onClick={() => basculer(c.id)} className="flex h-[46px] w-full items-center gap-3 border-b border-bord-2 px-3.5 text-left hover:bg-surface-2 disabled:opacity-60">
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
          <div className="flex justify-end p-2.5">
            <Popover.Close className="h-9 rounded-lg px-3 text-sm text-texte-sourd hover:bg-surface-2 hover:text-texte">Fermer</Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
