/**
 * Le temps de Bruno. Une équipe, un fuseau : `BRUNO_FUSEAU`, Europe/Paris par défaut.
 * Tout ce qui compte se calcule dans ce fuseau — le jour, le quart d'heure — jamais en UTC.
 */
export const FUSEAU = process.env.BRUNO_FUSEAU ?? "Europe/Paris";

export type Instant = { jour: string; heure: string; jourSemaine: number };

/** Le jour (AAAA-MM-JJ), l'heure ramenée au quart d'heure (HH:MM) et le jour de semaine (1 = lundi … 7 = dimanche), dans le fuseau. */
export function instant(maintenant: Date = new Date(), fuseau: string = FUSEAU): Instant {
  const parties = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: fuseau, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false })
      .formatToParts(maintenant).map((p) => [p.type, p.value]),
  );
  const minutes = Number(parties.minute) - (Number(parties.minute) % 15);
  const heure = `${String(Number(parties.hour) % 24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const jours: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { jour: `${parties.year}-${parties.month}-${parties.day}`, heure, jourSemaine: jours[parties.weekday] };
}

/** Pas de Relance le samedi ni le dimanche (règle 15). */
export const estJourOuvre = (i: Instant) => i.jourSemaine <= 5;

/**
 * Rejouer un instant, pour le dépannage : « 2026-09-08T09:15 » lu **dans le fuseau de Bruno**.
 * On ne le fait pas en passant par UTC : on construit l'Instant directement.
 */
export function instantDepuis(texte: string): Instant | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(texte);
  if (!m) return null;
  const [, jour, h, mn] = m;
  const minutes = Number(mn) - (Number(mn) % 15);
  const js = new Date(jour + "T12:00:00Z").getUTCDay(); // 0 = dimanche
  return { jour, heure: `${h}:${String(minutes).padStart(2, "0")}`, jourSemaine: js === 0 ? 7 : js };
}
