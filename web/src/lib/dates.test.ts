import { describe, expect, it } from "vitest";
import { libelleJour, libelleLong } from "./dates";

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
