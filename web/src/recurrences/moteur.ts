/**
 * Le moteur de génération — BRU-33. Le jour où une règle tombe, au premier Créneau de son
 * Assigné (pour apparaître dans le Point du matin), il fabrique ses Tâches : Sur le feu, À faire,
 * numérotées n/N, Engagements échelonnés. Une seule fois par jour, quoi qu'il arrive au cron.
 *
 * Les Tâches fabriquées sont des Tâches parfaitement ordinaires : rien ici ne les relit jamais
 * (règle 20). Si l'occurrence précédente n'est pas faite, on génère quand même et on ne signale
 * rien (règle 22) — les deux se retrouvent côte à côte dans la liste, ça suffit.
 */
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { traduire } from "@/api/erreurs";
import { fabriquer } from "@/api/taches";
import { db } from "@/db/client";
import { creneau, membre, recurrence } from "@/db/schema";
import { instant, type Instant } from "@/relances/temps";
import { occurrencesDe, tombe } from "./regle";

export type Generation = { regles: number; taches: number };

/** Fabrique ce qui est dû à cet instant. `spaceId` restreint la portée (tests, dépannage). */
export async function generer(i: Instant = instant(), spaceId?: string): Promise<Generation> {
  const premierCreneau = db.select({ h: sql<string>`min(${creneau.heure})::text` }).from(creneau).where(eq(creneau.membreId, recurrence.assigneId));
  const regles = await db
    .select({ regle: recurrence, premierCreneau: sql<string | null>`(${premierCreneau})` })
    .from(recurrence)
    .innerJoin(membre, eq(membre.id, recurrence.assigneId))
    .where(and(
      eq(recurrence.actif, true), eq(membre.actif, true),
      or(isNull(recurrence.derniereGeneration), sql`${recurrence.derniereGeneration} <> ${i.jour}`),
      spaceId ? eq(recurrence.spaceId, spaceId) : undefined,
    ));

  let nbRegles = 0, nbTaches = 0;
  for (const { regle, premierCreneau: h } of regles) {
    if (!tombe(regle, i.jour)) continue;
    if (h && h.slice(0, 5) > i.heure) continue; // pas avant le premier Créneau du jour
    const faites = await traduire(() => db.transaction(async (tx) => {
      // Le verrou : une seule exécution pose la date du jour, les autres ne trouvent rien à faire.
      const [prise] = await tx.update(recurrence).set({ derniereGeneration: i.jour })
        .where(and(eq(recurrence.id, regle.id), or(isNull(recurrence.derniereGeneration), sql`${recurrence.derniereGeneration} <> ${i.jour}`)))
        .returning({ id: recurrence.id });
      if (!prise) return 0;
      return fabriquer(tx, regle, occurrencesDe(regle, i.jour));
    }));
    if (faites > 0) { nbRegles++; nbTaches += faites; }
  }
  return { regles: nbRegles, taches: nbTaches };
}
