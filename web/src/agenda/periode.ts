/**
 * Les bornes d'une vue du Calendrier, en instants. Une journée commence à minuit **à Paris**
 * (le fuseau de Bruno), pas à minuit UTC : sinon une réunion de 0 h 30 tombait la veille.
 */
import { FUSEAU } from "@/relances/temps";

/** Le décalage du fuseau par rapport à UTC, en minutes, à cet instant-là (heure d'été comprise). */
function decalage(instant: Date, fuseau: string): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: fuseau, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(instant).map((x) => [x.type, x.value]));
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((local - instant.getTime()) / 60_000);
}

/** Minuit de ce jour, dans le fuseau, en instant. */
export function minuit(jour: string, fuseau: string = FUSEAU): Date {
  const naif = Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10));
  // Deux passes : le décalage de minuit n'est pas forcément celui de midi, les jours de changement d'heure.
  const premier = naif - decalage(new Date(naif), fuseau) * 60_000;
  return new Date(naif - decalage(new Date(premier), fuseau) * 60_000);
}

export function ajouterJours(jour: string, n: number): string {
  const d = new Date(jour + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Le jour (AAAA-MM-JJ) d'un instant, dans le fuseau. */
export function jourDe(instant: Date, fuseau: string = FUSEAU): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuseau, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

/** Les minutes écoulées depuis minuit, dans le fuseau : où poser un événement sur la grille. */
export function minutesDansLeJour(instant: Date, fuseau: string = FUSEAU): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: fuseau, hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(instant).map((x) => [x.type, x.value]));
  return (+p.hour % 24) * 60 + +p.minute;
}

export function heureDe(instant: Date, fuseau: string = FUSEAU): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau, hour: "2-digit", minute: "2-digit", hour12: false }).format(instant);
}
