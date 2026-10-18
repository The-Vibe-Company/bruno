/**
 * Le MCP et les jetons qui l'ouvrent, contre un vrai Postgres.
 * Ce qui compte : un jeton ne voit que son Espace, un jeton révoqué ne parle plus,
 * et une Capture ne naît jamais Sur le feu.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mcp/route";
import { ErreurApi } from "@/api/erreurs";
import { creer as creerJeton, empreinteDe, revoquer } from "@/api/jetons";
import { membreCourant } from "@/api/membre-courant";
import * as T from "@/api/taches";
import { db } from "@/db/client";
import { jetonApi, membre, space, tache } from "@/db/schema";
import { appeler, OUTILS } from "./outils";

const spaceA = randomUUID();
const spaceB = randomUUID();
const antoine = randomUUID();
const stan = randomUUID();
const lea = randomUUID();
const ctxA = { spaceId: spaceA, membreId: antoine };
const ctxStan = { spaceId: spaceA, membreId: stan };
const ctxB = { spaceId: spaceB, membreId: lea };

const requete = (jeton?: string) => new Request("https://bruno.test/api/mcp", {
  headers: jeton ? { authorization: `Bearer ${jeton}` } : {},
});

beforeAll(async () => {
  process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "secret-de-test-suffisamment-long-pour-hs256";
  await db.insert(space).values([{ id: spaceA, nom: "A" }, { id: spaceB, nom: "B" }]);
  await db.insert(membre).values([
    { id: antoine, spaceId: spaceA, nom: "Antoine", email: `a-${spaceA}@t.co` },
    { id: stan, spaceId: spaceA, nom: "Stan", email: `s-${spaceA}@t.co` },
    { id: lea, spaceId: spaceB, nom: "Léa", email: `l-${spaceB}@t.co` },
  ]);
});
afterAll(async () => {
  await db.delete(space).where(eq(space.id, spaceA));
  await db.delete(space).where(eq(space.id, spaceB));
});
beforeEach(async () => {
  await db.delete(tache).where(eq(tache.spaceId, spaceA));
  await db.delete(tache).where(eq(tache.spaceId, spaceB));
});

describe("le jeton personnel", () => {
  it("ne garde que l'empreinte, et ouvre le même contexte qu'une session", async () => {
    const emis = await creerJeton(ctxA, { nom: "Grok de Stan" });
    expect(emis.jeton.startsWith("bruno_pat_")).toBe(true);

    const [ligne] = await db.select().from(jetonApi).where(eq(jetonApi.id, emis.id));
    expect(ligne.empreinte).toBe(empreinteDe(emis.jeton));
    expect(JSON.stringify(ligne)).not.toContain(emis.jeton);

    await expect(membreCourant(requete(emis.jeton))).resolves.toEqual(ctxA);
    const [apres] = await db.select().from(jetonApi).where(eq(jetonApi.id, emis.id));
    expect(apres.dernierUsage).toBeInstanceOf(Date);
  });

  it("refuse un jeton révoqué", async () => {
    const emis = await creerJeton(ctxA, { nom: "à couper" });
    await revoquer(ctxA, emis.id);
    await expect(membreCourant(requete(emis.jeton))).rejects.toMatchObject({
      code: "non_authentifie", message: "Jeton révoqué.",
    });
  });

  it("refuse le jeton d'un Membre désactivé", async () => {
    const emis = await creerJeton(ctxStan, { nom: "parti" });
    await db.update(membre).set({ actif: false }).where(eq(membre.id, stan));
    try {
      await expect(membreCourant(requete(emis.jeton))).rejects.toMatchObject({ code: "non_authentifie" });
    } finally {
      await db.update(membre).set({ actif: true }).where(eq(membre.id, stan));
    }
  });

  it("ne se révoque pas depuis un autre Membre", async () => {
    const emis = await creerJeton(ctxA, { nom: "à moi" });
    await expect(revoquer(ctxStan, emis.id)).rejects.toBeInstanceOf(ErreurApi);
    await expect(membreCourant(requete(emis.jeton))).resolves.toEqual(ctxA);
  });
});

describe("les outils", () => {
  it("un jeton ne voit que son Espace", async () => {
    const emis = await creerJeton(ctxA, { nom: "espace A" });
    const ctx = await membreCourant(requete(emis.jeton));
    await T.creer(ctxA, { titre: "chez A", bucket: "a_trier" });
    const ailleurs = await T.creer(ctxB, { titre: "chez B", bucket: "a_trier" });

    const liste = await appeler("list_tasks", ctx, {}) as { titre: string }[];
    expect(liste.map((t) => t.titre)).toEqual(["chez A"]);
    await expect(appeler("get_task", ctx, { id: ailleurs.id })).rejects.toMatchObject({ code: "introuvable" });

    const membres = await appeler("list_members", ctx, {}) as { nom: string }[];
    expect(membres.map((m) => m.nom).sort()).toEqual(["Antoine", "Stan"]);
  });

  it("create_task ne peut pas créer directement Sur le feu", async () => {
    await expect(appeler("create_task", ctxA, { titre: "directement", bucket: "sur_le_feu" })).rejects.toThrow();
    const lignes = await db.select().from(tache).where(eq(tache.spaceId, spaceA));
    expect(lignes).toHaveLength(0);

    const cree = await appeler("create_task", ctxA, { titre: "une capture" }) as { bucket: string; id: string };
    expect(cree.bucket).toBe("a_trier");
    const sur = await appeler("move_task", ctxA, { id: cree.id, bucket: "sur_le_feu", engagement: "2026-10-20" }) as { bucket: string; assigneId: string };
    expect(sur.bucket).toBe("sur_le_feu");
    expect(sur.assigneId).toBe(antoine);
  });

  it("bloque exige une raison ; terminer et abandonner passent", async () => {
    const cree = await T.creer(ctxA, { titre: "à finir", bucket: "a_trier" });
    await T.deplacer(ctxA, cree.id, { bucket: "sur_le_feu", engagement: "2026-10-20", statut: "a_faire" });
    await expect(appeler("set_task_status", ctxA, { id: cree.id, action: "bloque" })).rejects.toThrow(/raison/);
    const bloque = await appeler("set_task_status", ctxA, { id: cree.id, action: "bloque", raison: "en attente" }) as { statut: string };
    expect(bloque.statut).toBe("bloque");
    const finie = await appeler("set_task_status", ctxA, { id: cree.id, action: "terminer" }) as { etatTerminal: string };
    expect(finie.etatTerminal).toBe("termine");
    const rouverte = await appeler("set_task_status", ctxA, { id: cree.id, action: "rouvrir" }) as { etatTerminal: string | null };
    expect(rouverte.etatTerminal).toBeNull();
    const abandonnee = await appeler("set_task_status", ctxA, { id: cree.id, action: "abandonner" }) as { etatTerminal: string };
    expect(abandonnee.etatTerminal).toBe("abandonne");
  });

  it("n'offre pas de suppression, et annote lectures et fins", () => {
    expect(OUTILS.map((o) => o.nom)).toEqual([
      "list_tasks", "get_task", "create_task", "update_task", "move_task", "set_task_status", "postpone_task", "list_members",
    ]);
    expect(OUTILS.find((o) => o.nom === "list_tasks")?.annotations).toMatchObject({ readOnlyHint: true });
    expect(OUTILS.find((o) => o.nom === "get_task")?.annotations).toMatchObject({ readOnlyHint: true });
    expect(OUTILS.find((o) => o.nom === "list_members")?.annotations).toMatchObject({ readOnlyHint: true });
    expect(OUTILS.find((o) => o.nom === "set_task_status")?.annotations).toMatchObject({ destructiveHint: true });
  });

  it("journalise qui, quoi, quand", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      await appeler("list_members", ctxA, {});
      expect(spy).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[mcp\\] ${antoine} · list_members · \\d{4}-`)));
    } finally {
      spy.mockRestore();
    }
  });

  it("refuse la route sans jeton", async () => {
    const res = await POST(new Request("https://bruno.test/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    }));
    expect(res.status).toBe(401);
  });

  it("sert un appel d'outil en HTTP, au nom du jeton", async () => {
    const emis = await creerJeton(ctxA, { nom: "http" });
    const res = await POST(new Request("https://bruno.test/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${emis.jeton}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "list_members", arguments: {} },
      }),
    }));
    expect(res.status).toBe(200);
    const corps = await res.text();
    expect(corps).toContain("Antoine");
    expect(corps).not.toContain("Léa");
  });
});
