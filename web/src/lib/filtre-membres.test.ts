import { describe, expect, it } from "vitest";
import { membresActifs } from "./filtre-membres";

/**
 * Le filtre par Membre. Ce qui compte : l'URL décide, et quand elle ne dit rien, chaque écran a
 * son défaut — moi seul sur le Board, tout le monde sur les écrans d'équipe.
 */
const membres = [{ id: "a" }, { id: "s" }, { id: "v" }];

describe("qui est retenu", () => {
  it("suit l'URL quand elle le dit", () => {
    expect([...membresActifs("a,v", membres)].sort()).toEqual(["a", "v"]);
  });

  it("ignore un identifiant qu'on ne connaît pas", () => {
    expect([...membresActifs("a,inconnu", membres)]).toEqual(["a"]);
  });

  it("sans URL et sans défaut, c'est tout le monde — le Daily, Fait", () => {
    expect([...membresActifs(undefined, membres)].sort()).toEqual(["a", "s", "v"]);
  });

  it("sans URL, le défaut l'emporte — moi seul sur le Board", () => {
    expect([...membresActifs(undefined, membres, ["a"])]).toEqual(["a"]);
  });

  it("une URL explicite passe devant le défaut : on a demandé à voir les autres", () => {
    expect([...membresActifs("s", membres, ["a"])]).toEqual(["s"]);
  });

  it("un défaut qui ne désigne personne de connu retombe sur tout le monde", () => {
    expect([...membresActifs(undefined, membres, ["parti"])].sort()).toEqual(["a", "s", "v"]);
  });
});
