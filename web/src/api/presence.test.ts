import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { membre, space, tache } from "@/db/schema";
import { urlAvatar } from "@/lib/avatar-url";
import { battre } from "./presence";

/**
 * Le pouls. Ce qui compte : on ne se voit pas soi-même, et l'empreinte bouge dès que quelque
 * chose bouge — sinon l'écran des autres resterait figé.
 */
const spaceId = randomUUID(); const antoine = randomUUID(); const stan = randomUUID();
beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "t" });
  await db.insert(membre).values([
    { id: antoine, spaceId, nom: "Antoine", email: `a-${spaceId}@t.co` },
    { id: stan, spaceId, nom: "Stan", email: `s-${spaceId}@t.co` },
  ]);
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

describe("qui est là", () => {
  it("montre les autres, jamais soi-même", async () => {
    const seul = await battre({ spaceId, membreId: antoine }, "/");
    expect(seul.presents).toEqual([]);
    await battre({ spaceId, membreId: stan }, "/daily");
    const accompagne = await battre({ spaceId, membreId: antoine }, "/");
    expect(accompagne.presents.map((p) => [p.nom, p.page])).toEqual([["Stan", "/daily"]]);
  });

  it("suit la page qu'on regarde, sans empiler les lignes", async () => {
    await battre({ spaceId, membreId: stan }, "/fait");
    const vu = await battre({ spaceId, membreId: antoine }, "/");
    expect(vu.presents).toHaveLength(1);
    expect(vu.presents[0].page).toBe("/fait");
  });
});

describe("la photo", () => {
  it("voyage en adresse, la même que partout ailleurs, sans que la photo quitte la base", async () => {
    const photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    await db.update(membre).set({ avatar: photo }).where(eq(membre.id, stan));
    await battre({ spaceId, membreId: stan }, "/");
    const vu = await battre({ spaceId, membreId: antoine }, "/");
    expect(vu.presents[0].avatar).toBe(urlAvatar(stan, photo));
    expect(vu.presents[0].avatar).toMatch(/^\/api\/membres\/.+\/avatar\?v=[0-9a-f]{10}$/);
  });

  it("pas de photo, pas d'adresse", async () => {
    await db.update(membre).set({ avatar: null }).where(eq(membre.id, stan));
    await battre({ spaceId, membreId: stan }, "/");
    expect((await battre({ spaceId, membreId: antoine }, "/")).presents[0].avatar).toBeNull();
  });
});

describe("l'empreinte", () => {
  const moi = { spaceId, membreId: antoine };

  it("ne bouge pas quand rien ne bouge", async () => {
    expect((await battre(moi, "/")).version).toBe((await battre(moi, "/")).version);
  });

  it("bouge quand une Tâche naît, change, puis disparaît", async () => {
    const avant = (await battre(moi, "/")).version;
    const [{ id }] = await db.insert(tache).values({ spaceId, titre: "Née pendant le test", bucket: "a_trier", rang: "1" }).returning({ id: tache.id });
    const nee = (await battre(moi, "/")).version;
    expect(nee).not.toBe(avant);

    await db.update(tache).set({ titre: "Renommée", updatedAt: new Date() }).where(eq(tache.id, id));
    const renommee = (await battre(moi, "/")).version;
    expect(renommee).not.toBe(nee);

    await db.delete(tache).where(eq(tache.id, id));
    expect((await battre(moi, "/")).version).not.toBe(renommee);
  });
});
