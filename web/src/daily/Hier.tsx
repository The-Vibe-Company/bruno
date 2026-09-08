import type { AffectationsMembre } from "@/api/affectations";
import { Initiale } from "@/board/Carte";
import { libelleLong } from "@/lib/dates";

export type TacheFinie = { id: string; titre: string; etat: "termine" | "abandonne"; assigne: { nom: string } | null };

/** Le bloc Hier : les Affectations de la veille, puis ce qui a été Terminé ou Abandonné. Lecture seule. */
export function Hier({ jour, estLaVeille, affectations, taches }: { jour: string; estLaVeille: boolean; affectations: AffectationsMembre[]; taches: TacheFinie[] }) {
  const surQuelqueChose = affectations.filter((m) => m.affectations.length > 0);
  return (
    <section className="flex min-h-0 flex-col overflow-y-auto border-r border-bord-2 bg-surface-2 py-7 pl-8 pr-7">
      <header className="flex items-baseline justify-between border-b border-accent pb-2.5">
        <h2 className="text-xl font-medium tracking-tight">Hier{!estLaVeille && <span className="ml-2 text-[15px] font-normal text-texte-sourd">{libelleLong(jour)}</span>}</h2>
        <span className="text-sm text-texte-sourd">{taches.length}</span>
      </header>
      <div className="border-b border-bord-2 py-2.5 pb-3">
        <div className="py-1 pb-1.5 text-[13px] text-texte-sourd">Affectations de la veille</div>
        {surQuelqueChose.length === 0 && <div className="py-2 text-[15px] text-texte-faible">—</div>}
        {surQuelqueChose.map((m) => (
          <div key={m.membreId} className="flex items-center gap-3 py-2">
            <Initiale nom={m.nom} />
            <div className="flex flex-col gap-1.5">
              {m.affectations.map((a) => (
                <span key={a.id} className="flex items-center gap-2"><span className="h-4 w-[3px]" style={{ background: a.couleur }} /><span className="text-[15px]">{a.nom}</span></span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {taches.length === 0 && <p className="mt-3 text-[15px] text-texte-faible">Rien de fini.</p>}
      {taches.map((t) => (
        <div key={t.id} className="mt-2 flex items-center gap-3 rounded-[10px] border border-bord-2 bg-surface-3 px-3.5 py-[11px]">
          <span className={`flex-1 text-[15.5px] ${t.etat === "abandonne" ? "text-texte-sourd" : ""}`}>{t.titre}</span>
          <span className={`text-[13px] ${t.etat === "termine" ? "text-accent" : "text-texte-faible"}`}>{t.etat === "termine" ? "Terminé" : "Abandonné"}</span>
          {t.assigne && <Initiale nom={t.assigne.nom} />}
        </div>
      ))}
    </section>
  );
}
