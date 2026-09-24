/**
 * Les opérations sur les Tâches, contre un vrai Postgres.
 *
 * On teste les règles du PRD, pas les getters : ce qui doit être refusé l'est, ce qui doit
 * être conservé l'est. Chaque fichier travaille dans son propre Espace, puis le supprime.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { affectation, membre, space, tache } from "@/db/schema";
import { ErreurApi } from "./erreurs";
import * as C from "./contrat";
import * as T from "./taches";

const spaceId = randomUUID();
const antoine = randomUUID();
const stan = randomUUID();
const ctx = { spaceId, membreId: antoine };
const DEMAIN = "2026-09-09";

beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "Test" });
  await db.insert(membre).values([
    { id: antoine, spaceId, nom: "Antoine", email: `a-${spaceId}@t.co` },
    { id: stan, spaceId, nom: "Stan", email: `s-${spaceId}@t.co` },
  ]);
  await db.insert(affectation).values({ spaceId, nom: "MONKA", couleur: "#F27313" });
});
afterAll(async () => {
  await db.delete(space).where(eq(space.id, spaceId));
});
beforeEach(async () => {
  await db.delete(tache).where(eq(tache.spaceId, spaceId));
});

const capture = (titre = "Relancer MONKA sur le devis") =>
  T.creer(ctx, { titre, bucket: "a_trier", transcriptionBrute: `« ${titre} »` });

describe("la Capture", () => {
  it("atterrit dans À trier, sans Assigné ni Engagement", async () => {
    const t = await capture();
    expect(t.bucket).toBe("a_trier");
    expect(t.assigneId).toBeNull();
    expect(t.engagement).toBeNull();
    expect(t.statut).toBeNull();
  });

  it("conserve la transcription brute", async () => {
    const t = await capture("faudrait relancer MONKA");
    expect(t.transcriptionBrute).toBe("« faudrait relancer MONKA »");
  });

  it("refuse un titre vide", async () => {
    await expect(T.creer(ctx, { titre: "   ", bucket: "a_trier" } as never)).rejects.toThrow();
  });
});

describe("le droit d'entrée Sur le feu", () => {
  it("refuse sans Assigné ni Engagement", async () => {
    const t = await capture();
    await expect(
      T.deplacer(ctx, t.id, { bucket: "sur_le_feu" } as never),
    ).rejects.toMatchObject({ code: "droit_entree_sur_le_feu" });
  });

  it("refuse avec l'Assigné seul", async () => {
    const t = await capture();
    await expect(
      T.deplacer(ctx, t.id, { bucket: "sur_le_feu", assigneId: antoine, statut: "a_faire" } as never),
    ).rejects.toMatchObject({ code: "droit_entree_sur_le_feu" });
  });

  it("accepte avec les deux, et pose le Statut", async () => {
    const t = await capture();
    const sur = await T.deplacer(ctx, t.id, {
      bucket: "sur_le_feu", assigneId: antoine, engagement: DEMAIN, statut: "a_faire",
    });
    expect(sur.bucket).toBe("sur_le_feu");
    expect(sur.statut).toBe("a_faire");
    expect(sur.engagement).toBe(DEMAIN);
  });

  it("laisse une Idée monter À venir puis redescendre, sans rien perdre", async () => {
    const t = await capture("Une newsletter");
    await T.deplacer(ctx, t.id, { bucket: "idees" });
    const aVenir = await T.deplacer(ctx, t.id, { bucket: "a_venir", engagement: DEMAIN });
    expect([aVenir.bucket, aVenir.engagement]).toEqual(["a_venir", DEMAIN]);
    const retour = await T.deplacer(ctx, t.id, { bucket: "idees" });
    // La date reste : une Idée qui en avait une la retrouvera si elle remonte.
    expect([retour.bucket, retour.engagement, retour.statut]).toEqual(["idees", DEMAIN, null]);
  });

  it("conserve Assigné et Engagement en sortant de Sur le feu (règle 7)", async () => {
    const t = await capture();
    await T.deplacer(ctx, t.id, {
      bucket: "sur_le_feu", assigneId: antoine, engagement: DEMAIN, statut: "a_faire",
    });
    const sortie = await T.deplacer(ctx, t.id, { bucket: "a_venir" });
    expect(sortie.bucket).toBe("a_venir");
    expect(sortie.assigneId).toBe(antoine);
    expect(sortie.engagement).toBe(DEMAIN);
    expect(sortie.statut).toBeNull();
  });
});

async function surLeFeu(titre?: string) {
  const t = await capture(titre);
  return T.deplacer(ctx, t.id, {
    bucket: "sur_le_feu", assigneId: antoine, engagement: DEMAIN, statut: "a_faire",
  });
}

describe("le Report", () => {
  it("déplace l'Engagement, incrémente le compteur et laisse une trace", async () => {
    const t = await surLeFeu();
    const apres = await T.reporter(ctx, t.id, { raison: "bloqué par la relecture", nouvelEngagement: "2026-09-10" });
    expect(apres.engagement).toBe("2026-09-10");
    expect(apres.reportsCount).toBe(1);
    const historique = await T.reports(ctx, t.id);
    expect(historique).toHaveLength(1);
    expect(historique[0].raison).toBe("bloqué par la relecture");
    expect(historique[0].ancienEngagement).toBe(DEMAIN);
  });

  it("refuse une raison vide", async () => {
    const t = await surLeFeu();
    await expect(
      T.reporter(ctx, t.id, { raison: "   ", nouvelEngagement: "2026-09-10" }),
    ).rejects.toMatchObject({ code: "raison_obligatoire" });
  });

  it("refuse de reporter une Tâche déjà terminée", async () => {
    const t = await surLeFeu();
    await T.terminer(ctx, t.id);
    await expect(
      T.reporter(ctx, t.id, { raison: "trop tard", nouvelEngagement: "2026-09-10" }),
    ).rejects.toMatchObject({ code: "deja_terminee" });
  });
});

describe("l'Engagement (invariant 4)", () => {
  it("Sur le feu, ne change pas par une simple modification — seulement par un Report", async () => {
    const t = await surLeFeu();
    await expect(T.modifier(ctx, t.id, { engagement: "2026-09-20" })).rejects.toMatchObject({ code: "engagement_par_report" });
    expect((await T.modifier(ctx, t.id, { engagement: DEMAIN })).engagement).toBe(DEMAIN); // inchangé : accepté
    const apres = await T.reporter(ctx, t.id, { raison: "trop de choses", nouvelEngagement: "2026-09-20" });
    expect(apres.engagement).toBe("2026-09-20");
  });

  it("se pose et se change librement tant qu'on n'est pas Sur le feu", async () => {
    const t = await capture();
    const v = await T.deplacer(ctx, t.id, { bucket: "a_venir", engagement: "2026-10-01" });
    expect(v.engagement).toBe("2026-10-01");
    expect((await T.modifier(ctx, t.id, { engagement: "2026-10-15" })).engagement).toBe("2026-10-15");
  });
});

describe("le compteur de Reports (BRU-22)", () => {
  it("historise chaque Report avec sa raison et son auteur", async () => {
    const t = await surLeFeu();
    await T.reporter({ spaceId, membreId: stan }, t.id, { raison: "bloqué par quelqu'un", nouvelEngagement: "2026-09-10" });
    const [h] = await T.reports(ctx, t.id);
    expect(h.auteur).toBe("Stan");
    expect(h.raison).toBe("bloqué par quelqu'un");
  });

  it("ne bloque jamais rien, même après beaucoup de Reports — c'est un signal, pas une punition", async () => {
    const t = await surLeFeu();
    for (let i = 1; i <= 6; i++) await T.reporter(ctx, t.id, { raison: `encore ${i}`, nouvelEngagement: `2026-09-${10 + i}` });
    expect((await T.obtenir(ctx, t.id)).reportsCount).toBe(6);
    expect((await T.changerStatut(ctx, t.id, { statut: "en_cours" })).statut).toBe("en_cours");
    expect((await T.terminer(ctx, t.id)).etatTerminal).toBe("termine");
  });

  it("compte les signaux : à trier, et reportées trois fois ou plus", async () => {
    await capture("une"); await capture("deux");
    const t = await surLeFeu("trois");
    for (let i = 1; i <= 3; i++) await T.reporter(ctx, t.id, { raison: "…", nouvelEngagement: `2026-09-1${i}` });
    const u = await surLeFeu("deux fois seulement");
    for (let i = 1; i <= 2; i++) await T.reporter(ctx, u.id, { raison: "…", nouvelEngagement: `2026-09-1${i}` });
    expect(await T.signaux(ctx)).toEqual({ aTrier: 2, reportees: 1 });
  });
});

describe("les fins", () => {
  it("Terminé et Abandonné sont deux états distincts", async () => {
    const a = await surLeFeu("une");
    const b = await surLeFeu("deux");
    expect((await T.terminer(ctx, a.id)).etatTerminal).toBe("termine");
    expect((await T.abandonner(ctx, b.id)).etatTerminal).toBe("abandonne");
  });

  it("une Tâche terminée quitte le board", async () => {
    const t = await surLeFeu();
    await T.terminer(ctx, t.id);
    expect(await T.lister(ctx, { inclureTerminees: false })).toHaveLength(0);
    expect(await T.lister(ctx, { inclureTerminees: true })).toHaveLength(1);
  });

  it("on ne termine pas deux fois", async () => {
    const t = await surLeFeu();
    await T.terminer(ctx, t.id);
    await expect(T.terminer(ctx, t.id)).rejects.toMatchObject({ code: "deja_terminee" });
  });

  it("Supprimer efface pour de bon", async () => {
    const t = await capture();
    await T.supprimer(ctx, t.id);
    await expect(T.obtenir(ctx, t.id)).rejects.toMatchObject({ code: "introuvable" });
  });
});

describe("le Rang", () => {
  it("place entre deux voisines sans jamais perdre en précision", async () => {
    const a = await capture("a");
    const b = await capture("b");
    const c = await capture("c");
    // On insère c entre a et b, cinquante fois de suite : un flottant aurait cédé.
    for (let i = 0; i < 50; i++) await T.reordonner(ctx, c.id, { avantId: a.id, apresId: b.id });
    const ordre = (await T.lister(ctx, { bucket: "a_trier", inclureTerminees: false })).map((t) => t.titre);
    expect(ordre).toEqual(["a", "c", "b"]);
  });

  it("remonter en tête place avant tout le monde", async () => {
    const a = await capture("a");
    const b = await capture("b");
    await T.reordonner(ctx, b.id, { apresId: a.id });
    const ordre = (await T.lister(ctx, { inclureTerminees: false })).map((t) => t.titre);
    expect(ordre).toEqual(["b", "a"]);
  });
});

describe("la liste", () => {
  it("filtre par Bucket et par Assigné, et cherche dans le texte", async () => {
    await capture("Relancer MONKA sur le devis");
    await capture("Préparer le mail Coup de Pâtes");
    const sur = await surLeFeu("Cadrage atelier AFP");
    await T.modifier(ctx, sur.id, { assigneId: stan });

    expect(await T.lister(ctx, { bucket: "a_trier", inclureTerminees: false })).toHaveLength(2);
    expect(await T.lister(ctx, { assigneId: stan, inclureTerminees: false })).toHaveLength(1);
    const trouve = await T.lister(ctx, { q: "MONKA", inclureTerminees: false });
    expect(trouve.map((t) => t.titre)).toEqual(["Relancer MONKA sur le devis"]);
  });
});

describe("les Aidants", () => {
  it("se remplacent en bloc et n'empêchent personne de terminer", async () => {
    const t = await surLeFeu();
    const avec = await T.modifier(ctx, t.id, { aidantIds: [stan] });
    expect(avec.aidantIds).toEqual([stan]);
    // Stan est seulement Aidant, et il peut quand même terminer : aucun verrou d'édition.
    const parStan = { spaceId, membreId: stan };
    expect((await T.terminer(parStan, t.id)).etatTerminal).toBe("termine");
  });
});

describe("les erreurs", () => {
  it("une Tâche d'un autre Espace est introuvable", async () => {
    const t = await capture();
    await expect(T.obtenir({ spaceId: randomUUID(), membreId: antoine }, t.id))
      .rejects.toBeInstanceOf(ErreurApi);
  });
});

describe("rouvrir une Tâche finie par erreur", () => {
  it("efface la fin et rien d'autre ; une Tâche vivante n'a rien à rouvrir", async () => {
    const t = await T.creer(ctx, { titre: "Terminée trop vite", bucket: "a_trier" });
    await T.deplacer(ctx, t.id, { bucket: "sur_le_feu", assigneId: antoine, engagement: "2026-09-08", statut: "en_cours" });
    await expect(T.rouvrir(ctx, t.id)).rejects.toMatchObject({ statut: 409 });
    await T.terminer(ctx, t.id);
    const r = await T.rouvrir(ctx, t.id);
    expect([r.etatTerminal, r.termineLe, r.bucket, r.statut, r.engagement]).toEqual([null, null, "sur_le_feu", "en_cours", "2026-09-08"]);
  });
});

describe("Bloqué, avec une raison", () => {
  it("bloquer exige une raison ; elle se lit, se change, et s'efface en sortant de Bloqué", async () => {
    const t = await T.creer(ctx, { titre: "Contrat AFP", bucket: "a_trier" });
    await T.deplacer(ctx, t.id, { bucket: "sur_le_feu", assigneId: antoine, engagement: "2026-09-08", statut: "a_faire" });
    expect(() => C.ChangerStatut.parse({ statut: "bloque" })).toThrow();
    expect(() => C.ChangerStatut.parse({ statut: "bloque", raison: " " })).toThrow(/pourquoi/);
    let b = await T.changerStatut(ctx, t.id, C.ChangerStatut.parse({ statut: "bloque", raison: "En attente de réponse" }));
    expect([b.statut, b.raisonBlocage]).toEqual(["bloque", "En attente de réponse"]);
    b = await T.modifier(ctx, t.id, { raisonBlocage: "En attente de validation" });
    expect(b.raisonBlocage).toBe("En attente de validation");
    b = await T.changerStatut(ctx, t.id, { statut: "en_cours" });
    expect([b.statut, b.raisonBlocage]).toEqual(["en_cours", null]);
    await expect(T.modifier(ctx, t.id, { raisonBlocage: "x" })).rejects.toMatchObject({ statut: 422 });
  });

  it("entrer Sur le feu directement dans Bloqué demande la raison — par le contrat, puis par la base", async () => {
    const t = await T.creer(ctx, { titre: "Accès serveur", bucket: "a_trier" });
    expect(() => C.DeplacerTache.parse({ bucket: "sur_le_feu", assigneId: antoine, engagement: "2026-09-08", statut: "bloque" })).toThrow(/pourquoi/);
    const b = await T.deplacer(ctx, t.id, C.DeplacerTache.parse({ bucket: "sur_le_feu", assigneId: antoine, engagement: "2026-09-08", statut: "bloque", raison: "Il manque une info" }));
    expect(b.raisonBlocage).toBe("Il manque une info");
    // La base refuse une Tâche à moitié débloquée : la raison et la date de blocage s'en vont avec le Statut.
    await expect(db.update(tache).set({ statut: "a_faire" }).where(eq(tache.id, t.id)))
      .rejects.toMatchObject({ cause: { constraint_name: expect.stringMatching(/^tache_(raison_blocage|blocage_date)$/) } });
  });
});

describe("dépendre d'une autre Tâche", () => {
  it("nomme ce qu'on attend, et l'oublie en débloquant", async () => {
    const attendue = await surLeFeu("Livrer les accès");
    const bloquee = await surLeFeu("Brancher l'intégration");

    await T.changerStatut(ctx, bloquee.id, { statut: "bloque", raison: "Dépend d'une autre Tâche", dependDeId: attendue.id });
    const [vue] = (await T.lister(ctx, { bucket: "sur_le_feu" } as never)).filter((t) => t.id === bloquee.id);
    expect(vue.dependDeId).toBe(attendue.id);
    // Le titre vient avec : la carte le dit sans aller le chercher.
    expect(vue.dependDe).toMatchObject({ id: attendue.id, titre: "Livrer les accès", etatTerminal: null });

    // Débloquer, c'est ne plus rien attendre.
    const libre = await T.changerStatut(ctx, bloquee.id, { statut: "a_faire" });
    expect(libre.dependDeId).toBeNull();
  });

  it("refuse de s'attendre soi-même, et d'attendre quand on n'est pas bloqué", async () => {
    const t = await surLeFeu("Seule au monde");
    await expect(T.modifier(ctx, t.id, { dependDeId: t.id })).rejects.toMatchObject({ statut: 422 });
    const autre = await surLeFeu("Une autre");
    await expect(T.modifier(ctx, t.id, { dependDeId: autre.id })).rejects.toMatchObject({ statut: 422 });
  });

  it("dit que ce qu'on attendait est terminé", async () => {
    const attendue = await surLeFeu("Valider le devis");
    const bloquee = await surLeFeu("Lancer la production");
    await T.changerStatut(ctx, bloquee.id, { statut: "bloque", raison: "Dépend d'une autre Tâche", dependDeId: attendue.id });
    await T.terminer(ctx, attendue.id);
    const [vue] = (await T.lister(ctx, { bucket: "sur_le_feu" } as never)).filter((t) => t.id === bloquee.id);
    expect(vue.dependDe?.etatTerminal).toBe("termine");
  });
});

describe("les Tâches finies, par jour de Bruno", () => {
  it("range chaque fin dans son jour, en heure de Paris — pas en UTC", async () => {
    const [a, b, c] = await db.insert(tache).values([
      { spaceId, titre: "Finie hier midi", bucket: "a_venir", etatTerminal: "termine", termineLe: new Date("2026-09-07T12:00:00Z"), rang: "900" },
      { spaceId, titre: "Finie hier tard, déjà aujourd'hui à Paris", bucket: "a_venir", etatTerminal: "abandonne", termineLe: new Date("2026-09-07T23:30:00Z"), rang: "901" },
      { spaceId, titre: "Finie avant-hier", bucket: "a_venir", etatTerminal: "termine", termineLe: new Date("2026-09-06T12:00:00Z"), rang: "902" },
    ]).returning({ id: tache.id });
    const hier = await T.terminees(ctx, "2026-09-07");
    expect(hier.map((t) => t.id)).toEqual([a.id]);
    expect(hier[0].jourFin).toBe("2026-09-07");
    expect((await T.terminees(ctx, "2026-09-08")).map((t) => t.id)).toEqual([b.id]);
    expect((await T.terminees(ctx, "2026-09-06", "2026-09-08")).map((t) => t.id)).toEqual([b.id, a.id, c.id]);
  });
});
