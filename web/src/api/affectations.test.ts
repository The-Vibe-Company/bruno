import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { affectation, affectationMembre, membre, space } from "@/db/schema";
import { activer, ajouter, enCours, lister } from "./affectations";
import { tache } from "@/db/schema";

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

describe("la liste des Affectations", () => {
  it("s'enrichit d'une ligne, refuse un doublon, se désactive et se réactive — jamais ne se supprime", async () => {
    const ctx = { spaceId };
    await ajouter(ctx, "Bergamote", "#4CB782");
    await expect(ajouter(ctx, "Bergamote", "#000000")).rejects.toMatchObject({ code: "requete_invalide" });
    const b = (await lister(ctx)).find((a) => a.nom === "Bergamote")!;
    expect((await activer(ctx, b.id, false)).find((a) => a.id === b.id)!.actif).toBe(false);
    expect((await activer(ctx, b.id, true)).find((a) => a.id === b.id)!.actif).toBe(true);
    expect(await lister(ctx)).toHaveLength(3);
  });

  it("ne se pose jamais sur une Tâche : aucune colonne de ce genre", () => {
    const colonnes = Object.keys(tache).map((c) => c.toLowerCase());
    expect(colonnes.filter((c) => c.includes("affectation") || c.includes("client"))).toEqual([]);
  });
});
