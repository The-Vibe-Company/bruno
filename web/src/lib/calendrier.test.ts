import { describe, expect, it } from "vitest";
import { decalerMois, grilleDuMois, libelleMois, moisDe } from "./dates";

/** La grille d'un calendrier : ce qui casse, c'est toujours un bord — un 1er dimanche, un janvier. */
describe("la grille d'un mois", () => {
  it("commence un lundi, même quand le mois commence un mardi", () => {
    const g = grilleDuMois("2026-09-01");
    expect(g[0][0]).toBe("2026-08-31"); // le lundi d'avant
    expect(g[0][1]).toBe("2026-09-01");
    expect(g).toHaveLength(6);
    expect(g[0]).toHaveLength(7);
  });

  it("fait toujours six semaines : la fenêtre ne saute pas d'un mois à l'autre", () => {
    for (const mois of ["2026-02-01", "2026-03-01", "2026-11-01", "2027-08-01"]) {
      expect(grilleDuMois(mois)).toHaveLength(6);
      expect(grilleDuMois(mois).flat()).toHaveLength(42);
    }
  });

  it("enchaîne les jours sans trou ni doublon", () => {
    const jours = grilleDuMois("2026-02-01").flat();
    expect(new Set(jours).size).toBe(42);
    expect(jours[0]).toBe("2026-01-26");
    expect(jours[41]).toBe("2026-03-08");
  });
});

describe("passer d'un mois à l'autre", () => {
  it("franchit décembre dans les deux sens", () => {
    expect(decalerMois("2026-12-01", 1)).toBe("2027-01-01");
    expect(decalerMois("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("part du mois d'un jour quelconque", () => {
    expect(moisDe("2026-09-17")).toBe("2026-09-01");
    expect(libelleMois("2026-09-01")).toBe("septembre 2026");
  });
});
