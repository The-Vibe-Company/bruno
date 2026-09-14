import type { AffectationsMembre } from "@/api/affectations";
import { Initiale } from "@/board/visuel";
import { libelleJour, libelleSemaine } from "@/lib/dates";

export type TacheFaite = { id: string; titre: string; etat: "termine" | "abandonne"; jour: string; assigneId: string | null };
export type Semaine = { lundi: string; enCours: boolean; taches: TacheFaite[]; affectations: AffectationsMembre[] };

const accord = (n: number, mot: string) => (n === 0 ? null : `${n} ${mot}${n > 1 ? "s" : ""}`);

/**
 * Une semaine de Fait : son en-tête compte, son corps dit pour chaque personne son Affectation de
 * la semaine puis ce qu'elle a Terminé et Abandonné. Pas de compteur de jours par Affectation,
 * pas de cumul mensuel — hors scope, volontairement.
 */
export function Semaine({ semaine, membres, onOuvrir }: { semaine: Semaine; membres: { id: string; nom: string; avatar?: string | null }[]; onOuvrir: (id: string) => void }) {
  const terminees = semaine.taches.filter((t) => t.etat === "termine").length;
  const abandonnees = semaine.taches.length - terminees;
  const compte = [accord(terminees, "terminée"), accord(abandonnees, "abandonnée")].filter(Boolean).join(" · ") || "rien encore";
  const colonnes = Math.min(Math.max(membres.length, 1), 3);
  const personnes = membres
    .map((m) => ({ ...m, taches: semaine.taches.filter((t) => t.assigneId === m.id), sur: semaine.affectations.find((a) => a.membreId === m.id)?.affectations ?? [] }))
    .filter((p) => p.taches.length > 0 || p.sur.length > 0);
  return (
    <details open={semaine.enCours} className="group border-b border-bord-faible">
      <summary className="flex cursor-pointer list-none items-center gap-3.5 py-4 [&::-webkit-details-marker]:hidden">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-texte-sourd transition-transform group-open:rotate-90"><path d="M4 2l4 4-4 4" /></svg>
        <h2 className="text-xl font-medium tracking-tight">{libelleSemaine(semaine.lundi)}</h2>
        {semaine.enCours && <span className="text-sm text-texte-sourd">en cours</span>}
        <span className="flex-1" />
        <span className="text-sm text-texte-sourd">{compte}</span>
      </summary>
      <div className="grid gap-x-10 gap-y-8 pb-6 pl-6"
        style={{
          gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))`,
          // Trois lignes par personne — le nom, les Affectations, les Tâches — partagées par
          // toutes les colonnes : sans ça, deux Affectations chez l'un décalent ses Tâches vers
          // le bas et plus rien ne s'aligne.
          gridTemplateRows: `repeat(${Math.ceil(Math.max(personnes.length, 1) / colonnes) * 3}, auto)`,
        }}>
        {personnes.length === 0 && <p className="text-[15px] text-texte-faible">Rien de fini cette semaine.</p>}
        {personnes.map((p) => (
          <section key={p.id} className="row-span-3 grid grid-rows-subgrid">
            <h3 className="flex items-center gap-2 text-[13.5px] text-texte-sourd"><Initiale nom={p.nom} avatar={p.avatar} />{p.nom}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 self-start">
              {p.sur.length === 0 && <span className="text-[15px] text-texte-faible">Aucune Affectation</span>}
              {p.sur.map((a) => (
                <span key={a.id} className="flex items-center gap-2.5">
                  <span className="h-[18px] w-1 flex-none" style={{ background: a.couleur }} />
                  <span className="text-lg font-medium leading-none tracking-tight">{a.nom}</span>
                </span>
              ))}
            </div>
            <ul className="mt-3 self-start">
              {p.taches.length === 0 && <li className="border-t border-bord-2 py-2.5 text-[14px] text-texte-faible">Rien de fini</li>}
              {p.taches.map((t) => (
                <li key={t.id} className="flex items-center gap-3 border-t border-bord-2 py-2.5">
                  <span title={t.etat === "termine" ? "Terminé" : "Abandonné"}
                    className={`h-[15px] w-[15px] flex-none rounded-full border-[1.5px] ${t.etat === "termine" ? "border-accent bg-accent-voile" : "border-dashed border-texte-tres-faible"}`} />
                  <button onClick={() => onOuvrir(t.id)} className={`min-w-0 flex-1 truncate text-left text-[15.5px] hover:text-accent ${t.etat === "abandonne" ? "text-texte-sourd" : ""}`}>{t.titre}</button>
                  <span className="flex-none text-[13px] text-texte-faible">{libelleJour(t.jour)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
