import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { creneau, membre, space, tache } from "@/db/schema";
import { relancer, relancesDues, type Livreur } from "./moteur";
import type { Instant } from "./temps";

const spaceId = randomUUID(); const antoine = randomUUID(); const stan = randomUUID();
const mardi: Instant = { jour: "2026-09-08", heure: "09:15", jourSemaine: 2 };
const samedi: Instant = { ...mardi, jour: "2026-09-12", jourSemaine: 6 };

beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "t" });
  await db.insert(membre).values([{ id: antoine, spaceId, nom: "Antoine", email: `a-${spaceId}@t.co` }, { id: stan, spaceId, nom: "Stan", email: `s-${spaceId}@t.co` }]);
  await db.insert(creneau).values([
    ...["09:15", "14:00", "17:30"].map((heure) => ({ spaceId, membreId: antoine, heure })),
    ...["08:00", "12:00", "18:00"].map((heure) => ({ spaceId, membreId: stan, heure })),
  ]);
  await db.insert(tache).values([
    { spaceId, titre: "Relancer MONKA", bucket: "sur_le_feu", statut: "a_faire", assigneId: antoine, engagement: "2026-09-08", rang: "1" },
    { spaceId, titre: "Vieille promesse", bucket: "sur_le_feu", statut: "a_faire", assigneId: antoine, engagement: "2026-09-04", rang: "2" },
    { spaceId, titre: "Pour plus tard", bucket: "sur_le_feu", statut: "a_faire", assigneId: antoine, engagement: "2026-09-20", rang: "3" },
    { spaceId, titre: "Comité", bucket: "a_venir", assigneId: antoine, engagement: "2026-09-08", rang: "4" },
    { spaceId, titre: "Truc de Stan", bucket: "sur_le_feu", statut: "a_faire", assigneId: stan, engagement: "2026-09-08", rang: "5" },
  ]);
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

describe("le moteur de Relance", () => {
  it("à 09:15 un mardi, relance Antoine — et pas Stan, dont le Créneau est à 08:00", async () => {
    const dues = await relancesDues(mardi, spaceId);
    expect(dues.map((r) => [r.nom, r.nature])).toEqual([["Antoine", "point_du_matin"]]);
    const corps = dues[0].message.corps;
    expect(corps).toContain("2 Tâches engagées aujourd'hui — Relancer MONKA · Vieille promesse.");
    expect(corps).not.toContain("Pour plus tard");
    expect(corps).toContain("Comité — les passer Sur le feu ?");
  });

  it("ne relance personne le samedi", async () => {
    expect(await relancesDues(samedi, spaceId)).toEqual([]);
  });

  it("livre une fois, et une seule — même si le cron repasse", async () => {
    const livrees: string[] = [];
    const livreur: Livreur = { async livrer(r) { livrees.push(`${r.nom} ${r.heure}`); } };
    const a = await relancer(livreur, mardi, spaceId);
    const b = await relancer(livreur, mardi, spaceId);
    expect(livrees).toEqual(["Antoine 09:15"]);
    // « Vieille promesse » était engagée avant ce mardi : le premier passage la ramène au jour.
    expect(a).toEqual({ dues: 1, envoyees: 1, dejaEnvoyees: 0, generees: 0, glissees: 1 });
    expect(b).toEqual({ dues: 1, envoyees: 0, dejaEnvoyees: 1, generees: 0, glissees: 0 });
  });
});
