import { beforeAll, describe, expect, it } from "vitest";
import { debutAutorisation } from "./oauth";

describe("le départ chez Google", () => {
  beforeAll(() => { process.env.GOOGLE_CLIENT_ID ??= "client-test"; });

  it("repasse toujours par l'écran de Google : se déconnecter doit servir à quelque chose", () => {
    const { url } = debutAutorisation(new Request("https://bruno.test/api/auth/google"));
    expect(new URL(url).searchParams.get("prompt")).toBe("select_account");
  });
});
