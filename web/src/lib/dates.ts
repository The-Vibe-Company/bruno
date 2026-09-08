/**
 * Comment on nomme un jour. Jamais « en retard » : Bruno n'a pas de retard, il a des Reports
 * assumés — une date passée s'affiche simplement comme une date.
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
