import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { creneau, membre, space } from "@/db/schema";
import * as K from "./creneaux";

const spaceId = randomUUID(); const moi = randomUUID(); const ctx = { spaceId, membreId: moi };
beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "t" });
  await db.insert(membre).values({ id: moi, spaceId, nom: "Antoine", email: `a-${spaceId}@t.co` });
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });
beforeEach(async () => {
  await db.delete(creneau).where(eq(creneau.membreId, moi));
  await db.insert(creneau).values(["09:15", "14:00", "17:30"].map((heure) => ({ spaceId, membreId: moi, heure })));
});

describe("la nature d'un Créneau se déduit de sa position", () => {
  it("premier = Point du matin, dernier = Bilan, le reste = Rappels", () => {
    expect(K.natures(["17:30", "09:15", "14:00", "16:00"]).map((n) => `${n.heure} ${n.nature}`))
      .toEqual(["09:15 point_du_matin", "14:00 rappel", "16:00 rappel", "17:30 bilan"]);
  });
  it("se recalcule quand on déplace une heure", async () => {
    const avant = await K.lister(ctx);
    const rappel = avant.find((c) => c.nature === "rappel")!;
    const apres = await K.deplacer(ctx, rappel.id, "08:00"); // le Rappel passe devant : il devient le Point du matin
    expect(apres.map((c) => `${c.heure} ${c.nature}`)).toEqual(["08:00 point_du_matin", "09:15 rappel", "17:30 bilan"]);
  });
});

describe("trois au minimum", () => {
  it("refuse de retirer quand on est à trois", async () => {
    const [premier] = await K.lister(ctx);
    await expect(K.retirer(ctx, premier.id)).rejects.toMatchObject({ code: "minimum_creneaux" });
  });
  it("laisse retirer dès qu'on est à quatre", async () => {
    await K.ajouter(ctx, "11:00");
    const liste = await K.lister(ctx);
    const apres = await K.retirer(ctx, liste.find((c) => c.heure === "11:00")!.id);
    expect(apres).toHaveLength(3);
  });
});

describe("au quart d'heure", () => {
  it("refuse 09:07 — c'est la base qui le dit, et l'API le traduit", async () => {
    await expect(K.ajouter(ctx, "09:07")).rejects.toMatchObject({ code: "requete_invalide" });
  });
  it("refuse deux Créneaux à la même heure", async () => {
    await expect(K.ajouter(ctx, "14:00")).rejects.toMatchObject({ code: "requete_invalide" });
  });
});
