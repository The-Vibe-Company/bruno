/**
 * Comment on nomme un jour. Une date passée s'affiche simplement comme une date : Bruno ne
 * juge pas, il compte les Reports.
 */
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

export function libelleJour(jour: string, ref: string = aujourdhui()): string {
  const d = Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10));
  const r = Date.UTC(+ref.slice(0, 4), +ref.slice(5, 7) - 1, +ref.slice(8, 10));
  const delta = Math.round((d - r) / 86_400_000);
  if (delta === 0) return "aujourd'hui";
  if (delta === 1) return "demain";
  if (delta === -1) return "hier";
  return `${+jour.slice(8, 10)} ${MOIS[+jour.slice(5, 7) - 1]}`;
}

/** « lundi 7 septembre » pour l'en-tête. */
export function libelleLong(jour: string = aujourdhui()): string {
  return new Date(jour + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

const decale = (jours: number, ref: string = aujourdhui()): string => {
  const d = new Date(ref + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + jours); return d.toISOString().slice(0, 10);
};
export const demain = (ref: string = aujourdhui()): string => decale(1, ref);
/** Le prochain lundi — jamais aujourd'hui, même un lundi : « lundi » veut dire la semaine d'après. */
export const lundiProchain = (ref: string = aujourdhui()): string => {
  const jour = new Date(ref + "T12:00:00Z").getUTCDay(); // 0 = dimanche
  return decale(((8 - jour) % 7) || 7, ref);
};
