import { beforeAll, describe, expect, it } from "vitest";
import { debutAutorisation } from "./oauth";

describe("le départ chez Google", () => {
  beforeAll(() => { process.env.GOOGLE_CLIENT_ID ??= "client-test"; });

  it("reste silencieux par défaut : une session expirée revient sans rien demander", () => {
    const { url } = debutAutorisation(new Request("https://bruno.test/api/auth/google"));
    expect(new URL(url).searchParams.get("prompt")).toBeNull();
  });
  it("après une déconnexion, demande à Google de proposer le choix du compte", () => {
    const { url } = debutAutorisation(new Request("https://bruno.test/api/auth/google?choisir=1"));
    expect(new URL(url).searchParams.get("prompt")).toBe("select_account");
  });
});
