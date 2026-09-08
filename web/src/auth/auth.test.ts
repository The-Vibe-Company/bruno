/**
 * L'authentification, vérifiée hors ligne.
 *
 * Les tests fabriquent leur propre paire de clés et signent leurs propres jetons d'identité.
 * C'est ce qui permet de prouver le refus hors domaine — la règle qui compte ici — sans
 * dépendre de Google ni d'un compte réel.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { membre, space } from "@/db/schema";
import { membreCourant } from "@/api/membre-courant";
import { DomaineRefuse, verifierIdToken } from "./google";
import { membrePourIdentite } from "./membre";
import { COOKIE, creerSession, jetonDeLaRequete, lireSession } from "./session";

const CLIENT_ID = "test-client.apps.googleusercontent.com";
const spaceId = randomUUID();
let signer: (revendications: Record<string, unknown>, options?: { exp?: string; iss?: string; aud?: string }) => Promise<string>;
let cles: JWTVerifyGetKey;

beforeAll(async () => {
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
  process.env.SESSION_SECRET = "secret-de-test-suffisamment-long-pour-hs256";
  process.env.BRUNO_DOMAINE = "thevibecompany.co";
  process.env.BRUNO_SPACE_ID = spaceId;

  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test"; jwk.alg = "RS256"; jwk.use = "sig";
  cles = createLocalJWKSet({ keys: [jwk] });

  signer = (revendications, o = {}) =>
    new SignJWT(revendications)
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(o.iss ?? "https://accounts.google.com")
      .setAudience(o.aud ?? CLIENT_ID)
      .setSubject("google-123")
      .setIssuedAt()
      .setExpirationTime(o.exp ?? "1h")
      .sign(privateKey);

  await db.insert(space).values({ id: spaceId, nom: "Test auth" });
});
afterAll(async () => { await db.delete(space).where(eq(space.id, spaceId)); });

const identiteValide = { email: "antoine@thevibecompany.co", hd: "thevibecompany.co", name: "Antoine", email_verified: true };

describe("la vérification d'un jeton Google", () => {
  it("accepte un compte du domaine", async () => {
    const id = await verifierIdToken(await signer(identiteValide), cles);
    expect(id.email).toBe("antoine@thevibecompany.co");
    expect(id.nom).toBe("Antoine");
  });

  it("refuse un compte d'un autre Workspace", async () => {
    const jeton = await signer({ ...identiteValide, email: "quelquun@autreboite.com", hd: "autreboite.com" });
    await expect(verifierIdToken(jeton, cles)).rejects.toBeInstanceOf(DomaineRefuse);
  });

  it("refuse un Gmail personnel, qui n'a pas de hd du tout", async () => {
    const jeton = await signer({ email: "antoine@gmail.com", name: "Antoine", email_verified: true });
    await expect(verifierIdToken(jeton, cles)).rejects.toBeInstanceOf(DomaineRefuse);
  });

  it("refuse un hd correct mais une adresse d'ailleurs — les deux doivent concorder", async () => {
    const jeton = await signer({ ...identiteValide, email: "intrus@autreboite.com" });
    await expect(verifierIdToken(jeton, cles)).rejects.toBeInstanceOf(DomaineRefuse);
  });

  it("refuse une adresse non vérifiée par Google", async () => {
    const jeton = await signer({ ...identiteValide, email_verified: false });
    await expect(verifierIdToken(jeton, cles)).rejects.toBeInstanceOf(DomaineRefuse);
  });

  it("refuse un jeton destiné à une autre application", async () => {
    const jeton = await signer(identiteValide, { aud: "une-autre-app.apps.googleusercontent.com" });
    await expect(verifierIdToken(jeton, cles)).rejects.toThrow();
  });

  it("refuse un jeton qui ne vient pas de Google", async () => {
    const jeton = await signer(identiteValide, { iss: "https://faux-emetteur.example" });
    await expect(verifierIdToken(jeton, cles)).rejects.toThrow();
  });

  it("refuse un jeton expiré", async () => {
    const jeton = await signer(identiteValide, { exp: "-1h" });
    await expect(verifierIdToken(jeton, cles)).rejects.toThrow();
  });
});

describe("la session", () => {
  it("se relit elle-même", async () => {
    const jeton = await creerSession({ membreId: "m-1", spaceId });
    expect(await lireSession(jeton)).toEqual({ membreId: "m-1", spaceId });
  });

  it("ne se relit pas avec un autre secret", async () => {
    const jeton = await creerSession({ membreId: "m-1", spaceId });
    const vrai = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "un-tout-autre-secret-de-la-meme-longueur";
    expect(await lireSession(jeton)).toBeNull();
    process.env.SESSION_SECRET = vrai;
  });

  it("refuse un jeton bricolé", async () => {
    expect(await lireSession("pas.un.jwt")).toBeNull();
  });

  it("se lit depuis le cookie du web comme depuis l'en-tête d'iOS", () => {
    const req = (h: HeadersInit) => new Request("https://bruno.test", { headers: h });
    expect(jetonDeLaRequete(req({ cookie: `autre=x; ${COOKIE}=abc; encore=y` }))).toBe("abc");
    expect(jetonDeLaRequete(req({ authorization: "Bearer xyz" }))).toBe("xyz");
    expect(jetonDeLaRequete(req({}))).toBeNull();
  });
});

describe("de l'identité au Membre", () => {
  it("crée le Membre à la première connexion, puis le retrouve", async () => {
    const identite = { email: `nouveau-${spaceId}@thevibecompany.co`, nom: "Nouveau", sub: "g-1" };
    const a = await membrePourIdentite(identite);
    const b = await membrePourIdentite(identite);
    expect(a.membreId).toBe(b.membreId);
    expect(a.spaceId).toBe(spaceId);
  });

  it("refuse un Membre désactivé", async () => {
    const identite = { email: `parti-${spaceId}@thevibecompany.co`, nom: "Parti", sub: "g-2" };
    const { membreId } = await membrePourIdentite(identite);
    await db.update(membre).set({ actif: false }).where(eq(membre.id, membreId));
    await expect(membrePourIdentite(identite)).rejects.toThrow(/désactivé/);
  });
});

describe("qui parle, côté API", () => {
  const requete = (h: HeadersInit = {}) => new Request("https://bruno.test/api/taches", { headers: h });

  it("refuse sans session", async () => {
    await expect(membreCourant(requete())).rejects.toMatchObject({ code: "non_authentifie" });
  });

  it("refuse une session signée par quelqu'un d'autre", async () => {
    await expect(membreCourant(requete({ authorization: "Bearer pas.un.jeton" })))
      .rejects.toMatchObject({ code: "non_authentifie" });
  });

  it("accepte une session valide", async () => {
    const identite = { email: `actif-${spaceId}@thevibecompany.co`, nom: "Actif", sub: "g-3" };
    const session = await membrePourIdentite(identite);
    const jeton = await creerSession(session);
    await expect(membreCourant(requete({ authorization: `Bearer ${jeton}` })))
      .resolves.toEqual(session);
  });

  it("coupe l'accès dès qu'un Membre est désactivé, sans attendre l'expiration", async () => {
    const identite = { email: `coupe-${spaceId}@thevibecompany.co`, nom: "Coupé", sub: "g-4" };
    const session = await membrePourIdentite(identite);
    const jeton = await creerSession(session);
    await db.update(membre).set({ actif: false }).where(eq(membre.id, session.membreId));
    await expect(membreCourant(requete({ authorization: `Bearer ${jeton}` })))
      .rejects.toMatchObject({ code: "non_authentifie" });
  });
});
