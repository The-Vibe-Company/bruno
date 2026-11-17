/**
 * Où poser les événements d'une journée sur la grille : deux réunions qui se chevauchent se
 * partagent la largeur, côte à côte, au lieu de se recouvrir.
 */
import type { Evenement } from "@/api/contrat";
import { jourDe, minuit, minutesDansLeJour } from "@/agenda/periode";

/**
 * Une Place tient une réunion, et toutes ses copies : quand plusieurs d'entre nous y vont, elle est
 * dans l'agenda de chacun. `evenement` est la première, celle qu'on montre ; `copies` les contient toutes.
 */
export type Place = { evenement: Evenement; copies: Evenement[]; debut: number; fin: number; colonne: number; colonnes: number };

const cle = (e: Evenement) => {
  const titre = e.titre.trim().toLowerCase().replace(/\s+/g, " ");
  return e.journee ? `j|${titre}|${e.debut}|${e.fin}` : `h|${titre}|${Date.parse(e.debut)}|${Date.parse(e.fin)}`;
};

/**
 * La même réunion, vue dans plusieurs agendas — le Daily de l'équipe est dans celui de chacun.
 * Même titre, même début, même fin : c'est la même, on la pose une fois. Dans l'ordre d'arrivée.
 */
export function regrouper(evenements: Evenement[]): Evenement[][] {
  const groupes = new Map<string, Evenement[]>();
  for (const e of evenements) {
    const k = cle(e);
    const g = groupes.get(k);
    if (g) g.push(e); else groupes.set(k, [e]);
  }
  return [...groupes.values()];
}

/** Les minutes de la journée qu'un événement occupe ce jour-là — coupé à minuit s'il déborde. */
export function bornesDuJour(e: Evenement, jour: string): { debut: number; fin: number } | null {
  if (e.journee) return null;
  const a = new Date(e.debut);
  const b = new Date(e.fin);
  const ouvre = minuit(jour).getTime();
  const ferme = ouvre + 24 * 3600_000; // un jour de changement d'heure se lit à une heure près : c'est assez
  if (b.getTime() <= ouvre && a.getTime() !== b.getTime()) return null;
  if (a.getTime() >= ferme) return null;
  const debut = a.getTime() <= ouvre ? 0 : minutesDansLeJour(a);
  const fin = b.getTime() >= ferme ? 24 * 60 : jourDe(b) !== jour ? 24 * 60 : minutesDansLeJour(b);
  return { debut, fin: Math.max(fin, debut) };
}

/** Une journée entière couvre-t-elle ce jour ? `fin` est exclusive. */
export const couvre = (e: Evenement, jour: string) => e.journee && e.debut <= jour && jour < e.fin;

/** Un événement à l'heure touche-t-il ce jour ? */
export const touche = (e: Evenement, jour: string) => !e.journee && bornesDuJour(e, jour) !== null;

export function disposer(evenements: Evenement[], jour: string): Place[] {
  const places = regrouper(evenements)
    .flatMap((copies) => { const evenement = copies[0]; const b = bornesDuJour(evenement, jour); return b ? [{ evenement, copies, ...b, colonne: 0, colonnes: 1 }] : []; })
    .sort((x, y) => x.debut - y.debut || y.fin - x.fin);

  // Des grappes d'événements qui se touchent ; dans chaque grappe, la première colonne libre.
  let grappe: Place[] = [];
  let finGrappe = -1;
  const clore = () => { const n = Math.max(1, ...grappe.map((p) => p.colonne + 1)); for (const p of grappe) p.colonnes = n; grappe = []; };
  for (const p of places) {
    // Un événement de zéro minute occupe quand même une ligne : on lui prête un quart d'heure.
    const fin = Math.max(p.fin, p.debut + 15);
    if (p.debut >= finGrappe) { clore(); finGrappe = -1; }
    const prises = new Set(grappe.filter((q) => Math.max(q.fin, q.debut + 15) > p.debut).map((q) => q.colonne));
    let c = 0;
    while (prises.has(c)) c++;
    p.colonne = c;
    grappe.push(p);
    finGrappe = Math.max(finGrappe, fin);
  }
  clore();
  return places;
}
