import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { membre, space, sujet } from "@/db/schema";
import { lister, modifier, poser, supprimer } from "./sujets";

/**
 * Les Sujets du Weekly. Deux règles portent tout : une semaine ne voit pas les Sujets d'une
 * autre, et n'importe qui écrit sur la liste de n'importe qui.
 */
const spaceId = randomUUID();
let antoine = "";
let stan = "";
const ctx = () => ({ spaceId, membreId: antoine });
const LUNDI = "2026-09-14";

beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "Test Sujets" });
  const [a] = await db.insert(membre).values({ spaceId, nom: "Antoine", email: `a-${spaceId}@test.co` }).returning({ id: membre.id });
  const [s] = await db.insert(membre).values({ spaceId, nom: "Stan", email: `s-${spaceId}@test.co` }).returning({ id: membre.id });
  antoine = a.id; stan = s.id;
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

describe("les Sujets du Weekly", () => {
  it("se posent sur la liste d'un autre : c'est une réunion, pas un dossier personnel", async () => {
    const pose = await poser(ctx(), { lundi: LUNDI, rubrique: "projects", membreId: stan, texte: "Le point sur AFP" });
    expect(pose.membreId).toBe(stan);
    expect(pose.auteur).toBe("Antoine");
  });

  it("ne débordent pas d'une semaine sur l'autre", async () => {
    await poser(ctx(), { lundi: "2026-09-21", rubrique: "wins", membreId: antoine, texte: "La semaine suivante" });
    const cette = await lister(ctx(), LUNDI);
    expect(cette.map((s) => s.texte)).toEqual(["Le point sur AFP"]);
  });

  it("se rangent dans leur encart", async () => {
    const pose = await poser(ctx(), { lundi: LUNDI, rubrique: "skills", membreId: antoine, texte: "Un skill" });
    expect(pose.rubrique).toBe("skills");
    const skills = (await lister(ctx(), LUNDI)).filter((s) => s.rubrique === "skills");
    expect(skills.map((s) => s.texte)).toContain("Un skill");
  });

  it("changent de personne sans changer de texte", async () => {
    const pose = await poser(ctx(), { lundi: LUNDI, rubrique: "wins", membreId: antoine, texte: "Le devis AFP signé" });
    const apres = await modifier(ctx(), pose.id, { membreId: stan });
    expect(apres.membreId).toBe(stan);
    expect(apres.texte).toBe("Le devis AFP signé");
  });

  it("gardent un lien tel quel — c'est comme ça qu'on partage un skill", async () => {
    const pose = await poser(ctx(), { lundi: LUNDI, rubrique: "skills", membreId: antoine, texte: "mon skill https://thecompanion.sh/skills" });
    expect(pose.texte).toContain("https://thecompanion.sh/skills");
  });

  it("se retirent sans cérémonie", async () => {
    const pose = await poser(ctx(), { lundi: LUNDI, rubrique: "wins", membreId: antoine, texte: "À retirer" });
    await supprimer(ctx(), pose.id);
    expect((await lister(ctx(), LUNDI)).map((s) => s.id)).not.toContain(pose.id);
  });

  it("refusent un Membre d'un autre Espace", async () => {
    await expect(poser(ctx(), { lundi: LUNDI, rubrique: "projects", membreId: randomUUID(), texte: "Ailleurs" })).rejects.toThrow(/Membre/);
  });

  it("refusent un texte vide — la base le refuse aussi", async () => {
    await expect(db.insert(sujet).values({ spaceId, lundi: LUNDI, membreId: antoine, texte: "   " })).rejects.toThrow();
  });
});
