import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { creneau, membre, recurrence, space, tache } from "@/db/schema";
import type { Instant } from "@/relances/temps";
import { generer } from "./moteur";

const spaceId = randomUUID(); const victor = randomUUID(); const regleId = randomUUID();
const lundi = (heure: string): Instant => ({ jour: "2026-09-14", heure, jourSemaine: 1 });
const mardi: Instant = { jour: "2026-09-15", heure: "09:15", jourSemaine: 2 };

beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "t" });
  await db.insert(membre).values({ id: victor, spaceId, nom: "Victor", email: `v-${spaceId}@t.co` });
  await db.insert(creneau).values(["09:15", "14:00", "17:30"].map((heure) => ({ spaceId, membreId: victor, heure })));
  await db.insert(tache).values([
    { spaceId, titre: "Déjà là", bucket: "sur_le_feu", statut: "a_faire", assigneId: victor, engagement: "2026-09-14", rang: "1" },
    // L'occurrence de la semaine dernière, pas faite : ça ne change rien (règle 22).
    { spaceId, titre: "Post LinkedIn 3/3", bucket: "sur_le_feu", statut: "a_faire", assigneId: victor, engagement: "2026-09-11", rang: "2", recurrenceId: regleId },
  ]);
  await db.insert(recurrence).values({ id: regleId, spaceId, titre: "Post LinkedIn", assigneId: victor, frequence: "hebdomadaire", jourSemaine: 1, occurrences: 3, decalages: [0, 2, 4] });
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

const surLeFeu = () => db.select().from(tache).where(eq(tache.spaceId, spaceId)).orderBy(asc(tache.rang));

describe("le moteur de génération", () => {
  it("ne fabrique rien avant le premier Créneau du jour, ni un jour où la règle ne tombe pas", async () => {
    expect(await generer(lundi("08:00"), spaceId)).toEqual({ regles: 0, taches: 0 });
    expect(await generer(mardi, spaceId)).toEqual({ regles: 0, taches: 0 });
    expect(await surLeFeu()).toHaveLength(2);
  });

  it("le lundi à 09:15, fabrique Post LinkedIn 1/3, 2/3, 3/3 — Sur le feu, À faire, engagés lundi, mercredi, vendredi, à la suite", async () => {
    expect(await generer(lundi("09:15"), spaceId)).toEqual({ regles: 1, taches: 3 });
    const t = await surLeFeu();
    expect(t.map((x) => [x.titre, x.bucket, x.statut, x.engagement, x.assigneId === victor])).toEqual([
      ["Déjà là", "sur_le_feu", "a_faire", "2026-09-14", true],
      ["Post LinkedIn 3/3", "sur_le_feu", "a_faire", "2026-09-11", true],
      ["Post LinkedIn 1/3", "sur_le_feu", "a_faire", "2026-09-14", true],
      ["Post LinkedIn 2/3", "sur_le_feu", "a_faire", "2026-09-16", true],
      ["Post LinkedIn 3/3", "sur_le_feu", "a_faire", "2026-09-18", true],
    ]);
  });

  it("une seule fois par jour — même si le cron repasse à 14:00", async () => {
    expect(await generer(lundi("14:00"), spaceId)).toEqual({ regles: 0, taches: 0 });
    expect(await surLeFeu()).toHaveLength(5);
  });

  it("une règle désactivée ne fabrique rien", async () => {
    await db.update(recurrence).set({ actif: false, derniereGeneration: null }).where(eq(recurrence.id, regleId));
    expect(await generer(lundi("09:15"), spaceId)).toEqual({ regles: 0, taches: 0 });
  });
});
