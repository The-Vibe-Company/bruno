import { describe, expect, it } from "vitest";
import { estJourOuvre, instant, instantDepuis } from "./temps";

describe("le temps de Bruno", () => {
  it("parle en heure de Paris, au quart d'heure", () => {
    // 07:22 UTC un mardi de septembre = 09:22 à Paris → Créneau 09:15
    expect(instant(new Date("2026-09-08T07:22:00Z"))).toEqual({ jour: "2026-09-08", heure: "09:15", jourSemaine: 2 });
    // 22:59 UTC = 00:59 le lendemain à Paris → 00:45, jour suivant
    expect(instant(new Date("2026-09-08T22:59:00Z"))).toEqual({ jour: "2026-09-09", heure: "00:45", jourSemaine: 3 });
  });
  it("sait qu'on ne relance pas le week-end", () => {
    expect(estJourOuvre(instant(new Date("2026-09-11T10:00:00Z")))).toBe(true);  // vendredi
    expect(estJourOuvre(instant(new Date("2026-09-12T10:00:00Z")))).toBe(false); // samedi
    expect(estJourOuvre(instant(new Date("2026-09-13T10:00:00Z")))).toBe(false); // dimanche
  });
});

describe("rejouer un instant", () => {
  it("lit « 2026-09-08T09:22 » comme mardi 09:15, heure de Paris", () => {
    expect(instantDepuis("2026-09-08T09:22")).toEqual({ jour: "2026-09-08", heure: "09:15", jourSemaine: 2 });
    expect(instantDepuis("2026-09-13T10:00")?.jourSemaine).toBe(7);
    expect(instantDepuis("n'importe quoi")).toBeNull();
  });
});
