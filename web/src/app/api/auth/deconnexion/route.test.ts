import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("la déconnexion", () => {
  it("efface le cookie et envoie sur la page de connexion, qui le dit", () => {
    const r = POST(new Request("https://bruno.test/api/auth/deconnexion", { method: "POST" }));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("https://bruno.test/connexion?raison=deconnecte");
    expect(r.headers.get("set-cookie")).toMatch(/^bruno_session=; .*Max-Age=0/);
  });
});
