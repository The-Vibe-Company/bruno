import type { AffectationsMembre } from "@/api/affectations";
import { Initiale, type Personne } from "@/board/visuel";
import { libelleDernierJour, libelleLong } from "@/lib/dates";

export type TacheFinie = { id: string; titre: string; etat: "termine" | "abandonne"; assigne: Personne | null };

/** Le bloc Hier : les Affectations de la veille, puis ce qui a été Terminé ou Abandonné. Lecture seule. */
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
        <div className="py-1 text-[12px] text-texte-sourd">{estLaVeille ? "Affectations de la veille" : "Affectations ce jour-là"}</div>
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
      {taches.length === 0 && <p className="mt-2.5 text-[13.5px] text-texte-faible">Rien de fini.</p>}
      {taches.map((t) => (
        <div key={t.id} className="mt-1.5 flex items-center gap-2.5 rounded-lg border border-bord-2 bg-surface-3 px-3 py-2">
          <span className={`flex-1 text-[13.5px] ${t.etat === "abandonne" ? "text-texte-sourd" : ""}`}>{t.titre}</span>
          <span className={`text-[12px] ${t.etat === "termine" ? "text-accent" : "text-texte-faible"}`}>{t.etat === "termine" ? "Terminé" : "Abandonné"}</span>
          {t.assigne && <Initiale nom={t.assigne.nom} avatar={t.assigne.avatar} />}
        </div>
      ))}
    </section>
  );
}
