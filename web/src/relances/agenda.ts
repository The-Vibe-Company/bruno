/**
 * L'agenda du cron : les quarts d'heure d'aujourd'hui où il y a quelque chose à faire.
 *
 * Vercel appelle le cron toutes les 15 minutes, jour et nuit. Chaque passage réveillait la base,
 * et Neon ne se rendort qu'après cinq minutes de silence : la base restait éveillée un tiers du
 * temps pour, la plupart du temps, ne rien trouver. Le 11 novembre 2026, elle a dépassé son quota.
 *
 * Or l'on sait d'avance quand le moteur a du travail :
 * - au premier passage du jour — le glissement de la veille, les Récurrences de qui n'a pas de Créneau ;
 * - à l'heure d'un Créneau — la Relance, et les Récurrences qui attendaient le premier Créneau.
 *
 * Le premier passage complet du jour note ces heures dans le cache d'exécution de Vercel, hors de
 * la base ; les passages suivants le lisent et, entre deux Créneaux, s'en vont sans rien réveiller.
 *
 * Rien ne doit pouvoir se perdre : un agenda absent, illisible ou d'un autre jour, c'est un passage
 * complet, comme avant. Toucher un Créneau ou une Récurrence oublie l'agenda, et il expire de
 * lui-même au bout de quelques heures — un oubli raté ne coûte jamais plus que ça.
 */
import { getCache } from "@vercel/functions";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { creneau, membre } from "@/db/schema";
import { estJourOuvre, type Instant } from "./temps";

export type Agenda = { jour: string; heures: string[] };

const CLE = "relances:agenda";
const ETIQUETTE = "relances-agenda";
/** Au-delà, l'agenda expire et le passage suivant refait tout : la borne de ce qu'un oubli raté peut coûter. */
const DUREE = 6 * 3600;

/**
 * Les heures où le moteur a du travail, ce jour-là. Pure : c'est la règle, testée telle quelle.
 *
 * En semaine, chaque Créneau porte une Relance. Le week-end, il n'y a pas de Relance (règle 15) :
 * seul le premier Créneau de chacun compte, parce que les Récurrences l'attendent.
 */
export function heuresUtiles(creneaux: { membreId: string; heure: string }[], i: Instant): string[] {
  if (estJourOuvre(i)) return [...new Set(creneaux.map((c) => c.heure))].sort();
  const premier = new Map<string, string>();
  for (const c of creneaux) {
    const avant = premier.get(c.membreId);
    if (!avant || c.heure < avant) premier.set(c.membreId, c.heure);
  }
  return [...new Set(premier.values())].sort();
}

/** Ce passage peut-il s'en aller sans toucher la base ? Dans le doute, non. */
export function rienAFaire(agenda: Agenda | null | undefined, i: Instant): boolean {
  return !!agenda && agenda.jour === i.jour && Array.isArray(agenda.heures) && !agenda.heures.includes(i.heure);
}

export async function lireAgenda(): Promise<Agenda | null> {
  try { return ((await getCache().get(CLE)) as Agenda | null) ?? null; }
  catch { return null; }
}

/** Après un passage complet : noter, pour le reste du jour, quand revenir. */
export async function noterAgenda(i: Instant): Promise<void> {
  try {
    const lignes = await db.select({ membreId: creneau.membreId, heure: creneau.heure })
      .from(creneau).innerJoin(membre, eq(membre.id, creneau.membreId))
      .where(eq(membre.actif, true));
    const agenda: Agenda = { jour: i.jour, heures: heuresUtiles(lignes.map((l) => ({ ...l, heure: l.heure.slice(0, 5) })), i) };
    await getCache().set(CLE, agenda, { ttl: DUREE, tags: [ETIQUETTE], name: "agenda des relances" });
  } catch (e) {
    // Sans agenda, chaque passage refait tout : plus cher, jamais faux.
    console.warn("[relances] agenda non noté", e);
  }
}

/** Un Créneau ou une Récurrence vient de changer : le prochain passage refera tout. */
export async function oublierAgenda(): Promise<void> {
  try { await getCache().expireTag(ETIQUETTE); }
  catch (e) { console.warn("[relances] agenda non oublié", e); }
}
