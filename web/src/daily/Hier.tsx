import type { AffectationsMembre } from "@/api/affectations";
import { Initiale, type Personne } from "@/board/visuel";
import { libelleDernierJour, libelleJour, libelleLong } from "@/lib/dates";

export type TacheFinie = { id: string; titre: string; etat: "termine" | "abandonne"; jour: string; assigne: Personne | null };

/**
 * Le bloc Hier : les Affectations de ce jour-là, puis ce qui a été fini **depuis** — le dernier
 * jour ouvré et aujourd'hui. Au point du matin, ce qui vient d'être coché compte aussi.
 * Lecture seule : c'est le Board qui bouge.
 */
export function Hier({ jour, estLaVeille, affectations, projets, taches }: { jour: string; estLaVeille: boolean; affectations: AffectationsMembre[]; projets: AffectationsMembre[]; taches: TacheFinie[] }) {
  // Les Affectations et les Projets de ce jour-là, dans la même colonne : c'est la même question.
  const parMembre = affectations.map((m) => ({ ...m, tout: [...m.affectations, ...(projets.find((p) => p.membreId === m.membreId)?.affectations ?? [])] }));
  const surQuelqueChose = parMembre.filter((m) => m.tout.length > 0);
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
      {taches.length === 0 && <p className="py-2.5 text-[13.5px] text-texte-faible">Rien de fini.</p>}
      {/*
        * Une liste, pas des cartes : dans une colonne de 300 px, un encadré par Tâche mangeait la
        * largeur et coupait les titres en trois. Le rond dit « fait », le titre a toute la place,
        * le jour et le visage tiennent en dessous.
        */}
      {taches.map((t) => (
        <div key={t.id} className="flex items-start gap-2.5 border-b border-bord-2 py-2.5">
          <span className="mt-[3px] h-[13px] w-[13px] flex-none rounded-full border-[1.5px] border-accent bg-accent-voile" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] leading-snug">{t.titre}</span>
            <span className="text-[11.5px] text-texte-faible">{libelleJour(t.jour)}</span>
          </span>
          {t.assigne && <Initiale nom={t.assigne.nom} avatar={t.assigne.avatar} />}
        </div>
      ))}
    </section>
  );
}
