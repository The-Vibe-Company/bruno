/**
 * La grille du Calendrier : une colonne par jour, heure par heure. Le Calendrier en montre sept
 * ou une ; le Daily, celle d'aujourd'hui, à côté de ce qui est sur le feu.
 */
import Link from "next/link";
import type { Evenement } from "@/api/contrat";
import { heureDe, minutesDansLeJour } from "@/agenda/periode";
import { Fiche, type Source } from "./Fiche";
import { couvre, disposer, type Place } from "./disposition";

const HAUTEUR_HEURE = 48;

/**
 * Une colonne par jour, heure par heure ; les réunions de tout le monde s'y partagent la place.
 *
 * `etroite` : la grille tient dans une colonne du Daily. Le jour y est déjà écrit en tête de page,
 * elle ne le répète pas ; l'en-tête ne garde que les journées entières, s'il y en a.
 */
export function Grille({ jours, aujourdhui, evenements, couleurs, sources, lienJour, etroite = false }: {
  jours: string[]; aujourdhui: string; evenements: Evenement[];
  couleurs: Record<string, string>; sources: Record<string, Source>; lienJour?: (j: string) => string; etroite?: boolean;
}) {
  const places = new Map(jours.map((j) => [j, disposer(evenements, j)]));
  const toutes = [...places.values()].flat();
  // 8 h – 20 h d'ordinaire ; la grille s'élargit d'elle-même pour un vol à 6 h ou un dîner à 22 h.
  const premiere = Math.min(8, ...toutes.map((p) => Math.floor(p.debut / 60)));
  const derniere = Math.max(20, ...toutes.map((p) => Math.ceil(p.fin / 60)));
  const heures = Array.from({ length: derniere - premiere }, (_, i) => premiere + i);
  const maintenant = minutesDansLeJour(new Date());
  const gabarit = { gridTemplateColumns: `${etroite ? 44 : 56}px repeat(${jours.length}, minmax(${jours.length === 7 ? 110 : 0}px, 1fr))` };
  const journees = jours.map((j) => evenements.filter((e) => couvre(e, j)));

  return (
    <div className={jours.length === 7 ? "min-w-[900px]" : ""}>
      {!(etroite && journees.every((l) => l.length === 0)) && <div className="sticky top-0 z-20 grid border-b border-bord-2 bg-fond" style={gabarit}>
        <div />
        {jours.map((j, i) => {
          const entete = (
            <span className={`block text-[12.5px] ${j === aujourdhui ? "font-semibold text-accent" : "text-texte-sourd"}`}>{lienJour ? nomJour(j) : libelleJourLong(j)}</span>
          );
          return (
            <div key={j} className={`flex min-w-0 flex-col gap-1 border-l border-bord-2 px-1.5 py-2 ${j === aujourdhui && !etroite ? "bg-accent-voile/40" : ""}`}>
              {etroite ? null : lienJour ? <Link href={lienJour(j)} title="Voir la journée" className="px-1 hover:text-texte">{entete}</Link> : <span className="px-1">{entete}</span>}
              {journees[i].map((e) => <Pastille key={e.id} e={e} couleur={couleurs[e.agendaId]} source={sources[e.agendaId]} />)}
            </div>
          );
        })}
      </div>}

      <div className="relative grid" style={gabarit}>
        <div>
          {heures.map((h) => (
            <div key={h} className="relative pr-2 text-right text-[11.5px] tabular-nums text-texte-faible" style={{ height: HAUTEUR_HEURE }}>
              {/* Le libellé se cale sur sa ligne ; la première, collée à l'en-tête, reste dessous pour se lire. */}
              <span className={`relative ${h === premiere ? "top-0.5" : "-top-2"}`}>{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>
        {jours.map((j) => (
          <div key={j} className={`relative min-w-0 border-l border-bord-2 ${j === aujourdhui && !etroite ? "bg-accent-voile/20" : ""}`}>
            {heures.map((h) => <div key={h} className="border-t border-bord-2/70" style={{ height: HAUTEUR_HEURE }} />)}
            {(places.get(j) ?? []).map((p) => <Bloc key={p.evenement.id} p={p} premiere={premiere} couleur={couleurs[p.evenement.agendaId]} source={sources[p.evenement.agendaId]} />)}
            {j === aujourdhui && maintenant >= premiere * 60 && maintenant <= derniere * 60 && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-accent" style={{ top: ((maintenant - premiere * 60) / 60) * HAUTEUR_HEURE }}>
                <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-accent" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bloc({ p, premiere, couleur = "var(--accent)", source }: { p: Place; premiere: number; couleur?: string; source?: Source }) {
  const e = p.evenement;
  const qui = source?.qui;
  const top = ((p.debut - premiere * 60) / 60) * HAUTEUR_HEURE;
  const hauteur = Math.max(((p.fin - p.debut) / 60) * HAUTEUR_HEURE, 18);
  const horaire = `${heureDe(new Date(e.debut))}–${heureDe(new Date(e.fin))}`;
  return (
    <Fiche e={e} couleur={couleur} source={source}>
      <button type="button" title={`${qui ? `${qui} · ` : ""}${horaire} · ${e.titre}${e.lieu ? ` · ${e.lieu}` : ""}`}
        className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[12px] leading-tight text-texte outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent"
        style={{
          top, height: hauteur - 2,
          left: `calc(${(p.colonne / p.colonnes) * 100}% + 2px)`, width: `calc(${100 / p.colonnes}% - 4px)`,
          background: `color-mix(in srgb, ${couleur} 30%, var(--surface))`,
        }}>
        <span className="block truncate font-medium">{e.titre}</span>
        {hauteur > 32 && <span className="block truncate tabular-nums text-texte-sourd">{horaire}{qui ? ` · ${qui}` : ""}</span>}
      </button>
    </Fiche>
  );
}

function Pastille({ e, couleur = "var(--accent)", source }: { e: Evenement; couleur?: string; source?: Source }) {
  return (
    <Fiche e={e} couleur={couleur} source={source}>
      <button type="button" title={`${source ? `${source.qui} · ` : ""}Toute la journée · ${e.titre}`}
        className="block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[12px] font-medium text-texte outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent"
        style={{ background: `color-mix(in srgb, ${couleur} 24%, transparent)` }}>
        {e.titre}
      </button>
    </Fiche>
  );
}

const jourDate = (j: string) => new Date(j + "T12:00:00Z");
const nomJour = (j: string) => jourDate(j).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" });
export const libelleJourLong = (j: string) => { const l = jourDate(j).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }); return l.charAt(0).toUpperCase() + l.slice(1); };
