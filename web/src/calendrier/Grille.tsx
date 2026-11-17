/**
 * La grille du Calendrier : une colonne par jour, heure par heure. Le Calendrier en montre sept
 * ou une ; le Daily, celle d'aujourd'hui, à côté de ce qui est sur le feu.
 */
import Link from "next/link";
import type { Evenement } from "@/api/contrat";
import { heureDe, minutesDansLeJour } from "@/agenda/periode";
import { Fiche, type Presence, type Source } from "./Fiche";
import { couvre, disposer, regrouper, type Place } from "./disposition";
import { Defilement } from "./Defilement";

/** La hauteur d'une heure : 48 px au premier rendu, puis ce que la place permet (voir `Defilement`). */
const H = "var(--h-heure, 48px)";
const enHeures = (n: number) => `calc(${n} * ${H})`;

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
  // Toute la journée, de 00 h à 00 h, qui défile. Elle s'ouvre sur la journée de travail, 8 h – 20 h,
  // élargie pour un vol à 6 h ou un dîner à 22 h : c'est elle qui remplit la place à l'écran.
  const premiere = 0;
  const derniere = 24;
  const ouverture = Math.min(8, ...toutes.map((p) => Math.floor(p.debut / 60)));
  const fermeture = Math.max(20, ...toutes.map((p) => Math.ceil(p.fin / 60)));
  const heures = Array.from({ length: derniere - premiere }, (_, i) => premiere + i);
  const maintenant = minutesDansLeJour(new Date());
  const gabarit = { gridTemplateColumns: `${etroite ? 44 : 56}px repeat(${jours.length}, minmax(${jours.length === 7 ? 110 : 0}px, 1fr))` };
  const journees = jours.map((j) => regrouper(evenements.filter((e) => couvre(e, j))));
  const presences = (copies: Evenement[]) => presents(copies, couleurs, sources);

  return (
    <div data-grille className={jours.length === 7 ? "min-w-[900px]" : ""}>
      {!(etroite && journees.every((l) => l.length === 0)) && <div data-entete className="sticky top-0 z-20 grid border-b border-bord-2 bg-fond" style={gabarit}>
        <div />
        {jours.map((j, i) => {
          const entete = (
            <span className={`block text-[12.5px] ${j === aujourdhui ? "font-semibold text-accent" : "text-texte-sourd"}`}>{lienJour ? nomJour(j) : libelleJourLong(j)}</span>
          );
          return (
            <div key={j} className={`flex min-w-0 flex-col gap-1 border-l border-bord-2 px-1.5 py-2 ${j === aujourdhui && !etroite ? "bg-accent-voile/40" : ""}`}>
              {etroite ? null : lienJour ? <Link href={lienJour(j)} title="Voir la journée" className="px-1 hover:text-texte">{entete}</Link> : <span className="px-1">{entete}</span>}
              {journees[i].map((copies) => <Pastille key={copies[0].id} e={copies[0]} qui={presences(copies)} />)}
            </div>
          );
        })}
      </div>}

      <div className="relative grid" style={gabarit}>
        <div>
          {heures.map((h) => (
            <div key={h} className="relative pr-2 text-right text-[11.5px] tabular-nums text-texte-faible" style={{ height: H }}>
              {/* Le libellé se cale sur sa ligne ; la première, collée à l'en-tête, reste dessous pour se lire. */}
              <span className={`relative ${h === premiere ? "top-0.5" : "-top-2"}`}>{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
          {/* Minuit, la fin de la journée : le dernier libellé s'accroche sous la dernière ligne. */}
          <div className="relative h-3 pr-2 text-right text-[11.5px] tabular-nums text-texte-faible">
            <span className="relative -top-2">00:00</span>
          </div>
          <Defilement ouverture={ouverture - premiere} fermeture={fermeture - premiere} />
        </div>
        {jours.map((j) => (
          <div key={j} className={`relative min-w-0 border-l border-bord-2 ${j === aujourdhui && !etroite ? "bg-accent-voile/20" : ""}`}>
            {heures.map((h) => <div key={h} className="border-t border-bord-2/70" style={{ height: H }} />)}
            <div className="border-t border-bord-2/70" />
            {(places.get(j) ?? []).map((p) => <Bloc key={p.evenement.id} p={p} premiere={premiere} qui={presences(p.copies)} />)}
            {j === aujourdhui && maintenant >= premiere * 60 && maintenant <= derniere * 60 && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-accent" style={{ top: enHeures((maintenant - premiere * 60) / 60) }}>
                <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-accent" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Qui a cette réunion dans son agenda : une fois chacun, même s'il l'a dans deux de ses Agendas,
 * avec la couleur de la copie qu'on croise d'abord.
 */
function presents(copies: Evenement[], couleurs: Record<string, string>, sources: Record<string, Source>): Presence[] {
  const vus = new Set<string>();
  return copies.flatMap((e) => {
    if (vus.has(e.membreId)) return [];
    vus.add(e.membreId);
    return [{ couleur: couleurs[e.agendaId] ?? "var(--accent)", source: sources[e.agendaId] }];
  });
}

/** Les noms, pour l'infobulle et la ligne d'horaire : « Stan », « Stan, Juliette et Antoine ». */
function noms(qui: Presence[]): string {
  const l = qui.flatMap((p) => (p.source ? [p.source.qui] : []));
  return l.length <= 1 ? (l[0] ?? "") : `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}`;
}

/**
 * Le fond d'une réunion : la couleur de la personne, ou, quand on est plusieurs à y aller, les
 * couleurs de chacun en bandes, pour que personne ne disparaisse sous la couleur d'un autre.
 */
function fond(qui: Presence[], dose: number, base: string): string {
  const teinte = (c: string) => `color-mix(in srgb, ${c} ${dose}%, ${base})`;
  if (qui.length <= 1) return teinte(qui[0]?.couleur ?? "var(--accent)");
  const pas = 100 / qui.length;
  return `linear-gradient(to right, ${qui.map((p, i) => `${teinte(p.couleur)} ${i * pas}% ${(i + 1) * pas}%`).join(", ")})`;
}

function Bloc({ p, premiere, qui }: { p: Place; premiere: number; qui: Presence[] }) {
  const e = p.evenement;
  const plusieurs = qui.length > 1;
  const top = enHeures((p.debut - premiere * 60) / 60);
  const hauteur = `max(calc(${(p.fin - p.debut) / 60} * ${H} - 2px), 16px)`;
  const horaire = `${heureDe(new Date(e.debut))}–${heureDe(new Date(e.fin))}`;
  const qui_ = noms(qui);
  return (
    <Fiche e={e} qui={qui}>
      <button type="button" title={`${qui_ ? `${qui_} · ` : ""}${horaire} · ${e.titre}${e.lieu ? ` · ${e.lieu}` : ""}`}
        className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[12px] leading-tight text-texte outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent"
        style={{
          top, height: hauteur,
          left: `calc(${(p.colonne / p.colonnes) * 100}% + 2px)`, width: `calc(${100 / p.colonnes}% - 4px)`,
          background: fond(qui, 30, "var(--surface)"),
        }}>
        <span className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate font-medium">{e.titre}</span>
          {plusieurs && <Visages qui={qui} />}
        </span>
        {p.fin - p.debut >= 45 && <span className="block truncate tabular-nums text-texte-sourd">{horaire}{qui_ ? ` · ${qui_}` : ""}</span>}
      </button>
    </Fiche>
  );
}

function Pastille({ e, qui }: { e: Evenement; qui: Presence[] }) {
  const qui_ = noms(qui);
  return (
    <Fiche e={e} qui={qui}>
      <button type="button" title={`${qui_ ? `${qui_} · ` : ""}Toute la journée · ${e.titre}`}
        className="flex w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-[12px] font-medium text-texte outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent"
        style={{ background: fond(qui, 24, "transparent") }}>
        <span className="min-w-0 flex-1 truncate">{e.titre}</span>
        {qui.length > 1 && <Visages qui={qui} />}
      </button>
    </Fiche>
  );
}

/** Les visages de ceux qui y vont, serrés les uns sur les autres ; au-delà de trois, un compte. */
function Visages({ qui }: { qui: Presence[] }) {
  const montres = qui.length > 3 ? qui.slice(0, 2) : qui;
  const reste = qui.length - montres.length;
  return (
    <span className="flex flex-none items-center">
      {montres.map(({ source, couleur }, i) => (
        <span key={i} className="-ml-1 flex h-[15px] w-[15px] flex-none items-center justify-center overflow-hidden rounded-full text-[9px] font-semibold leading-none text-texte first:ml-0"
          style={{ background: `color-mix(in srgb, ${couleur} 55%, var(--surface))`, boxShadow: "0 0 0 1.5px var(--surface)" }}>
          {source?.avatar
            // eslint-disable-next-line @next/next/no-img-element -- une data URL, pas une image distante
            ? <img src={source.avatar} alt="" className="h-full w-full object-cover" />
            : (source?.qui ?? "?").trim().charAt(0).toUpperCase()}
        </span>
      ))}
      {reste > 0 && (
        <span className="-ml-1 flex h-[15px] min-w-[15px] flex-none items-center justify-center rounded-full bg-surface-2 px-0.5 text-[9px] font-semibold leading-none tabular-nums text-texte-sourd"
          style={{ boxShadow: "0 0 0 1.5px var(--surface)" }}>+{reste}</span>
      )}
    </span>
  );
}

const jourDate = (j: string) => new Date(j + "T12:00:00Z");
const nomJour = (j: string) => jourDate(j).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" });
export const libelleJourLong = (j: string) => { const l = jourDate(j).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }); return l.charAt(0).toUpperCase() + l.slice(1); };
