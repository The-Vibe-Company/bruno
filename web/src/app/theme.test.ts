/**
 * Les deux bugs classiques d'un thème, rendus impossibles :
 *  1. une couleur définie dans un seul thème (elle « marche » chez celui qui l'a écrite,
 *     et casse chez l'autre) ;
 *  2. une couleur écrite en dur dans un composant, qui ignore le thème.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "globals.css"), "utf8");
const bloc = (source: string) => Object.fromEntries(
  [...source.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);
const [clair, sombre] = (() => {
  const i = css.indexOf("@media (prefers-color-scheme: dark)");
  const j = css.indexOf("@theme inline");
  return [bloc(css.slice(0, i)), bloc(css.slice(i, j))];
})();

describe("les tokens du thème", () => {
  it("existent tous dans les deux thèmes — jamais dans un seul", () => {
    expect(Object.keys(sombre).sort()).toEqual(Object.keys(clair).sort());
    expect(Object.keys(clair).length).toBeGreaterThan(20);
  });

  it("changent d'accent : #E4640A en clair, #F27313 en sombre", () => {
    expect(clair.accent.toUpperCase()).toBe("#E4640A");
    expect(sombre.accent.toUpperCase()).toBe("#F27313");
  });

  it("baissent la luminosité des statuts en clair au lieu de les inverser", () => {
    const L = (v: string) => Number(v.match(/oklch\(([\d.]+)/)![1]);
    expect(L(clair["en-cours"])).toBeLessThan(L(sombre["en-cours"]));
    expect(L(clair.bloque)).toBeLessThan(L(sombre.bloque));
  });

  it("sont les seules couleurs de l'interface : aucune couleur en dur dans un composant", () => {
    // La règle vise l'interface (src/app, src/components). La couche données peut porter des
    // couleurs : celle d'une Affectation est une donnée stockée en base, pas un style.
    const racine = path.resolve(__dirname);
    const fichiers: string[] = [];
    const marcher = (d: string) => readdirSync(d).forEach((f) => {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) marcher(p);
      else if (/\.(tsx?|css)$/.test(f) && !f.endsWith("globals.css") && !f.endsWith(".test.ts")) fichiers.push(p);
    });
    marcher(racine);
    const composants = path.resolve(__dirname, "../components");
    if (statSync(composants, { throwIfNoEntry: false })?.isDirectory()) marcher(composants);
    const fautifs = fichiers.filter((f) => /#[0-9a-fA-F]{6}\b|\boklch\(|\brgb\(/.test(readFileSync(f, "utf8")));
    expect(fautifs.map((f) => path.relative(path.resolve(__dirname, ".."), f))).toEqual([]);
  });
});
