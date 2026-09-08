/**
 * Les quatre Buckets — BRU-11. Invariants 1 et 3, et la règle 7.
 *
 * L'essentiel est déjà tenu par la base et par `taches.ts`. Ce fichier ajoute ce qu'aucun
 * test n'affirmait encore : qu'il n'existe **aucun autre chemin** vers un changement de Bucket
 * — pas de job, pas de cron, pas d'écriture cachée — et que la Capture ne peut pas viser
 * Sur le feu même en le demandant.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Bucket, CreerTache } from "./contrat";

const src = path.resolve(__dirname, "..");
const fichiers = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = path.join(d, f);
  return statSync(p).isDirectory() ? fichiers(p) : /\.tsx?$/.test(f) && !f.includes(".test.") ? [p] : [];
});

describe("les quatre Buckets", () => {
  it("sont exactement quatre, dans cet ordre", () => {
    expect(Bucket.options).toEqual(["a_trier", "sur_le_feu", "a_venir", "idees"]);
  });

  it("invariant 3 — une Capture ne peut pas viser Sur le feu, même en le demandant", () => {
    expect(CreerTache.parse({ titre: "x" }).bucket).toBe("a_trier");
    expect(() => CreerTache.parse({ titre: "x", bucket: "sur_le_feu" })).toThrow();
    expect(CreerTache.parse({ titre: "x", bucket: "idees" }).bucket).toBe("idees");
  });

  it("invariant 1 — seul taches.ts écrit un Bucket ; aucun job, aucun cron, aucune route", () => {
    const ecrivent = fichiers(src)
      .filter((f) => !f.endsWith(path.join("api", "taches.ts")) && !f.includes(path.join("db", "seed.ts")))
      .filter((f) => /\bbucket\s*:\s*(cible\.bucket|["'](sur_le_feu|a_venir|idees|a_trier)["'])/.test(readFileSync(f, "utf8")));
    expect(ecrivent.map((f) => path.relative(src, f))).toEqual([]);
  });

  it("invariant 1 — le cron des Relances ne touche pas aux Tâches", () => {
    const cron = readFileSync(path.join(src, "app/api/cron/relances/route.ts"), "utf8");
    expect(cron).not.toMatch(/update\(|insert\(|delete\(|bucket/);
  });
});
