import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { affectation, affectationMembre, membre, space } from "@/db/schema";
import { activer, ajouter, auJour, enCours, fermer, historique, lister, poser } from "./affectations";
import { tache } from "@/db/schema";
import { instant } from "@/relances/temps";

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

describe("hier, qui était sur quoi", () => {
  it("compte une période finie ce jour-là, et pas celle qui a commencé après", async () => {
    const r = await auJour({ spaceId }, "2026-09-05");
    expect(r.map((m) => [m.nom, m.affectations.map((x) => x.nom)])).toEqual([["Antoine", ["MONKA"]], ["Stan", ["AFP", "MONKA"]]]);
    expect((await auJour({ spaceId }, "2026-08-25")).map((m) => m.affectations.map((x) => x.nom))).toEqual([[], ["AFP"]]);
  });
});

describe("aujourd'hui je suis sur…", () => {
  const ctx = { spaceId };
  it("se pose pour aujourd'hui, plusieurs à la fois, et ne double jamais", async () => {
    await poser(ctx, a, afp);
    await poser(ctx, a, afp);
    const moi = (await enCours(ctx)).find((m) => m.membreId === a)!;
    expect(moi.affectations.map((x) => [x.nom, x.depuis])).toEqual([["MONKA", "2026-09-01"], ["AFP", instant().jour]]);
  });

  it("refuse une Affectation désactivée", async () => {
    await activer(ctx, afp, false);
    await expect(poser(ctx, s, afp)).rejects.toMatchObject({ code: "affectation_desactivee" });
    await activer(ctx, afp, true);
  });

  it("« je ne suis plus dessus » pose la fin au jour même et garde l'histoire", async () => {
    const sur = (await enCours(ctx)).find((m) => m.membreId === a)!.affectations.find((x) => x.nom === "AFP")!;
    const apres = await fermer(ctx, sur.id);
    expect(apres.find((m) => m.membreId === a)!.affectations.map((x) => x.nom)).toEqual(["MONKA"]);
    const h = await historique(ctx, a);
    expect(h.map((x) => [x.nom, x.jusqu])).toEqual([["AFP", instant().jour], ["MONKA", null]]);
    expect(await db.select().from(affectationMembre).where(eq(affectationMembre.id, sur.id))).toHaveLength(1);
  });

  it("hier j'étais sur MONKA : l'historique de Stan garde la période finie", async () => {
    expect((await historique(ctx, s)).map((x) => [x.nom, x.depuis, x.jusqu])).toEqual([["MONKA", "2026-09-05", "2026-09-06"], ["AFP", "2026-08-20", null]]);
  });

  it("ni Engagement, ni Statut, ni Rang, ni Report, ni case à cocher sur une Affectation", () => {
    const interdits = /engagement|statut|rang|report|jours|pourcent|demi/;
    for (const table of [affectation, affectationMembre]) {
      expect(Object.keys(table).filter((c) => interdits.test(c.toLowerCase()))).toEqual([]);
    }
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
