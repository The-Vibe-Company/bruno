import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { membre, report, space, tache } from "@/db/schema";
import { glisser } from "@/api/taches";

/**
 * Le glissement du matin. Ce qui compte : une Tâche en retard revient sur la table du jour avec
 * **un** Report, jamais deux ; rien ne bouge le week-end ; et le cron peut repasser sans rien
 * abîmer.
 */
const spaceId = randomUUID(); const moi = randomUUID();

const poser = async (bucket: "sur_le_feu" | "a_venir", engagement: string | null, etatTerminal: "termine" | null = null) => {
  const [t] = await db.insert(tache).values({
    spaceId, titre: `t-${randomUUID().slice(0, 8)}`, bucket, rang: "1", statut: bucket === "sur_le_feu" ? "a_faire" : null,
    assigneId: moi, engagement, etatTerminal, termineLe: etatTerminal ? new Date() : null,
  }).returning({ id: tache.id });
  return t.id;
};
const relire = async (id: string) => (await db.select().from(tache).where(eq(tache.id, id)))[0];
const reportsDe = (id: string) => db.select().from(report).where(eq(report.tacheId, id));

beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "t" });
  await db.insert(membre).values({ id: moi, spaceId, nom: "Antoine", email: `a-${spaceId}@t.co` });
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

describe("le glissement du matin", () => {
  it("ramène une Tâche en retard sur aujourd'hui, et compte un Report", async () => {
    const hier = await poser("sur_le_feu", "2026-09-15");
    expect(await glisser("2026-09-16", spaceId)).toEqual({ glissees: 1 });

    const apres = await relire(hier);
    expect(apres.engagement).toBe("2026-09-16");
    expect(apres.reportsCount).toBe(1);

    const [trace] = await reportsDe(hier);
    expect(trace.ancienEngagement).toBe("2026-09-15");
    expect(trace.nouvelEngagement).toBe("2026-09-16");
    expect(trace.auteurId).toBeNull(); // personne ne l'a reporté : le temps a passé
  });

  it("ne repasse pas deux fois : le cron bat tous les quarts d'heure", async () => {
    expect(await glisser("2026-09-16", spaceId)).toEqual({ glissees: 0 });
    const [encoreUne] = await db.select().from(tache).where(and(eq(tache.spaceId, spaceId), eq(tache.bucket, "sur_le_feu")));
    expect(encoreUne.reportsCount).toBe(1);
  });

  it("ne touche ni à ce qui est fini, ni à ce qui attend ailleurs, ni au jour même", async () => {
    const finie = await poser("sur_le_feu", "2026-09-14", "termine");
    const aVenir = await poser("a_venir", "2026-09-14");
    const aujourdhui = await poser("sur_le_feu", "2026-09-16");
    expect(await glisser("2026-09-16", spaceId)).toEqual({ glissees: 0 });
    for (const id of [finie, aVenir, aujourdhui]) {
      expect((await relire(id)).reportsCount).toBe(0);
    }
    expect((await relire(finie)).engagement).toBe("2026-09-14");
  });

  // Le week-end, c'est le moteur qui ne l'appelle pas : `glisser` ne connaît que le jour qu'on lui donne.
  it("du vendredi au lundi, un seul Report — parce qu'il n'est pas appelé samedi ni dimanche", async () => {
    const vendredi = await poser("sur_le_feu", "2026-09-18");

    expect((await glisser("2026-09-21", spaceId)).glissees).toBeGreaterThanOrEqual(1);
    const apres = await relire(vendredi);
    expect(apres.engagement).toBe("2026-09-21");
    expect(apres.reportsCount).toBe(1);
  });
});
