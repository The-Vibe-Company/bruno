import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { membre, space, tache } from "@/db/schema";
import * as I from "./images";

/**
 * Les images d'une Tâche. Ce qui compte : on n'y range que des images, pas n'importe quel poids,
 * et les octets ne sortent jamais des listes — seule la route qui les sert les lit.
 */
const spaceId = randomUUID(), moi = randomUUID();
const ctx = { spaceId, membreId: moi };
let tacheId = "";
const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");

beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "t" });
  await db.insert(membre).values({ id: moi, spaceId, nom: "Antoine", email: `a-${spaceId}@t.co` });
  const [t] = await db.insert(tache).values({ spaceId, titre: "Maquette", bucket: "idees", rang: "1" }).returning({ id: tache.id });
  tacheId = t.id;
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

describe("poser une image", () => {
  it("la garde, et n'en rend que le nom et le poids", async () => {
    const liste = await I.poser(ctx, tacheId, { nom: "capture.png", type: "image/png", contenu: png });
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ nom: "capture.png", type: "image/png", octets: png.byteLength });
    // Les octets ne voyagent pas avec la liste : c'est la route dédiée qui les sert.
    expect(Object.keys(liste[0])).toEqual(["id", "nom", "type", "octets"]);
    const servie = await I.contenu(ctx, liste[0].id);
    expect(Buffer.from(servie.contenu).equals(png)).toBe(true);
  });

  it("refuse ce qui n'est pas une image, et ce qui pèse trop", async () => {
    await expect(I.poser(ctx, tacheId, { nom: "notes.pdf", type: "application/pdf", contenu: png }))
      .rejects.toMatchObject({ statut: 422 });
    await expect(I.poser(ctx, tacheId, { nom: "gros.png", type: "image/png", contenu: Buffer.alloc(I.POIDS_MAX + 1) }))
      .rejects.toMatchObject({ statut: 422 });
  });

  it("se compte par Tâche, pour les cartes", async () => {
    expect((await I.comptes(ctx, [tacheId])).get(tacheId)).toBe(1);
    expect((await I.comptes(ctx, [])).size).toBe(0);
  });

  it("se retire, et n'appartient à personne en particulier", async () => {
    const [une] = await I.lister(ctx, tacheId);
    const { tacheId: rendue } = await I.retirer({ spaceId, membreId: randomUUID() }, une.id);
    expect(rendue).toBe(tacheId);
    expect(await I.lister(ctx, tacheId)).toEqual([]);
  });

  it("ne sort pas de son Espace", async () => {
    const liste = await I.poser(ctx, tacheId, { nom: "capture.png", type: "image/png", contenu: png });
    await expect(I.contenu({ spaceId: randomUUID() }, liste[0].id)).rejects.toMatchObject({ statut: 404 });
  });
});
