/**
 * Ce qu'une Récurrence fabrique — en pur, sans base : l'écran l'affiche en aperçu, le moteur
 * (BRU-33) la joue le jour venu. Les deux voient exactement la même chose.
 */
import { joursEntre } from "@/lib/dates";

export type Frequence = "hebdomadaire" | "mensuelle";
export type Regle = { titre: string; frequence: Frequence; jourSemaine: number | null; jourMois: number | null; decalages: number[] };
export type Occurrence = { numero: number; titre: string; engagement: string };

export const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** « Post LinkedIn 2/3 » — et juste « Post LinkedIn » quand il n'y en a qu'une. */
export const titreOccurrence = (titre: string, n: number, total: number) => (total > 1 ? `${titre} ${n}/${total}` : titre);

/** « chaque lundi », « le 1 du mois ». */
export function libelleFrequence(r: Pick<Regle, "frequence" | "jourSemaine" | "jourMois">): string {
  return r.frequence === "hebdomadaire" ? `chaque ${JOURS[(r.jourSemaine ?? 1) - 1]}` : `le ${r.jourMois ?? 1} du mois`;
}

/** « 3 Tâches », « 1 Tâche ». */
export const libelleNombre = (n: number) => `${n} Tâche${n > 1 ? "s" : ""}`;

const decale = (jour: string, jours: number) => { const d = new Date(jour + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + jours); return d.toISOString().slice(0, 10); };
const jourSemaineDe = (jour: string) => ((new Date(jour + "T12:00:00Z").getUTCDay() + 6) % 7) + 1; // 1 = lundi

/** La règle tombe-t-elle ce jour-là ? */
export function tombe(r: Pick<Regle, "frequence" | "jourSemaine" | "jourMois">, jour: string): boolean {
  return r.frequence === "hebdomadaire" ? jourSemaineDe(jour) === r.jourSemaine : Number(jour.slice(8, 10)) === r.jourMois;
}

/** Le prochain jour où la règle tombe, `depuis` compris. */
export function prochaineDate(r: Pick<Regle, "frequence" | "jourSemaine" | "jourMois">, depuis: string): string {
  let j = depuis;
  for (let i = 0; i < 366; i++) { if (tombe(r, j)) return j; j = decale(j, 1); }
  return depuis;
}

/** Les Tâches que la règle fabrique un jour donné : titres numérotés, Engagements échelonnés. */
export function occurrencesDe(r: Regle, jour: string): Occurrence[] {
  const total = r.decalages.length;
  return r.decalages.map((d, i) => ({ numero: i + 1, titre: titreOccurrence(r.titre, i + 1, total), engagement: decale(jour, d) }));
}

/** « lundi », « mercredi » — ou « +2 j » quand la règle est mensuelle : le jour de semaine n'y dit rien. */
export function libelleEngagement(r: Pick<Regle, "frequence">, jourDeBase: string, engagement: string): string {
  const delta = joursEntre(jourDeBase, engagement);
  if (r.frequence === "hebdomadaire" && delta < 7) return JOURS[jourSemaineDe(engagement) - 1];
  return delta === 0 ? "le jour même" : `+${delta} j`;
}
