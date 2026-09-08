import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as T from "@/api/taches";
import { db } from "@/db/client";
import { membre, space } from "@/db/schema";
import { consigne, lire, type Modele } from "./analyser";
import { enrichir } from "./enrichir";

const spaceId = randomUUID(); const antoine = randomUUID(); const stan = randomUUID();
const ctx = { spaceId, membreId: antoine };
const repond = (json: unknown): Modele => ({ completer: async () => `Voici :\n${JSON.stringify(json)}` });
const casse: Modele = { completer: async () => { throw new Error("réseau"); } };

beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "t" });
  await db.insert(membre).values([{ id: antoine, spaceId, nom: "Antoine", email: `a-${spaceId}@t.co` }, { id: stan, spaceId, nom: "Stan", email: `s-${spaceId}@t.co` }]);
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

describe("l'Enrichissement", () => {
  it("nettoie le titre, pose l'Assigné et l'Engagement énoncés, garde la transcription, et remonte l'urgent en tête d'À trier", async () => {
    const avant = await T.creer(ctx, { titre: "un truc", bucket: "a_trier" });
    const brute = "euh faut que stan relance monka sur le devis demain c'est urgent";
    const t = await T.creer(ctx, { titre: brute, transcriptionBrute: brute, bucket: "a_trier" });
    expect(await enrichir(ctx, t.id, repond({ titre: "Relancer MONKA sur le devis", assigne: "stan", engagement: "2026-09-09", urgent: true }))).toBe(true);
    const apres = await T.obtenir(ctx, t.id);
    expect([apres.titre, apres.assigneId, apres.engagement, apres.bucket, apres.transcriptionBrute]).toEqual(["Relancer MONKA sur le devis", stan, "2026-09-09", "a_trier", brute]);
    const liste = await T.lister(ctx, { bucket: "a_trier", inclureTerminees: false });
    expect(liste.map((x) => x.id).indexOf(t.id)).toBeLessThan(liste.map((x) => x.id).indexOf(avant.id));
  });

  it("ne devine jamais : un prénom inconnu, une date absente, un JSON douteux — rien n'est posé", async () => {
    const t = await T.creer(ctx, { titre: "préparer le mail", bucket: "a_trier" });
    expect(await enrichir(ctx, t.id, repond({ titre: "Préparer le mail", assigne: "Gérard", engagement: null }))).toBe(true);
    let apres = await T.obtenir(ctx, t.id);
    expect([apres.titre, apres.assigneId, apres.engagement]).toEqual(["Préparer le mail", null, null]);
    expect(await enrichir(ctx, t.id, repond({ titre: "", engagement: "demain" }))).toBe(false);
    expect(await enrichir(ctx, t.id, { completer: async () => "je ne sais pas" })).toBe(false);
    apres = await T.obtenir(ctx, t.id);
    expect(apres.titre).toBe("Préparer le mail");
  });

  it("si le modèle échoue ou n'existe pas, la Tâche reste telle quelle — et rien ne casse", async () => {
    const t = await T.creer(ctx, { titre: "brut de décoffrage", bucket: "a_trier" });
    expect(await enrichir(ctx, t.id, casse)).toBe(false);
    expect(await enrichir(ctx, t.id, null)).toBe(false);
    expect((await T.obtenir(ctx, t.id)).titre).toBe("brut de décoffrage");
  });

  it("ne touche qu'aux Captures : une Tâche déjà triée est laissée à l'humain, et Sur le feu n'est jamais posé", async () => {
    const t = await T.creer(ctx, { titre: "une idée", bucket: "idees" });
    expect(await enrichir(ctx, t.id, repond({ titre: "Une idée propre", urgent: true }))).toBe(false);
    expect((await T.obtenir(ctx, t.id)).titre).toBe("une idée");
    expect(consigne({ texte: "", membres: [], aujourdhui: "2026-09-08", jourSemaine: "mardi" })).not.toMatch(/sur le feu/i);
    expect(lire('{"titre":"x","bucket":"sur_le_feu"}', { texte: "", membres: [], aujourdhui: "2026-09-08", jourSemaine: "mardi" })).not.toHaveProperty("bucket");
  });
});
