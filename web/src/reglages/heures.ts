/** Petite arithmétique d'heures « HH:MM », au quart d'heure. Pure, testée. */
export const enMinutes = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
export const enHeure = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** ±15 minutes, sans sortir de la journée. */
export function decaler(h: string, quarts: number): string {
  return enHeure(Math.min(23 * 60 + 45, Math.max(0, enMinutes(h) + quarts * 15)));
}

/** Où mettre un nouveau Créneau : à midi si c'est libre, sinon le premier quart d'heure libre après. */
export function suivantLibre(heures: string[], depuis = "12:00"): string {
  const prises = new Set(heures);
  let m = enMinutes(depuis);
  while (m <= 23 * 60 + 45 && prises.has(enHeure(m))) m += 15;
  return enHeure(Math.min(m, 23 * 60 + 45));
}
