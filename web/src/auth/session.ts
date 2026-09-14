/**
 * La session de Bruno : un jeton signé, court à écrire, sans état côté serveur.
 *
 * Le web le range dans un cookie `HttpOnly` ; iOS le garde dans le trousseau et l'envoie en
 * `Authorization: Bearer`. Un seul format, deux transports — c'est ce qui permet à l'API de
 * ne connaître qu'un seul chemin d'authentification.
 */
import { SignJWT, jwtVerify } from "jose";
import { reglage } from "./config";

export const COOKIE = "bruno_session";
const DUREE_JOURS = 30;

const secret = () => new TextEncoder().encode(reglage("SESSION_SECRET"));

export type Session = { membreId: string; spaceId: string };

export async function creerSession(s: Session): Promise<string> {
  return new SignJWT({ spaceId: s.spaceId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.membreId)
    .setIssuedAt()
    .setExpirationTime(`${DUREE_JOURS}d`)
    .sign(secret());
}

export async function lireSession(jeton: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(jeton, secret());
    if (!payload.sub || typeof payload.spaceId !== "string") return null;
    return { membreId: payload.sub, spaceId: payload.spaceId };
  } catch {
    return null;
  }
}

export function enteteCookie(jeton: string): string {
  const attrs = [
    `${COOKIE}=${jeton}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${DUREE_JOURS * 24 * 3600}`,
  ];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}

export const cookieEfface = [`${COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0", ...(process.env.NODE_ENV === "production" ? ["Secure"] : [])].join("; ");

export function jetonDeLaRequete(request: Request): string | null {
  const entete = request.headers.get("authorization");
  if (entete?.startsWith("Bearer ")) return entete.slice(7);
  const cookies = request.headers.get("cookie") ?? "";
  return cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))?.[1] ?? null;
}
