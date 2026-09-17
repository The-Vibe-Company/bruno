import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { membre, report, space, tache } from "@/db/schema";
import * as T from "@/api/taches";
import { glisser } from "@/api/taches";

/**
 * Le glissement du matin. Ce qui compte : une Tâche en retard revient sur la table du jour avec
 * **un** Report, jamais deux ; rien ne bouge le week-end ; et le cron peut repasser sans rien
 * abîmer.
 */
const spaceId = randomUUID(); const moi = randomUUID();

const poser = async (bucket: "sur_le_feu" | "a_venir", engagement: string | null, etatTerminal: "termine" | null = null,
                     statut: "a_faire" | "bloque" = "a_faire") => {
  const [t] = await db.insert(tache).values({
    spaceId, titre: `t-${randomUUID().slice(0, 8)}`, bucket, rang: "1", statut: bucket === "sur_le_feu" ? statut : null,
    assigneId: moi, engagement, etatTerminal, termineLe: etatTerminal ? new Date() : null,
    raisonBlocage: statut === "bloque" ? "en attente de quelqu'un" : null,
    bloqueLe: bucket === "sur_le_feu" && statut === "bloque" ? new Date("2026-09-14T09:00:00Z") : null,
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

describe("ce qui est bloqué ne glisse pas", () => {
  it("attend quelqu'un, ce n'est pas un Report — elle garde sa date et son compteur", async () => {
    const bloquee = await poser("sur_le_feu", "2026-09-15", null, "bloque");
    expect((await glisser("2026-09-16", spaceId)).glissees).toBe(0);
    const apres = await relire(bloquee);
    expect(apres.engagement).toBe("2026-09-15");
    expect(apres.reportsCount).toBe(0);
    expect(await reportsDe(bloquee)).toEqual([]);
  });
});

describe("reporter à la main après un glissement", () => {
  it("remplace le Report du matin au lieu de s'y ajouter : un seul report vécu, un seul compté", async () => {
    const t = await poser("sur_le_feu", "2026-09-15");
    await glisser("2026-09-16", spaceId);
    expect((await relire(t)).reportsCount).toBe(1);

    await T.reporter({ spaceId, membreId: moi }, t, { raison: "pas le temps", nouvelEngagement: "2026-09-21" });

    const apres = await relire(t);
    expect(apres.engagement).toBe("2026-09-21");
    expect(apres.reportsCount).toBe(1); // et non 2

    const traces = await reportsDe(t);
    expect(traces).toHaveLength(1);
    // La date de départ est celle d'avant le glissement : « 15 → 21 », pas « 16 → 21 ».
    expect(traces[0].ancienEngagement).toBe("2026-09-15");
    expect(traces[0].nouvelEngagement).toBe("2026-09-21");
    expect(traces[0].auteurId).toBe(moi);
  });

  it("un Report ordinaire, lui, compte normalement", async () => {
    const t = await poser("sur_le_feu", "2026-09-30");
    await T.reporter({ spaceId, membreId: moi }, t, { raison: "pas le temps", nouvelEngagement: "2026-10-01" });
    expect((await relire(t)).reportsCount).toBe(1);
    await T.reporter({ spaceId, membreId: moi }, t, { raison: "toujours pas", nouvelEngagement: "2026-10-02" });
    expect((await relire(t)).reportsCount).toBe(2);
    expect(await reportsDe(t)).toHaveLength(2);
  });
});
