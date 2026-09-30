import { describe, expect, it } from "vitest";
import { POIDS_MAX, TYPES, verifier } from "./fichiers";

/**
 * Ce qui se teste sans réseau : le tri à l'entrée. Le reste — ranger, servir, retirer — passe
 * par le stockage de Vercel et se vérifie dans le navigateur, pas ici.
 */
describe("ce qu'on accepte de poser", () => {
  it("laisse passer une image et un PDF", () => {
    for (const type of TYPES) expect(() => verifier(type, 1024)).not.toThrow();
  });

  it("refuse le reste, en le disant", () => {
    expect(() => verifier("text/csv", 1024)).toThrow(/image.*PDF/i);
    expect(() => verifier("application/zip", 1024)).toThrow();
  });

  it("refuse le vide et ce qui dépasse vingt mégaoctets", () => {
    expect(() => verifier("image/png", 0)).toThrow(/Trop lourd|20 Mo/);
    expect(() => verifier("image/png", POIDS_MAX + 1)).toThrow(/20 Mo/);
    expect(() => verifier("image/png", POIDS_MAX)).not.toThrow();
  });
});
