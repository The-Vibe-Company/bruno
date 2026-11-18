/**
 * Le retour de Google reçu deux fois (Victor, 18 novembre 2026) : la première requête échange
 * le code, la seconde — celle que le navigateur affiche — reçoit `invalid_grant`. Elle doit
 * quand même connecter, et seulement avec le cookie d'état du navigateur qui est parti chez Google.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { connexionEchangee, membre, space } from "@/db/schema";
import { GET } from "@/app/api/auth/callback/route";
import { retenirConnexion, retrouverConnexion } from "./connexion-echangee";
import { COOKIE, lireSession } from "./session";

const spaceId = randomUUID();
let membreId: string;

beforeAll(async () => {
  process.env.GOOGLE_CLIENT_ID = "client-test";
  process.env.GOOGLE_CLIENT_SECRET = "secret-test";
  process.env.SESSION_SECRET = "secret-de-test-suffisamment-long-pour-hs256";
  await db.insert(space).values({ id: spaceId, nom: "Test doublon" });
  const [m] = await db.insert(membre).values({ spaceId, nom: "Victor", email: `victor-${spaceId}@thevibecompany.co` }).returning();
  membreId = m.id;
});

afterAll(async () => {
  await db.delete(space).where(eq(space.id, spaceId));
});

afterEach(() => { vi.unstubAllGlobals(); });

/** Google qui a déjà échangé ce code. */
const googleRefuseLeCode = () => vi.stubGlobal("fetch", vi.fn(async () =>
  Response.json({ error: "invalid_grant", error_description: "Bad Request" }, { status: 400 })));

const retour = (etat: string, cookie: string | null) => new Request(
  `https://bruno.test/api/auth/callback?state=${etat}&code=4/le-meme-code`,
  { headers: cookie ? { cookie: `bruno_oauth_etat=${cookie}` } : {} },
);

describe("le retour de Google reçu deux fois", () => {
  it("la seconde requête connecte la personne que la première a connectée", async () => {
    const etat = randomUUID();
    await retenirConnexion(etat, { membreId, spaceId });
    googleRefuseLeCode();

    const r = await GET(retour(etat, etat));

    expect(r.headers.get("location")).toBe("https://bruno.test/");
    const jeton = r.headers.getSetCookie().find((c) => c.startsWith(`${COOKIE}=`))?.split(";")[0].split("=")[1];
    expect(await lireSession(jeton!)).toEqual({ membreId, spaceId });
  });

  it("sans le cookie d'état, rien n'est repris", async () => {
    const etat = randomUUID();
    await retenirConnexion(etat, { membreId, spaceId });
    googleRefuseLeCode();

    const r = await GET(retour(etat, null));

    expect(r.headers.get("location")).toBe("https://bruno.test/connexion?raison=etat_invalide");
  });

  it("un code refusé sans connexion déjà faite reste un échec", async () => {
    const etat = randomUUID();
    googleRefuseLeCode();
    vi.spyOn(console, "error").mockImplementation(() => {});

    const r = await GET(retour(etat, etat));

    expect(r.headers.get("location")).toBe("https://bruno.test/connexion?raison=erreur");
  }, 10_000);

  it("attend la première requête si elle n'a pas encore fini", async () => {
    const etat = randomUUID();
    setTimeout(() => { void retenirConnexion(etat, { membreId, spaceId }); }, 500);
    expect(await retrouverConnexion(etat, { attenteMs: 3000, pasMs: 100 })).toEqual({ membreId, spaceId });
  });

  it("ne garde que l'empreinte de l'état", async () => {
    const etat = randomUUID();
    await retenirConnexion(etat, { membreId, spaceId });
    const lignes = await db.select().from(connexionEchangee).where(eq(connexionEchangee.membreId, membreId));
    expect(lignes.every((l) => /^[0-9a-f]{64}$/.test(l.etat) && l.etat !== etat)).toBe(true);
  });
});
