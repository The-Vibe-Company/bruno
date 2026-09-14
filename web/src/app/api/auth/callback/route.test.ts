import { describe, expect, it } from "vitest";
import { GET } from "./route";

/** Un échec chez Google doit atterrir sur la page de connexion avec sa raison — jamais sur `/`, qui renverrait chez Google en boucle. */
describe("le retour de Google", () => {
  it("refusé chez Google → /connexion?raison=refusee", async () => {
    const r = await GET(new Request("https://bruno.test/api/auth/callback?error=access_denied"));
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("https://bruno.test/connexion?raison=refusee");
  });
  it("sans le cookie d'état → /connexion?raison=etat_invalide", async () => {
    const r = await GET(new Request("https://bruno.test/api/auth/callback?state=abc&code=xyz"));
    expect(r.headers.get("location")).toBe("https://bruno.test/connexion?raison=etat_invalide");
  });
});
