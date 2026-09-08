import { describe, expect, it } from "vitest";
import { deplacer, type Colonnes } from "./deplacement";

const base = (): Colonnes => ({ a_faire: ["a", "b", "c"], en_cours: ["d"], bloque: [] });

describe("ce qu'un glisser veut dire", () => {
  it("vers une autre colonne, lâché sur la colonne : change de Statut et va en bas", () => {
    const { mutations, colonnes } = deplacer(base(), "a", "en_cours");
    expect(mutations).toEqual([
      { type: "statut", id: "a", statut: "en_cours" },
      { type: "rang", id: "a", avantId: "d", apresId: null },
    ]);
    expect(colonnes.en_cours).toEqual(["d", "a"]);
    expect(colonnes.a_faire).toEqual(["b", "c"]);
  });

  it("vers une autre colonne, lâché sur une carte : se place à sa hauteur", () => {
    const { mutations, colonnes } = deplacer(base(), "a", "d");
    expect(mutations[1]).toEqual({ type: "rang", id: "a", avantId: null, apresId: "d" });
    expect(colonnes.en_cours).toEqual(["a", "d"]);
  });

  it("dans la même colonne, vers le bas : passe après la carte survolée", () => {
    const { mutations, colonnes } = deplacer(base(), "a", "c");
    expect(mutations).toEqual([{ type: "rang", id: "a", avantId: "c", apresId: null }]);
    expect(colonnes.a_faire).toEqual(["b", "c", "a"]);
  });

  it("dans la même colonne, vers le haut : passe avant la carte survolée", () => {
    const { mutations, colonnes } = deplacer(base(), "c", "a");
    expect(mutations).toEqual([{ type: "rang", id: "c", avantId: null, apresId: "a" }]);
    expect(colonnes.a_faire).toEqual(["c", "a", "b"]);
  });

  it("lâché au même endroit : rien à envoyer", () => {
    expect(deplacer(base(), "b", "b").mutations).toEqual([]);
  });

  it("une colonne vide accueille la première carte sans voisines", () => {
    const { mutations } = deplacer(base(), "d", "bloque");
    expect(mutations).toEqual([
      { type: "statut", id: "d", statut: "bloque" },
      { type: "rang", id: "d", avantId: null, apresId: null },
    ]);
  });
});
