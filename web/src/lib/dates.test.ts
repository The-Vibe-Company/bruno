import { describe, expect, it } from "vitest";
import { demain, dimancheDe, jourOuvrePrecedent, libelleBlocage, libelleDernierJour, libelleDuree, libelleJour, libelleLong, libelleReport, libelleSemaine, lundiDe, lundiProchain, veille } from "./dates";

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

describe("hier, pour le Daily", () => {
  it("la veille, sauf le lundi où c'est vendredi", () => {
    expect(veille("2026-09-08")).toBe("2026-09-07");
    expect(jourOuvrePrecedent("2026-09-08")).toBe("2026-09-07");
    expect(jourOuvrePrecedent("2026-09-07")).toBe("2026-09-04");
    expect(jourOuvrePrecedent("2026-09-06")).toBe("2026-09-04");
  });
});

describe("la semaine, pour Fait", () => {
  it("commence le lundi, finit le dimanche, et se nomme par son lundi", () => {
    expect(lundiDe("2026-09-08")).toBe("2026-09-07");
    expect(lundiDe("2026-09-07")).toBe("2026-09-07");
    expect(lundiDe("2026-09-06")).toBe("2026-08-31");
    expect(dimancheDe("2026-09-07")).toBe("2026-09-13");
    expect(libelleSemaine("2026-09-07")).toBe("Semaine du 7 septembre");
    expect(libelleSemaine("2026-08-31")).toBe("Semaine du 31 août");
  });
});

describe("depuis quand on est dessus", () => {
  it("compte en jours, puis en semaines, puis en mois", () => {
    expect(libelleDuree("2026-09-08", "2026-09-08")).toBe("auj.");
    expect(libelleDuree("2026-09-06", "2026-09-08")).toBe("2 j");
    expect(libelleDuree("2026-08-25", "2026-09-08")).toBe("2 sem.");
    expect(libelleDuree("2026-07-01", "2026-09-08")).toBe("2 mois");
  });
});

describe("le nom du dernier jour travaillé", () => {
  it("dit « Hier » quand c'est bien hier", () => {
    expect(libelleDernierJour("2026-09-10", "2026-09-11")).toBe("Hier");
  });
  it("nomme le jour, un lundi matin — le Daily se lit à voix haute", () => {
    expect(libelleDernierJour("2026-09-11", "2026-09-14")).toBe("Vendredi 11 septembre");
  });
});

/** « bloqué depuis » : ce qu'on écrit à la place de la date du jour quand une Tâche attend. */
describe("depuis quand c'est bloqué", () => {
  it("dit le jour même sans compter", () => {
    expect(libelleBlocage("2026-09-17T09:00:00Z", "2026-09-17")).toBe("bloqué aujourd'hui");
  });

  it("compte en jours, puis en semaines", () => {
    expect(libelleBlocage("2026-09-14T09:00:00Z", "2026-09-17")).toBe("bloqué depuis 3 j");
    expect(libelleBlocage("2026-09-01T09:00:00Z", "2026-09-17")).toBe("bloqué depuis 2 sem.");
  });
});
