import { describe, expect, it } from "vitest";
import { decaler, suivantLibre } from "./heures";

describe("l'arithmétique des Créneaux", () => {
  it("décale d'un quart d'heure sans sortir de la journée", () => {
    expect(decaler("09:15", 1)).toBe("09:30");
    expect(decaler("09:00", -1)).toBe("08:45");
    expect(decaler("00:00", -1)).toBe("00:00");
    expect(decaler("23:45", 1)).toBe("23:45");
  });
  it("propose midi, ou le premier quart d'heure libre après", () => {
    expect(suivantLibre(["09:15", "14:00"])).toBe("12:00");
    expect(suivantLibre(["12:00", "12:15"])).toBe("12:30");
  });
});
