import { describe, expect, it } from "vitest";
import { composer, type Situation } from "./composer";

const jour = "2026-09-08";
const t = (titre: string, statut: "a_faire" | "en_cours" | "bloque" = "a_faire", reportsCount = 0) =>
  ({ id: titre, titre, statut, engagement: jour, reportsCount });
const vide: Situation = { jour, affectations: [], engagees: [], aVenirArrivees: [] };

describe("ce que dit une Relance", () => {
  it("ne dit rien quand il n'y a rien à dire — une notification vide est du bruit", () => {
    expect(composer("point_du_matin", vide)).toBeNull();
    expect(composer("rappel", vide)).toBeNull();
    expect(composer("bilan", vide)).toBeNull();
  });

  it("le Point du matin groupe tout : Affectation, engagées, À venir arrivées, Bloqué, Affectations qui traînent", () => {
    const m = composer("point_du_matin", {
      jour,
      affectations: [{ id: "p-monka", nom: "MONKA", depuis: "2026-08-20", joursOuverts: 19 }, { id: "p-afp", nom: "AFP", depuis: "2026-09-01", joursOuverts: 7 }],
      engagees: [t("Relancer MONKA"), t("Maquettes", "en_cours"), t("Contrat AFP", "bloque")],
      aVenirArrivees: [{ id: "x", titre: "Comité de septembre", engagement: jour }],
    })!;
    expect(m.titre).toBe("Point du matin");
    expect(m.corps).toContain("Aujourd'hui : MONKA, AFP.");
    expect(m.corps).toContain("2 Tâches engagées aujourd'hui — Relancer MONKA · Maquettes.");
    expect(m.corps).toContain("Comité de septembre — les passer Sur le feu ?");
    expect(m.corps).toContain("Toujours bloquée : Contrat AFP.");
    expect(m.corps).toContain("Toujours sur MONKA ? (depuis 19 jours)");
    expect(m.corps).not.toContain("Toujours sur AFP");
  });

  it("une Affectation qui traîne depuis plus de 14 jours vient avec de quoi la fermer d'un bouton (règle 25)", () => {
    const affectations = [{ id: "p-monka", nom: "MONKA", depuis: "2026-08-20", joursOuverts: 19 }, { id: "p-afp", nom: "AFP", depuis: "2026-08-25", joursOuverts: 14 }];
    const m = composer("point_du_matin", { ...vide, affectations })!;
    expect(m.aFermer).toEqual([{ id: "p-monka", nom: "MONKA" }]);
    expect(composer("rappel", { ...vide, affectations, engagees: [t("Relancer MONKA")] })!.aFermer).toEqual([]);
  });

  it("un Rappel est factuel et exclut les Bloqué", () => {
    const m = composer("rappel", { ...vide, engagees: [t("a"), t("b"), t("c", "bloque")] })!;
    expect(m.corps).toBe("2 encore ouvertes aujourd'hui.");
    expect(m.tacheIds).toEqual(["a", "b"]);
  });

  it("le Bilan est direct et nomme la première Tâche par Rang", () => {
    const m = composer("bilan", { ...vide, engagees: [t("Préparer le mail Coup de Pâtes"), t("Cadrage"), t("Bloc", "bloque")] })!;
    expect(m.corps).toBe("Tu devais finir Préparer le mail Coup de Pâtes. 1 autre engagement encore ouvert.");
  });

  it("s'il ne reste que des Bloqué, ni Rappel ni Bilan — mais le Point du matin les mentionne", () => {
    const s = { ...vide, engagees: [t("Bloc", "bloque")] };
    expect(composer("rappel", s)).toBeNull();
    expect(composer("bilan", s)).toBeNull();
    expect(composer("point_du_matin", s)!.corps).toContain("Toujours bloquée : Bloc.");
  });

  it("le Point du matin signale ce qui a été reporté trois fois ou plus", () => {
    expect(composer("point_du_matin", { ...vide, engagees: [t("x", "a_faire", 3)] })!.corps).toContain("1 Tâche reportée 3 fois ou plus.");
  });
});
