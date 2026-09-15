import { createHash, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debutAutorisation } from "@/auth/oauth";
import { lireSession } from "@/auth/session";
import { GET as callback } from "../callback/route";
import { POST } from "./route";

vi.mock("@/auth/google", () => ({
  DomaineRefuse: class extends Error {},
  verifierIdToken: vi.fn(async () => ({ email: "stan@thevibecompany.co", nom: "Stan", sub: "google-1" })),
}));
vi.mock("@/auth/membre", () => ({
  MembreDesactive: class extends Error {},
  membrePourIdentite: vi.fn(async () => ({ membreId: "m-1", spaceId: "s-1" })),
}));

const demande = (corps: unknown) => new Request("https://bruno.test/api/auth/ios", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corps),
});

beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "client-test");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret-serveur-test");
  vi.stubEnv("SESSION_SECRET", "secret-session-test-suffisamment-long");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("connexion iOS avec preuve PKCE", () => {
  it("revient dans l'app sans session dans l'URL, puis exige la preuve pour échanger le code une seule fois", async () => {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const state = randomBytes(32).toString("base64url");
    const debut = debutAutorisation(new Request(`https://bruno.test/api/auth/google?platform=ios&state=${state}&code_challenge=${challenge}`));
    const google = new URL(debut.url);
    expect(google.searchParams.get("code_challenge_method")).toBe("S256");
    expect(google.searchParams.get("code_challenge")).toBe(challenge);
    expect(google.searchParams.get("redirect_uri")).toBe("https://bruno.test/api/auth/callback");
    const retour = await callback(new Request(`https://bruno.test/api/auth/callback?code=unique&state=${google.searchParams.get("state")}`, {
      headers: { cookie: debut.cookie.split(";")[0] },
    }));
    const app = new URL(retour.headers.get("location")!);
    expect(app.protocol).toBe("bruno:");
    expect(app.host).toBe("auth");
    expect(app.searchParams.get("state")).toBe(state);
    expect(app.searchParams.get("code")).toBe("unique");
    expect(app.searchParams.has("jeton")).toBe(false);
    expect(retour.headers.get("cache-control")).toBe("no-store");

    let utilise = false;
    vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
      expect(url).toBe("https://oauth2.googleapis.com/token");
      const corps = options.body as URLSearchParams;
      expect(corps.get("client_secret")).toBe("secret-serveur-test");
      expect(corps.get("redirect_uri")).toBe("https://bruno.test/api/auth/callback");
      const preuve = createHash("sha256").update(corps.get("code_verifier") ?? "").digest("base64url");
      if (preuve !== challenge || utilise) return Response.json({ error: "invalid_grant" }, { status: 400 });
      utilise = true;
      return Response.json({ id_token: "identite-google" });
    }));
    const refus = await POST(demande({ code: "unique", codeVerifier: "x".repeat(43) }));
    expect(refus.status).toBe(401);
    const succes = await POST(demande({ code: "unique", codeVerifier: verifier }));
    expect(succes.status).toBe(200);
    expect(succes.headers.get("cache-control")).toBe("no-store");
    expect(await lireSession((await succes.json()).jeton)).toEqual({ membreId: "m-1", spaceId: "s-1" });
    expect((await POST(demande({ code: "unique", codeVerifier: verifier }))).status).toBe(401);
  });

  it("ne redirige jamais vers l'app sans cookie d'état correspondant", async () => {
    const state = `ios.${"a".repeat(43)}.12345678-1234-1234-1234-123456789012`;
    for (const cookie of ["", "bruno_oauth_etat=autre"]) {
      const retour = await callback(new Request(`https://bruno.test/api/auth/callback?code=vole&state=${state}`, { headers: { cookie } }));
      expect(retour.headers.get("location")).toBe("https://bruno.test/connexion?raison=etat_invalide");
    }
  });

  it("rend le refus Google à la session iOS qui l'a demandé", async () => {
    const state = `ios.${"a".repeat(43)}.12345678-1234-1234-1234-123456789012`;
    const retour = await callback(new Request(`https://bruno.test/api/auth/callback?error=access_denied&state=${state}`, { headers: { cookie: `bruno_oauth_etat=${state}` } }));
    expect(new URL(retour.headers.get("location")!).searchParams.get("error")).toBe("refusee");
  });

  it("refuse une tentative iOS sans empreinte PKCE et les corps d'échange malformés", async () => {
    expect(() => debutAutorisation(new Request("https://bruno.test/api/auth/google?platform=ios"))).toThrow();
    for (const corps of [null, {}, { code: "code" }, { code: "code", codeVerifier: "court" }, { idToken: 42 }]) {
      expect((await POST(demande(corps))).status).toBe(422);
    }
  });
});
