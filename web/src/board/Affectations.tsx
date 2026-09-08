import type { AffectationsMembre } from "@/api/affectations";
import { Initiale } from "./Carte";

/** Qui est sur quoi, en un coup d'œil. Poser et fermer une Affectation arrivent avec BRU-28/40. */
export function Affectations({ membres }: { membres: AffectationsMembre[] }) {
  return (
    <div className="grid flex-none border-b border-bord-2" style={{ gridTemplateColumns: `repeat(${Math.max(membres.length, 1)}, minmax(0, 1fr))` }}>
      {membres.map((m, i) => (
        <div key={m.membreId} className={`flex flex-col gap-1 px-7 py-4 ${i < membres.length - 1 ? "border-r border-bord-2" : ""}`}>
          <span className="flex items-center gap-2 text-[13.5px] text-texte-sourd"><Initiale nom={m.nom} />{m.nom}</span>
          <div className="mt-0.5 flex flex-col gap-1">
            {m.affectations.length === 0 && <span className="text-[15px] text-texte-faible">—</span>}
            {m.affectations.map((a) => (
              <span key={a.nom} className="flex items-center gap-2.5">
                <span className="h-[18px] w-1" style={{ background: a.couleur }} />
                <span className="text-lg font-medium leading-none tracking-tight">{a.nom}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
