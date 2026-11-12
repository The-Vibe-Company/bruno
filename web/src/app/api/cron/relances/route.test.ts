import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { creneau, membre, space } from "@/db/schema";
import { ajouter } from "@/api/creneaux";
import { oublierAgenda } from "@/relances/agenda";
import { GET } from "./route";

/**
 * Le cron entre deux Créneaux : il passe toutes les 15 minutes, mais ne réveille la base que
 * lorsqu'il a quelque chose à faire. Hors de Vercel, le cache d'exécution vit en mémoire.
 */
const spaceId = randomUUID(); const antoine = randomUUID();
const passer = async () => (await GET(new Request("https://bruno.test/api/cron/relances"))).json();
/** Un mardi, à Paris (UTC+1 en novembre). */
const aParis = (hhmm: string) => vi.setSystemTime(new Date(`2026-11-10T${hhmm}:00+01:00`));

beforeAll(async () => {
  delete process.env.CRON_SECRET;
  await db.insert(space).values({ id: spaceId, nom: "t" });
  await db.insert(membre).values({ id: antoine, spaceId, nom: "Antoine", email: `a-${spaceId}@t.co` });
  await db.insert(creneau).values(["09:15", "14:00", "17:30"].map((heure) => ({ spaceId, membreId: antoine, heure })));
  await oublierAgenda();
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(async () => { await oublierAgenda(); });
afterAll(async () => {
  vi.useRealTimers();
  await db.delete(space).where(eq(space.id, spaceId));
});

describe("le cron des Relances", () => {
  it("fait tout au premier passage, puis se repose jusqu'au prochain Créneau", async () => {
    aParis("10:07");
    expect(await passer()).not.toHaveProperty("repos");
    aParis("10:22");
    expect(await passer()).toMatchObject({ repos: true });
    aParis("13:52");
    expect(await passer()).toMatchObject({ repos: true });
  });

  it("le lendemain, il refait tout", async () => {
    aParis("10:07");
    await passer();
    vi.setSystemTime(new Date("2026-11-11T10:07:00+01:00"));
    expect(await passer()).not.toHaveProperty("repos");
  });

  it("un Créneau posé dans la journée est attendu dès le passage suivant", async () => {
    aParis("10:07");
    await passer();
    await ajouter({ spaceId, membreId: antoine }, "11:00");
    aParis("10:22");
    expect(await passer()).not.toHaveProperty("repos");
    aParis("10:37");
    expect(await passer()).toMatchObject({ repos: true });
    aParis("11:02");
    expect(await passer()).not.toHaveProperty("repos");
  });
});
