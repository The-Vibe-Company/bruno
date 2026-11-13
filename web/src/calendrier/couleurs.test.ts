import { describe, expect, it } from "vitest";
import { PALETTE } from "@/reglages/palette";
import { couleursDuCalendrier } from "./couleurs";

const antoine = { id: "antoine" };
const victor = { id: "victor" };
const stan = { id: "stan" };
const agenda = (id: string, membreId: string, couleur: string | null = null) => ({ id, membreId, couleur });

describe("les couleurs du Calendrier", () => {
  it("donne une couleur à chacun de mes Agendas, et une seule à tous ceux d'un autre", () => {
    const { agendas } = couleursDuCalendrier([antoine, victor], [
      agenda("vibe", "antoine"), agenda("quivr", "antoine"), agenda("v1", "victor"), agenda("v2", "victor"),
    ], "antoine");
    expect(agendas.vibe).not.toBe(agendas.quivr);
    expect(agendas.v1).toBe(agendas.v2);
    expect([agendas.vibe, agendas.quivr]).not.toContain(agendas.v1);
  });

  it("ne confond pas deux Agendas d'un autre avec une couleur déjà choisie pour l'un d'eux", () => {
    // Le cas d'Antoine vu par Victor : un Agenda en bleu choisi, l'autre sans couleur.
    const { agendas } = couleursDuCalendrier([victor, antoine], [
      agenda("vibe", "antoine", "#4EA7FC"), agenda("quivr", "antoine"), agenda("v1", "victor"),
    ], "victor");
    expect(agendas.vibe).toBe("#4EA7FC");
    expect(agendas.quivr.toUpperCase()).not.toBe("#4EA7FC");
  });

  it("laisse une couleur choisie passer avant tout, et les défauts l'évitent", () => {
    const { agendas, defauts } = couleursDuCalendrier([antoine, victor, stan], [
      agenda("a1", "antoine", PALETTE[0]), agenda("a2", "antoine"), agenda("v1", "victor"), agenda("s1", "stan"),
    ], "antoine");
    expect(agendas.a1).toBe(PALETTE[0]);
    expect(new Set([agendas.a1, agendas.a2, agendas.v1, agendas.s1]).size).toBe(4);
    expect(defauts.a1).toBeDefined();
    expect(defauts.a1).not.toBe(agendas.a1);
  });

  it("ne change pas d'une visite à l'autre", () => {
    const entree = [agenda("a1", "antoine"), agenda("v1", "victor"), agenda("s1", "stan")];
    expect(couleursDuCalendrier([antoine, victor, stan], entree, "antoine"))
      .toEqual(couleursDuCalendrier([antoine, victor, stan], entree, "antoine"));
  });

  it("reprend la palette quand elle est épuisée, sans laisser d'Agenda sans couleur", () => {
    const miens = Array.from({ length: PALETTE.length + 3 }, (_, i) => agenda(`a${i}`, "antoine"));
    const { agendas } = couleursDuCalendrier([antoine, victor], [...miens, agenda("v1", "victor")], "antoine");
    expect(Object.values(agendas).every((c) => PALETTE.includes(c))).toBe(true);
    expect(Object.keys(agendas)).toHaveLength(miens.length + 1);
  });
});
