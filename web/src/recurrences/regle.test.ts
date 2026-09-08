import { describe, expect, it } from "vitest";
import { libelleEngagement, libelleFrequence, occurrencesDe, prochaineDate, titreOccurrence, tombe } from "./regle";

const postLinkedIn = { titre: "Post LinkedIn", frequence: "hebdomadaire" as const, jourSemaine: 1, jourMois: null, decalages: [0, 2, 4] };

describe("ce qu'une Récurrence fabrique", () => {
  it("le lundi, « Post LinkedIn » en 3 occurrences : lundi, mercredi, vendredi, numérotées n/N", () => {
    expect(occurrencesDe(postLinkedIn, "2026-09-07")).toEqual([
      { numero: 1, titre: "Post LinkedIn 1/3", engagement: "2026-09-07" },
      { numero: 2, titre: "Post LinkedIn 2/3", engagement: "2026-09-09" },
      { numero: 3, titre: "Post LinkedIn 3/3", engagement: "2026-09-11" },
    ]);
    expect(occurrencesDe(postLinkedIn, "2026-09-07").map((o) => libelleEngagement(postLinkedIn, "2026-09-07", o.engagement))).toEqual(["lundi", "mercredi", "vendredi"]);
  });

  it("une seule occurrence garde son titre nu", () => {
    expect(titreOccurrence("Facturation mensuelle", 1, 1)).toBe("Facturation mensuelle");
  });

  it("sait quand elle tombe, et quand elle tombera", () => {
    expect(tombe(postLinkedIn, "2026-09-07")).toBe(true);
    expect(tombe(postLinkedIn, "2026-09-08")).toBe(false);
    expect(prochaineDate(postLinkedIn, "2026-09-08")).toBe("2026-09-14");
    const facture = { frequence: "mensuelle" as const, jourSemaine: null, jourMois: 1 };
    expect(tombe(facture, "2026-10-01")).toBe(true);
    expect(prochaineDate(facture, "2026-09-08")).toBe("2026-10-01");
    expect(libelleFrequence(postLinkedIn)).toBe("chaque lundi");
    expect(libelleFrequence(facture)).toBe("le 1 du mois");
    expect(libelleEngagement(facture, "2026-10-01", "2026-10-03")).toBe("+2 j");
  });
});
