import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { affectation, journal, membre, presence, space } from "@/db/schema";
import { statistiques, type Statistiques } from "./stats";

/**
 * Les fenêtres sont glissantes (24 h, 7 jours), pas des jours calendaires.
 * L'activité se lit sur la présence et le journal — pas sur une dernière connexion,
 * que `membre` ne stocke pas.
 */
const spaceId = randomUUID();
const recent = randomUUID(), hier = randomUUID(), semaine = randomUUID(), ancien = randomUUID(), dormant = randomUUID();
const aff = randomUUID();

beforeAll(async () => {
  await db.insert(space).values({ id: spaceId, nom: "stats" });
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

describe("les compteurs de Membres", () => {
  it("compte les inscrits sur 1 et 7 jours, et l'activité via la présence ou le journal", async () => {
    const avant = await statistiques();
    const maintenant = new Date();
    const h25 = new Date(maintenant.getTime() - 25 * 3_600_000);
    const j3 = new Date(maintenant.getTime() - 3 * 24 * 3_600_000);
    const j8 = new Date(maintenant.getTime() - (8 * 24 + 1) * 3_600_000);
    const j10 = new Date(maintenant.getTime() - 10 * 24 * 3_600_000);

    await db.insert(membre).values([
      { id: recent, spaceId, nom: "Récent", email: `r-${spaceId}@t.co`, createdAt: maintenant },
      { id: hier, spaceId, nom: "Hier", email: `h-${spaceId}@t.co`, createdAt: h25 },
      { id: semaine, spaceId, nom: "Semaine", email: `s-${spaceId}@t.co`, createdAt: j3 },
      { id: ancien, spaceId, nom: "Ancien", email: `a-${spaceId}@t.co`, createdAt: j8 },
      { id: dormant, spaceId, nom: "Dormant", email: `d-${spaceId}@t.co`, createdAt: j8 },
    ]);
    await db.insert(affectation).values({ id: aff, spaceId, nom: `Client ${spaceId}`, couleur: "#F27313" });
    await db.insert(journal).values([
      { spaceId, affectationId: aff, auteurId: semaine, texte: "Point", createdAt: j3 },
      // Déjà compté par sa présence : les deux signaux ne font pas deux personnes.
      { spaceId, affectationId: aff, auteurId: ancien, texte: "Aussi là", createdAt: maintenant },
      { spaceId, affectationId: aff, auteurId: null, texte: "Sans auteur", createdAt: maintenant },
    ]);
    await db.insert(presence).values([
      { membreId: ancien, spaceId, page: "/", vuLe: maintenant },
      { membreId: dormant, spaceId, page: "/", vuLe: j10 },
    ]);

    const apres = await statistiques();
    const delta = (k: keyof Statistiques) => Number(apres[k]) - Number(avant[k]);
    expect(avant.active_users_1d).not.toBeNull();
    expect(avant.active_users_7d).not.toBeNull();
    expect(delta("total_users")).toBe(5);
    // Seul « Récent » est dans les dernières 24 h. « Hier » (25 h) entre dans les 7 jours, pas dans le jour.
    expect(delta("new_users_1d")).toBe(1);
    expect(delta("new_users_7d")).toBe(3);
    // Présence toute fraîche : le jour et la semaine. Journal de 3 jours : la semaine seulement.
    // Un pouls de 10 jours, et une note sans auteur, ne comptent pas.
    expect(delta("active_users_1d")).toBe(1);
    expect(delta("active_users_7d")).toBe(2);
  });
});
