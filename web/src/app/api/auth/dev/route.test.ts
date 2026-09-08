import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

describe("la connexion de développement", () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it("n'existe pas sans BRUNO_DEV_LOGIN=1", async () => {
    delete process.env.BRUNO_DEV_LOGIN;
    expect((await GET(new Request("http://localhost/api/auth/dev"))).status).toBe(404);
  });
  it("n'existe jamais en production, même avec le drapeau", async () => {
    process.env.BRUNO_DEV_LOGIN = "1";
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    expect((await GET(new Request("http://localhost/api/auth/dev"))).status).toBe(404);
  });
});
