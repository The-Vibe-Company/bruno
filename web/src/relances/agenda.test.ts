import { describe, expect, it } from "vitest";
import { heuresUtiles, rienAFaire } from "./agenda";
import { instantDepuis } from "./temps";

/**
 * L'agenda du cron. Ce qui compte : il ne fait jamais sauter un passage qui avait du travail.
 * Dans le doute — pas d'agenda, un autre jour, un agenda abîmé — on refait tout.
 */
const mardi = instantDepuis("2026-11-10T10:00")!;
const samedi = instantDepuis("2026-11-14T10:00")!;
const creneaux = [
  { membreId: "antoine", heure: "09:15" }, { membreId: "antoine", heure: "14:00" }, { membreId: "antoine", heure: "17:30" },
  { membreId: "stan", heure: "08:45" }, { membreId: "stan", heure: "14:00" }, { membreId: "stan", heure: "18:00" },
];

describe("les heures utiles", () => {
  it("en semaine, chaque Créneau, une seule fois et dans l'ordre", () => {
    expect(heuresUtiles(creneaux, mardi)).toEqual(["08:45", "09:15", "14:00", "17:30", "18:00"]);
  });

  it("le week-end, le premier Créneau de chacun : les Récurrences l'attendent, pas de Relance", () => {
    expect(heuresUtiles(creneaux, samedi)).toEqual(["08:45", "09:15"]);
  });

  it("personne n'a de Créneau : rien d'autre que le premier passage du jour", () => {
    expect(heuresUtiles([], mardi)).toEqual([]);
  });
});

describe("rien à faire ?", () => {
  const agenda = { jour: mardi.jour, heures: ["09:15", "14:00"] };

  it("entre deux Créneaux, le passage s'en va", () => {
    expect(rienAFaire(agenda, { ...mardi, heure: "10:00" })).toBe(true);
  });

  it("à l'heure d'un Créneau, il travaille", () => {
    expect(rienAFaire(agenda, { ...mardi, heure: "14:00" })).toBe(false);
  });

  it("sans agenda, ou l'agenda d'hier, il refait tout", () => {
    expect(rienAFaire(null, mardi)).toBe(false);
    expect(rienAFaire(undefined, mardi)).toBe(false);
    expect(rienAFaire({ jour: "2026-11-09", heures: [] }, mardi)).toBe(false);
  });

  it("un agenda abîmé ne fait rien sauter", () => {
    expect(rienAFaire({ jour: mardi.jour } as never, mardi)).toBe(false);
  });
});
