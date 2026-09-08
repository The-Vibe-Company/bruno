import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { membre, space } from "@/db/schema";
import * as C from "./contrat";
import { creer, lister, modifier, supprimer } from "./recurrences";

const spaceId = randomUUID(); const victor = randomUUID(); const ctx = { spaceId };
beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "t" });
  await db.insert(membre).values({ id: victor, spaceId, nom: "Victor", email: `v-${spaceId}@t.co` });
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

describe("les Récurrences", () => {
  it("se créent, se modifient, se suppriment — l'Assigné est obligatoire et les décalages commencent à 0", async () => {
    const r = await creer(ctx, C.PoserRecurrence.parse({ titre: "Post LinkedIn", assigneId: victor, frequence: "hebdomadaire", jourSemaine: 1, decalages: [0, 2, 4] }));
    expect(r.occurrences).toBe(3);
    expect(() => C.PoserRecurrence.parse({ titre: "x", frequence: "hebdomadaire", decalages: [0] })).toThrow();
    expect(() => C.PoserRecurrence.parse({ titre: "x", assigneId: victor, frequence: "hebdomadaire", decalages: [1, 2] })).toThrow(/jour même/);
    expect(() => C.PoserRecurrence.parse({ titre: "x", assigneId: victor, frequence: "mensuelle", jourMois: 31, decalages: [0] })).toThrow(/bancals/);
    const m = await modifier(ctx, r.id, C.PoserRecurrence.parse({ titre: "Post LinkedIn", assigneId: victor, frequence: "mensuelle", jourMois: 1, decalages: [0] }));
    expect([m.frequence, m.jourMois, m.jourSemaine, m.occurrences]).toEqual(["mensuelle", 1, null, 1]);
    await supprimer(ctx, r.id);
    expect(await lister(ctx)).toEqual([]);
    await expect(creer(ctx, { titre: "x", assigneId: randomUUID(), frequence: "hebdomadaire", jourSemaine: 1, decalages: [0] })).rejects.toMatchObject({ code: "introuvable" });
  });
});
