import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { affectation, affectationMembre, membre, space } from "@/db/schema";
import { enCours } from "./affectations";

const spaceId = randomUUID(); const a = randomUUID(); const s = randomUUID(); const monka = randomUUID(); const afp = randomUUID();
beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "t" });
  await db.insert(membre).values([{ id: a, spaceId, nom: "Antoine", email: `a-${spaceId}@t.co` }, { id: s, spaceId, nom: "Stan", email: `s-${spaceId}@t.co` }]);
  await db.insert(affectation).values([{ id: monka, spaceId, nom: "MONKA", couleur: "#F27313" }, { id: afp, spaceId, nom: "AFP", couleur: "#4EA7FC" }]);
  await db.insert(affectationMembre).values([
    { spaceId, membreId: a, affectationId: monka, debut: "2026-09-01" },
    { spaceId, membreId: s, affectationId: afp, debut: "2026-08-20" },
    { spaceId, membreId: s, affectationId: monka, debut: "2026-09-05", fin: "2026-09-06" },
  ]);
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

describe("qui est sur quoi", () => {
  it("liste chaque Membre avec ses Affectations en cours, sans celles qui sont finies", async () => {
    const r = await enCours({ spaceId });
    expect(r.map((m) => [m.nom, m.affectations.map((x) => x.nom)])).toEqual([["Antoine", ["MONKA"]], ["Stan", ["AFP"]]]);
  });
});
