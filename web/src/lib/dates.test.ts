import { describe, expect, it } from "vitest";
import { demain, libelleJour, libelleLong, libelleReport, lundiProchain } from "./dates";

describe("le nom d'un jour", () => {
  const ref = "2026-09-08";
  it("dit aujourd'hui, demain, hier", () => {
    expect(libelleJour("2026-09-08", ref)).toBe("aujourd'hui");
    expect(libelleJour("2026-09-09", ref)).toBe("demain");
    expect(libelleJour("2026-09-07", ref)).toBe("hier");
  });
  it("sinon donne la date, et jamais « en retard » — Bruno n'a pas de retard", () => {
    expect(libelleJour("2026-09-04", ref)).toBe("4 sept.");
    expect(libelleJour("2026-10-01", ref)).toBe("1 oct.");
  });
  it("écrit l'en-tête en toutes lettres", () => {
    expect(libelleLong("2026-09-08")).toBe("mardi 8 septembre");
  });
});

describe("les raccourcis de date", () => {
  it("demain, c'est demain", () => { expect(demain("2026-09-08")).toBe("2026-09-09"); expect(demain("2026-12-31")).toBe("2027-01-01"); });
  it("lundi, c'est le prochain — jamais aujourd'hui", () => {
    expect(lundiProchain("2026-09-08")).toBe("2026-09-14"); // mardi → lundi suivant
    expect(lundiProchain("2026-09-07")).toBe("2026-09-14"); // un lundi → celui d'après
    expect(lundiProchain("2026-09-13")).toBe("2026-09-14"); // dimanche → demain
  });
});

describe("le bouton qui reporte", () => {
  it("dit à quand", () => {
    expect(libelleReport("2026-09-09", "2026-09-08")).toBe("Reporter à demain");
    expect(libelleReport("2026-09-14", "2026-09-08")).toBe("Reporter à lundi");
    expect(libelleReport("2026-09-20", "2026-09-08")).toBe("Reporter au 20 sept.");
  });
});
