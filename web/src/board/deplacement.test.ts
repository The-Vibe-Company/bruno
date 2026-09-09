import { describe, expect, it } from "vitest";
import { colonneVisee, deplacer, deposer, mutationsDe, survoler, type Colonnes } from "./deplacement";

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

describe("pendant le glisser, on voit où la carte va atterrir", () => {
  it("survoler une carte d'une autre colonne y fait entrer la carte, à sa hauteur", () => {
    const c = survoler(base(), "a", "d");
    expect(c.en_cours).toEqual(["a", "d"]);
    expect(c.a_faire).toEqual(["b", "c"]);
  });

  it("survoler une colonne vide y fait entrer la carte ; sa propre colonne ne change rien", () => {
    expect(survoler(base(), "a", "bloque").bloque).toEqual(["a"]);
    const b = base();
    expect(survoler(b, "a", "c")).toBe(b);
  });

  it("au lâcher, ce qui compte est le départ et l'arrivée — pas les colonnes traversées", () => {
    let c = survoler(base(), "a", "bloque"); // passe par Bloqué…
    c = survoler(c, "a", "d");               // …puis finit sur En cours, au-dessus de d
    expect(mutationsDe(base(), c, "a")).toEqual([
      { type: "statut", id: "a", statut: "en_cours" },
      { type: "rang", id: "a", avantId: null, apresId: "d" },
    ]);
    const retour = survoler(c, "a", "b"); // et revient chez elle
    expect(mutationsDe(base(), deposer(retour, "a", "b"), "a")).toEqual([{ type: "rang", id: "a", avantId: "b", apresId: "c" }]);
  });
});

describe("une carte venue du panneau", () => {
  it("vise la colonne sur laquelle elle est lâchée, ou la colonne de la carte survolée", () => {
    expect(colonneVisee(base(), "bloque")).toBe("bloque");
    expect(colonneVisee(base(), "d")).toBe("en_cours");
    expect(colonneVisee(base(), "inconnu")).toBeNull();
    expect(colonneVisee(base(), null)).toBeNull();
  });
});
