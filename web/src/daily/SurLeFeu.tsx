import { Initiale, Raison, Reporte, TEINTE } from "@/board/Carte";
import type { Statut } from "@/board/deplacement";
import { libelleJour } from "@/lib/dates";

export type TacheDuJour = { id: string; titre: string; statut: Statut; engagement: string | null; reportsCount: number; assigne: { nom: string } | null; raisonBlocage: string | null };

const STATUTS: Statut[] = ["a_faire", "en_cours", "bloque"];
const LIBELLE: Record<Statut, string> = { a_faire: "À faire", en_cours: "En cours", bloque: "Bloqué" };
const COULEUR: Record<Statut, [string, string]> = { a_faire: ["bg-accent", "border-accent"], en_cours: ["bg-en-cours", "border-en-cours"], bloque: ["bg-bloque", "border-bloque"] };

/** Sur le feu aujourd'hui, groupé par Statut, l'Assigné sur chaque ligne. On lit, on ne touche pas : c'est le Board qui bouge. */
export function SurLeFeu({ taches }: { taches: TacheDuJour[] }) {
  return (
    <>
      {STATUTS.map((statut) => {
        const liste = taches.filter((t) => t.statut === statut);
        const [point, filet] = COULEUR[statut];
        return (
          <section key={statut} className="flex min-h-0 flex-col overflow-y-auto py-4 pl-5 pr-4">
            <header className={`flex items-baseline justify-between border-b pb-1.5 ${filet}`}>
              <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-tight"><span className={`h-1.5 w-1.5 rounded-full ${point}`} />{LIBELLE[statut]}</h2>
              <span className="text-xs text-texte-sourd">{liste.length}</span>
            </header>
            <div className="flex flex-col gap-2 pt-2">
              {liste.map((t) => (
                <article key={t.id} className={`rounded-lg border px-3 pt-2.5 pb-2 ${TEINTE[t.statut]}`}>
                  <div className="text-[13.5px] leading-snug">{t.titre}</div>
                  {t.statut === "bloque" && <Raison raison={t.raisonBlocage} />}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`h-[15px] w-[15px] flex-none rounded-full border-[1.5px] border-texte-tres-faible ${t.statut === "bloque" ? "border-dashed" : ""}`} />
                    <span className="flex-1 text-[12px] text-texte-sourd">
                      {t.engagement ? libelleJour(t.engagement) : "—"}
                      {t.reportsCount > 0 && <> · <Reporte n={t.reportsCount} /></>}
                    </span>
                    {t.assigne && <Initiale nom={t.assigne.nom} />}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
