import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const sauve = process.env.STATS_TOKEN;
afterEach(() => {
  if (sauve === undefined) delete process.env.STATS_TOKEN;
  else process.env.STATS_TOKEN = sauve;
});

async function demander(init?: RequestInit) {
  return GET(new Request("https://bruno.test/api/stats", init));
}

describe("GET /api/stats", () => {
  it("refuse sans jeton, avec un mauvais jeton, et sans secret configuré", async () => {
    process.env.STATS_TOKEN = "le-bon";
    expect((await demander()).status).toBe(401);
    expect((await demander({ headers: { authorization: "Bearer un-autre" } })).status).toBe(401);
    expect((await demander({ headers: { authorization: "Basic le-bon" } })).status).toBe(401);

    delete process.env.STATS_TOKEN;
    const sans = await demander({ headers: { authorization: "Bearer le-bon" } });
    expect(sans.status).toBe(401);
    expect(await sans.json()).toEqual({ message: "Non autorisé." });
  });

  it("ne demande pas la session Google : un cookie ne suffit pas, et on ne redirige pas", async () => {
    process.env.STATS_TOKEN = "le-bon";
    const r = await demander({ headers: { cookie: "bruno_session=jeton-google" } });
    expect(r.status).toBe(401);
    expect(r.headers.get("location")).toBeNull();
  });

  it("renvoie les cinq compteurs avec le bon jeton", async () => {
    process.env.STATS_TOKEN = "le-bon";
    const r = await demander({ headers: { authorization: "Bearer le-bon" } });
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const corps = await r.json();
    expect(Object.keys(corps).sort()).toEqual([
      "active_users_1d", "active_users_7d", "new_users_1d", "new_users_7d", "total_users",
    ]);
    expect(typeof corps.total_users).toBe("number");
    expect(typeof corps.new_users_1d).toBe("number");
    expect(typeof corps.new_users_7d).toBe("number");
    for (const cle of ["active_users_1d", "active_users_7d"] as const) {
      expect(corps[cle] === null || typeof corps[cle] === "number").toBe(true);
    }
  });
});
