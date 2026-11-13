import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sceller } from "@/agenda/coffre";
import { db } from "@/db/client";
import { agenda, membre, space } from "@/db/schema";
import { colorer, lister } from "./agendas";
import { ColorerAgenda } from "./contrat";

/**
 * La couleur d'un Agenda. Ce qui compte : sans choix, il n'en a pas — il suit son Membre ; un
 * choix se reprend ; et on ne colore pas l'Agenda d'un autre Espace.
 */
const spaceId = randomUUID(); const ailleurs = randomUUID();
const antoine = randomUUID(); const etranger = randomUUID();
const perso = randomUUID(); const sienDAilleurs = randomUUID();
const ctx = { spaceId, membreId: antoine };

beforeAll(async () => {
  await db.insert(space).values([{ id: spaceId, nom: "t" }, { id: ailleurs, nom: "u" }]);
  await db.insert(membre).values([
    { id: antoine, spaceId, nom: "Antoine", email: `a-${spaceId}@t.co` },
    { id: etranger, spaceId: ailleurs, nom: "Autre", email: `x-${ailleurs}@t.co` },
  ]);
  await db.insert(agenda).values([
    { id: perso, spaceId, membreId: antoine, fournisseur: "ical", nom: "Perso", secret: sceller("https://exemple.fr/a.ics") },
    { id: sienDAilleurs, spaceId: ailleurs, membreId: etranger, fournisseur: "ical", nom: "Ailleurs", secret: sceller("https://exemple.fr/b.ics") },
  ]);
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); await db.delete(space).where(eq(space.id, ailleurs)); });

describe("la couleur d'un Agenda", () => {
  it("n'en a pas tant qu'on n'en choisit pas : il suit son Membre", async () => {
    expect((await lister(ctx)).find((a) => a.id === perso)?.couleur).toBeNull();
  });

  it("se choisit, et se reprend", async () => {
    const colore = await colorer(ctx, perso, "#4cb782");
    expect(colore.find((a) => a.id === perso)?.couleur).toBe("#4CB782");
    const repris = await colorer(ctx, perso, null);
    expect(repris.find((a) => a.id === perso)?.couleur).toBeNull();
  });

  it("ne touche pas l'Agenda d'un autre Espace", async () => {
    await expect(colorer(ctx, sienDAilleurs, "#EB5757")).rejects.toMatchObject({ statut: 404 });
    const [l] = await db.select({ couleur: agenda.couleur }).from(agenda).where(eq(agenda.id, sienDAilleurs));
    expect(l.couleur).toBeNull();
  });

  it("refuse ce qui n'est pas une couleur #RRGGBB", () => {
    expect(ColorerAgenda.safeParse({ couleur: "rouge" }).success).toBe(false);
    expect(ColorerAgenda.safeParse({ couleur: "#F27313" }).success).toBe(true);
    expect(ColorerAgenda.safeParse({ couleur: null }).success).toBe(true);
  });
});
