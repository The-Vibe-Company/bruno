/**
 * Comment on nomme un jour. Une date passée s'affiche simplement comme une date : Bruno ne
 * juge pas, il compte les Reports.
 */
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

const utc = (jour: string) => Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10));
/** De `a` à `b`, en jours entiers — négatif si `b` précède `a`. */
export const joursEntre = (a: string, b: string): number => Math.round((utc(b) - utc(a)) / 86_400_000);

export function libelleJour(jour: string, ref: string = aujourdhui()): string {
  const delta = joursEntre(ref, jour);
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

/** « Reporter à demain », « à lundi », « au 20 sept. » — le libellé du bouton qui engage. */
export function libelleReport(jour: string, ref: string = aujourdhui()): string {
  const l = libelleJour(jour, ref);
  if (l === "demain") return "Reporter à demain";
  if (jour === lundiProchain(ref)) return "Reporter à lundi";
  return `Reporter au ${l}`;
}

/**
 * Le nom du dernier jour travaillé : « Hier », ou « Vendredi » un lundi matin. Dire « Hier » en
 * montrant vendredi, c'est faux — et on lit le Daily à voix haute.
 */
export function libelleDernierJour(jour: string, ref: string = aujourdhui()): string {
  if (jour === veille(ref)) return "Hier";
  const l = libelleLong(jour);
  return l.charAt(0).toUpperCase() + l.slice(1);
}

/**
 * « auj. », « 3 j », « 2 sem. », « 1 mois » — depuis quand on est dessus, en petit. Court exprès :
 * ça s'écrit dans des colonnes étroites, et « aujourd'hui » y prenait trois fois la place du reste.
 */
export function libelleDuree(depuis: string, ref: string = aujourdhui()): string {
  const j = joursEntre(depuis, ref);
  if (j <= 0) return "auj.";
  if (j < 7) return `${j} j`;
  if (j < 30) return `${Math.floor(j / 7)} sem.`;
  return `${Math.floor(j / 30)} mois`;
}

/**
 * « bloqué aujourd'hui », « bloqué depuis 3 j ». Une Tâche bloquée ne dit pas sa date du jour :
 * ce qu'on veut savoir, c'est depuis combien de temps elle attend quelqu'un.
 */
export function libelleBlocage(depuis: string, ref: string = aujourdhui()): string {
  const jour = depuis.slice(0, 10);
  return joursEntre(jour, ref) <= 0 ? "bloqué aujourd'hui" : `bloqué depuis ${libelleDuree(jour, ref)}`;
}

export const veille = (ref: string = aujourdhui()): string => decale(-1, ref);
/** Le jour ouvré d'avant — le vendredi quand on est lundi. C'est lui que le Daily appelle « hier ». */
export function jourOuvrePrecedent(ref: string = aujourdhui()): string {
  let j = decale(-1, ref);
  while ([0, 6].includes(new Date(j + "T12:00:00Z").getUTCDay())) j = decale(-1, j);
  return j;
}

/** Le lundi de la semaine d'un jour — c'est lui qui nomme la semaine dans Fait. */
export function lundiDe(jour: string): string {
  const js = new Date(jour + "T12:00:00Z").getUTCDay(); // 0 = dimanche
  return decale(-((js + 6) % 7), jour);
}
export const dimancheDe = (lundi: string): string => decale(6, lundi);
/** « Semaine du 1 septembre ». */
export function libelleSemaine(lundi: string): string {
  return "Semaine du " + libelleDate(lundi);
}

/** « 14 septembre » — le jour et son mois, sans l'année ni le jour de la semaine. */
export function libelleDate(jour: string): string {
  return new Date(jour + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
}

/** Le mois d'un jour, au premier : « 2026-09-17 » → « 2026-09-01 ». */
export const moisDe = (jour: string): string => `${jour.slice(0, 7)}-01`;

/** Le mois d'avant, le mois d'après — en restant sur le 1er, qui existe tous les mois. */
export function decalerMois(mois: string, n: number): string {
  const total = +mois.slice(0, 4) * 12 + (+mois.slice(5, 7) - 1) + n;
  return `${String(Math.floor(total / 12)).padStart(4, "0")}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

/** « septembre 2026 », pour l'en-tête du calendrier. */
export const libelleMois = (mois: string): string =>
  new Date(mois + "T12:00:00Z").toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Les six semaines d'un calendrier, lundi en tête. Six et pas cinq : un mois de 31 jours qui
 * commence un dimanche en occupe six, et une grille qui change de hauteur d'un mois à l'autre
 * fait sauter le reste de la fenêtre.
 *
 * Les jours des mois voisins y sont : une grille trouée se lit moins bien qu'une grille grise.
 */
export function grilleDuMois(mois: string): string[][] {
  const premier = new Date(mois + "T12:00:00Z");
  const depuisLundi = (premier.getUTCDay() + 6) % 7; // 0 = lundi
  const debut = decale(-depuisLundi, premier.toISOString().slice(0, 10));
  return Array.from({ length: 6 }, (_, semaine) =>
    Array.from({ length: 7 }, (_, jour) => decale(semaine * 7 + jour, debut)));
}
