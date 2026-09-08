/**
 * Le contrat doit décrire l'API réellement servie. Ce test compare les chemins déclarés
 * dans l'OpenAPI aux fichiers de routes présents sur le disque : ajouter une route sans
 * la mettre au contrat casse ici, ce qui est exactement le but (ADR 0001).
 */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { documentOpenApi } from "./openapi";

function routesSurDisque(racine: string, prefixe = "/api"): string[] {
  return readdirSync(racine).flatMap((entree) => {
    const complet = path.join(racine, entree);
    if (entree === "route.ts") return [prefixe];
    if (!statSync(complet).isDirectory()) return [];
    const segment = entree.startsWith("[") ? `{${entree.slice(1, -1)}}` : entree;
    return routesSurDisque(complet, `${prefixe}/${segment}`);
  });
}

describe("le contrat OpenAPI", () => {
  const doc = documentOpenApi();

  it("est sérialisable et bien formé", () => {
    expect(() => JSON.stringify(doc)).not.toThrow();
    expect(doc.openapi).toBe("3.1.0");
    expect(Object.keys(doc.components.schemas)).toContain("Tache");
  });

  it("décrit toutes les routes métier servies", () => {
    // Tout ce qui est sous /api, sauf la plomberie : l'auth, le cron, le contrat lui-même.
    const surDisque = routesSurDisque(path.resolve(__dirname, "../app/api"))
      .filter((r) => !/^\/api\/(auth|cron|openapi\.json)/.test(r))
      .sort();
    expect(Object.keys(doc.paths).sort()).toEqual(surDisque);
  });

  it("expose le droit d'entrée comme un refus documenté", () => {
    const bucket = doc.paths["/api/taches/{id}/bucket"].post;
    expect(bucket.responses[422]).toBeDefined();
    expect(bucket.description).toContain("droit d'entrée");
  });
});
