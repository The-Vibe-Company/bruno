import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { affectation, affectationMembre, membre, space } from "@/db/schema";
import * as J from "./journal";

/**
 * Le journal d'une Affectation. Ce qui compte : il raconte le temps (qui est dessus, qui y est
 * passé), il ne s'édite pas, et on n'efface que ses propres lignes.
 */
const spaceId = randomUUID();
const antoine = randomUUID(), stan = randomUUID();
const afp = randomUUID();
const ctx = { spaceId, membreId: antoine };
const ctxStan = { spaceId, membreId: stan };

beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "t" });
  await db.insert(membre).values([
    { id: antoine, spaceId, nom: "Antoine", email: `a-${spaceId}@t.co` },
    { id: stan, spaceId, nom: "Stan", email: `s-${spaceId}@t.co` },
  ]);
  await db.insert(affectation).values({ id: afp, spaceId, nom: "AFP", couleur: "#4EA7FC" });
  await db.insert(affectationMembre).values([
    { spaceId, membreId: antoine, affectationId: afp, debut: "2026-09-01" },
    { spaceId, membreId: stan, affectationId: afp, debut: "2026-06-01", fin: "2026-08-31" },
  ]);
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

describe("l'état des lieux", () => {
  it("dit qui est dessus aujourd'hui, et qui y est passé", async () => {
    const vue = await J.etat(ctx, afp);
    expect(vue.nom).toBe("AFP");
    expect(vue.dessus.map((p) => p.nom)).toEqual(["Antoine"]);
    // Tout le monde figure dans les passages, du plus récent au plus ancien.
    expect(vue.passages.map((p) => p.nom)).toEqual(["Antoine", "Stan"]);
    expect(vue.passages[1].fin).toBe("2026-08-31");
  });

  it("refuse une Affectation d'un autre Espace", async () => {
    await expect(J.etat({ spaceId: randomUUID(), membreId: antoine }, afp)).rejects.toMatchObject({ statut: 404 });
  });
});

describe("écrire au journal", () => {
  it("empile, du plus récent au plus ancien, signé", async () => {
    await J.ecrire(ctx, afp, "Devis envoyé.");
    const vue = await J.ecrire(ctxStan, afp, "Ils ont signé.");
    expect(vue.entrees.map((e) => e.texte)).toEqual(["Ils ont signé.", "Devis envoyé."]);
    expect(vue.entrees[0].auteur?.nom).toBe("Stan");
    // « deMoi » est relatif à celui qui regarde : c'est lui qui ouvre le droit d'effacer.
    expect(vue.entrees.map((e) => e.deMoi)).toEqual([true, false]);
  });

  it("n'efface que ce qu'on a écrit soi-même", async () => {
    const vue = await J.etat(ctx, afp);
    const deStan = vue.entrees.find((e) => e.auteur?.nom === "Stan")!;
    await expect(J.effacer(ctx, deStan.id)).rejects.toMatchObject({ statut: 422 });
    const { affectationId } = await J.effacer(ctxStan, deStan.id);
    expect(affectationId).toBe(afp);
    expect((await J.etat(ctx, afp)).entrees.map((e) => e.texte)).toEqual(["Devis envoyé."]);
  });

  it("compte ce qu'il y a dessus et la dernière nouvelle, pour le tableau", async () => {
    const [ligne] = (await J.tableau(ctx)).filter((a) => a.id === afp);
    expect(ligne.dessus).toBe(1);
    expect(ligne.notes).toBe(1);
    expect(ligne.derniere).not.toBeNull();
  });
});
