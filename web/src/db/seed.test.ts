/** Relancer les données de départ ne doit rien changer : c'est la seule chose à prouver. */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "./client";
import { compter, poserBase, poserDemo } from "./seed";
import { creneau, membre, space } from "./schema";

/** Un Espace jetable : les tests ne touchent jamais à l'Espace de départ, ni à la démo locale. */
const SPACE_ID = randomUUID();
afterAll(async () => { await db.delete(space).where(eq(space.id, SPACE_ID)); });

describe("les données de départ", () => {
  it("se posent, puis ne bougent plus quand on relance", async () => {
    await poserBase(undefined, SPACE_ID);
    const a = await compter(SPACE_ID);
    await poserBase(undefined, SPACE_ID);
    expect(await compter(SPACE_ID)).toEqual(a);
    expect(a.affectations).toBe(5);
    expect(a.creneaux).toBe(a.membres * 3);
  });

  it("respecte les Créneaux qu'un Membre a retirés", async () => {
    await poserBase(undefined, SPACE_ID);
    const [m] = await db.select().from(membre).where(eq(membre.spaceId, SPACE_ID));
    await db.delete(creneau).where(eq(creneau.membreId, m.id));
    await db.insert(creneau).values({ spaceId: SPACE_ID, membreId: m.id, heure: "08:00" });
    await poserBase(undefined, SPACE_ID);
    const restants = await db.select().from(creneau).where(eq(creneau.membreId, m.id));
    expect(restants.map((c) => c.heure)).toEqual(["08:00:00"]);
  });

  it("la démo remplit le board et se relance sans doublons", async () => {
    await poserDemo(SPACE_ID);
    const a = await compter(SPACE_ID);
    await poserDemo(SPACE_ID);
    expect(await compter(SPACE_ID)).toEqual(a);
    expect(a.taches).toBe(19);
    expect(a.membres).toBe(3);
  });
});
