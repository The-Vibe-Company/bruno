"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AffectationsMembre } from "@/api/affectations";
import { modifierTache, rouvrir, supprimer, terminer, abandonner, type Patch } from "@/board/api";
import type { Membre } from "@/board/Carte";
import { Detail, type TacheFiche } from "@/board/Detail";
import { Coche, Initiale } from "@/board/visuel";
import { libelleDernierJour, libelleJour, libelleLong } from "@/lib/dates";

/** Une Tâche finie, telle que la colonne la montre — et telle que sa fiche l'ouvre. */
export type TacheFinie = TacheFiche & { fin: { etat: "termine" | "abandonne"; jour: string } };

/**
 * Le bloc Hier : les Clients de ce jour-là, puis ce qui a été fini **depuis** — le dernier jour
 * ouvré et aujourd'hui. Au point du matin, ce qui vient d'être coché compte aussi.
 *
 * Une Tâche finie s'ouvre (THE-757) : pendant le Daily, on clique sur ce qu'on vient d'annoncer
 * pour montrer le tableau, la capture d'écran ou les Notes qui vont avec. Elle ne se travaille
 * plus — il ne lui reste qu'à être rouverte si c'était une erreur.
 */
export function Hier({ jour, estLaVeille, affectations, projets, taches, membres }: {
  jour: string; estLaVeille: boolean; affectations: AffectationsMembre[]; projets: AffectationsMembre[];
  taches: TacheFinie[]; membres: Membre[];
}) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [ouverteId, setOuverteId] = useState<string | null>(null);
  const [parties, setParties] = useState<Set<string>>(new Set());
  const rafraichir = () => demarrer(() => router.refresh());
  const agir = (fn: (id: string) => Promise<unknown>) => async (id: string) => {
    setParties((p) => new Set(p).add(id));
    setOuverteId(null);
    try { await fn(id); } finally { rafraichir(); }
  };
  const modifier = async (id: string, patch: Patch) => { await modifierTache(id, patch); rafraichir(); };
  // Les Affectations et les Projets de ce jour-là, dans la même colonne : c'est la même question.
  const parMembre = affectations.map((m) => ({ ...m, tout: [...m.affectations, ...(projets.find((p) => p.membreId === m.membreId)?.affectations ?? [])] }));
  const surQuelqueChose = parMembre.filter((m) => m.tout.length > 0);
  // Rouverte ou supprimée depuis la fiche : elle quitte la colonne sans attendre le serveur.
  const visibles = taches.filter((t) => !parties.has(t.id));
  return (
    <section className="flex min-h-0 flex-col overflow-y-auto border-r border-bord-2 bg-surface-2 py-4 pl-5 pr-4">
      <header className="flex items-baseline justify-between border-b border-accent pb-1.5">
        <h2 className="flex items-baseline gap-2 text-[15px] font-medium tracking-tight">
          {libelleDernierJour(jour)}
          {estLaVeille && <span className="text-[13px] font-normal text-texte-sourd">{libelleLong(jour)}</span>}
        </h2>
        <span className="text-xs text-texte-sourd">{taches.length}</span>
      </header>
      <div className="border-b border-bord-2 py-2">
        {surQuelqueChose.length === 0 && <div className="py-1.5 text-[13.5px] text-texte-faible">—</div>}
        {surQuelqueChose.map((m) => (
          <div key={m.membreId} className="flex items-center gap-2.5 py-1.5">
            <Initiale nom={m.nom} avatar={m.avatar} />
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {m.tout.map((a) => (
                <span key={a.id} className="flex items-center gap-1.5"><span className="h-3.5 w-[3px]" style={{ background: a.couleur }} /><span className="text-[13.5px]">{a.nom}</span></span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {visibles.length === 0 && <p className="py-2.5 text-[13.5px] text-texte-faible">Rien de fini.</p>}
      {/*
        * Une liste, pas des cartes : dans une colonne de 300 px, un encadré par Tâche mangeait la
        * largeur et coupait les titres en trois. Le rond dit « fait », le titre a toute la place,
        * le jour et le visage tiennent en dessous.
        */}
      {visibles.map((t) => (
        <button key={t.id} onClick={() => setOuverteId(t.id)}
          className="flex w-full items-start gap-2.5 border-b border-bord-2 py-2.5 text-left hover:bg-surface-3">
          <span className="mt-[3px]"><Coche etat="termine" taille={13} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] leading-snug">{t.titre}</span>
            <span className="text-[11.5px] text-texte-faible">{libelleJour(t.fin.jour)}</span>
          </span>
          {t.assigne && <Initiale nom={t.assigne.nom} avatar={t.assigne.avatar} />}
        </button>
      ))}

      <Detail tache={visibles.find((t) => t.id === ouverteId) ?? null} membres={membres} onFermer={() => setOuverteId(null)}
        onModifier={modifier} onRouvrir={agir(rouvrir)} onSupprimer={agir(supprimer)}
        onTerminer={agir(terminer)} onAbandonner={agir(abandonner)} />
    </section>
  );
}
