/**
 * Le moteur : à chaque quart d'heure, qui doit être relancé, et de quoi. Il lit tout et n'écrit
 * qu'une chose — la trace de ce qui est parti — pour ne jamais envoyer deux fois.
 */
import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { natures } from "@/api/creneaux";
import { db } from "@/db/client";
import { affectation, affectationMembre, creneau, membre, relanceEnvoyee, tache } from "@/db/schema";
import { composer, type Message, type Nature, type Situation } from "./composer";
import { estJourOuvre, instant, type Instant } from "./temps";

export type RelanceDue = { spaceId: string; membreId: string; nom: string; heure: string; nature: Nature; message: Message };

export interface Livreur { livrer(r: RelanceDue): Promise<void>; }

/** Le livreur d'aujourd'hui : le journal. APNs le remplacera (BRU-25) — le moteur n'y verra rien. */
export const livreurJournal: Livreur = {
  async livrer(r) { console.info(`[relance] ${r.nom} · ${r.heure} · ${r.message.titre} — ${r.message.corps.replace(/\n/g, " / ")}`); },
};

const joursEntre = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);

/** L'état d'un Membre, tel que la Relance le regarde. */
export async function situation(spaceId: string, membreId: string, jour: string): Promise<Situation> {
  const vivantesAMoi = and(eq(tache.spaceId, spaceId), eq(tache.assigneId, membreId), isNull(tache.etatTerminal));
  const [engagees, aVenir, affs] = await Promise.all([
    db.select().from(tache).where(and(vivantesAMoi, eq(tache.bucket, "sur_le_feu"), lte(tache.engagement, jour))).orderBy(asc(tache.rang)),
    db.select().from(tache).where(and(vivantesAMoi, eq(tache.bucket, "a_venir"), lte(tache.engagement, jour))).orderBy(asc(tache.engagement)),
    db.select({ nom: affectation.nom, debut: affectationMembre.debut }).from(affectationMembre)
      .innerJoin(affectation, eq(affectation.id, affectationMembre.affectationId))
      .where(and(eq(affectationMembre.membreId, membreId), isNull(affectationMembre.fin))),
  ]);
  return {
    jour,
    affectations: affs.map((a) => ({ nom: a.nom, depuis: a.debut, joursOuverts: joursEntre(a.debut, jour) })),
    engagees: engagees.map((t) => ({ id: t.id, titre: t.titre, statut: t.statut!, engagement: t.engagement!, reportsCount: t.reportsCount })),
    aVenirArrivees: aVenir.map((t) => ({ id: t.id, titre: t.titre, engagement: t.engagement! })),
  };
}

/** Qui a un Créneau maintenant, et ce que sa Relance dirait. Ne livre rien. `spaceId` restreint la portée (tests, dépannage). */
export async function relancesDues(i: Instant = instant(), spaceId?: string): Promise<RelanceDue[]> {
  if (!estJourOuvre(i)) return [];
  const dus = await db.select({ spaceId: creneau.spaceId, membreId: creneau.membreId, nom: membre.nom })
    .from(creneau).innerJoin(membre, eq(membre.id, creneau.membreId))
    .where(and(eq(creneau.heure, i.heure), eq(membre.actif, true), spaceId ? eq(creneau.spaceId, spaceId) : undefined));
  const resultats: RelanceDue[] = [];
  for (const d of dus) {
    const tous = await db.select({ heure: creneau.heure }).from(creneau).where(eq(creneau.membreId, d.membreId));
    const nature = natures(tous.map((c) => c.heure.slice(0, 5))).find((n) => n.heure === i.heure)?.nature;
    if (!nature) continue;
    const message = composer(nature, await situation(d.spaceId, d.membreId, i.jour));
    if (message) resultats.push({ ...d, heure: i.heure, nature, message });
  }
  return resultats;
}

/** Livre ce qui est dû, une fois et une seule : la trace en base fait barrage à tout doublon. */
export async function relancer(livreur: Livreur = livreurJournal, i: Instant = instant(), spaceId?: string): Promise<{ dues: number; envoyees: number; dejaEnvoyees: number }> {
  const dues = await relancesDues(i, spaceId);
  let envoyees = 0, dejaEnvoyees = 0;
  for (const r of dues) {
    const inseree = await db.insert(relanceEnvoyee)
      .values({ spaceId: r.spaceId, membreId: r.membreId, jour: i.jour, heure: r.heure, nature: r.nature, titre: r.message.titre, corps: r.message.corps })
      .onConflictDoNothing().returning({ id: relanceEnvoyee.id });
    if (inseree.length === 0) { dejaEnvoyees++; continue; }
    await livreur.livrer(r);
    envoyees++;
  }
  return { dues: dues.length, envoyees, dejaEnvoyees };
}

/** Pour le Daily et le dépannage : ce qui est parti aujourd'hui. */
export const envoyeesDuJour = (spaceId: string, jour: string) =>
  db.select().from(relanceEnvoyee).where(and(eq(relanceEnvoyee.spaceId, spaceId), sql`${relanceEnvoyee.jour} = ${jour}`)).orderBy(asc(relanceEnvoyee.heure));
