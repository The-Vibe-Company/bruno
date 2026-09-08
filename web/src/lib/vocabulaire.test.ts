/**
 * Le vocabulaire qu'on ne veut pas voir. Bruno n'a pas d'« échéance » ni de « retard » :
 * il a des Engagements et des Reports. Le test parcourt tout le code, commentaires compris —
 * le mot qu'on s'interdit dans l'interface, on se l'interdit aussi dans la tête.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const INTERDITS = [/échéance/i, /echeance/i, /deadline/i, /date limite/i, /en retard/i, /overdue/i];
const src = path.resolve(__dirname, "..");
const fichiers = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = path.join(d, f);
  return statSync(p).isDirectory() ? fichiers(p) : /\.tsx?$/.test(f) && !f.includes(".test.") ? [p] : [];
});

describe("le vocabulaire de Bruno", () => {
  it("ne contient ni échéance, ni deadline, ni retard — nulle part dans le code", () => {
    const fautifs = fichiers(src).flatMap((f) =>
      readFileSync(f, "utf8").split("\n").flatMap((l, i) => INTERDITS.some((r) => r.test(l)) ? [`${path.relative(src, f)}:${i + 1}`] : []));
    expect(fautifs).toEqual([]);
  });
});
