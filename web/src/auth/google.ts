/**
 * Vérifier une identité Google.
 *
 * Le vrai verrou est ailleurs — l'écran de consentement est en mode « Interne », donc Google
 * ne laisse passer que le domaine de l'entreprise. Mais on ne fait pas reposer l'accès sur un
 * réglage de console : on revérifie ici, à partir du jeton signé.
 */
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { DOMAINE, GOOGLE, reglage } from "./config";

export type IdentiteGoogle = { email: string; nom: string; sub: string };

export class DomaineRefuse extends Error {
  constructor(readonly email: string) {
    super(`Bruno est réservé à ${DOMAINE}. Le compte ${email} n'en fait pas partie.`);
  }
}

let cleDistante: JWTVerifyGetKey | undefined;
/** Les clés publiques de Google, mises en cache par `jose` entre les requêtes. */
function clesGoogle(): JWTVerifyGetKey {
  cleDistante ??= createRemoteJWKSet(new URL(GOOGLE.jwks));
  return cleDistante;
}

/**
 * `cles` n'est là que pour les tests : ils fabriquent leur propre paire et leurs propres
 * jetons, ce qui permet de vérifier le refus hors domaine sans toucher à Google.
 */
export async function verifierIdToken(
  idToken: string,
  cles: JWTVerifyGetKey = clesGoogle(),
): Promise<IdentiteGoogle> {
  const { payload } = await jwtVerify(idToken, cles, {
    issuer: [...GOOGLE.emetteurs],
    audience: reglage("GOOGLE_CLIENT_ID"),
  });

  const email = String(payload.email ?? "").toLowerCase();
  if (!email) throw new Error("Le jeton Google ne porte pas d'adresse e-mail.");
  if (payload.email_verified === false) throw new DomaineRefuse(email);

  // Deux vérifications plutôt qu'une : `hd` dit à quel Workspace le compte appartient,
  // le suffixe de l'adresse dit ce qu'on voit. Les deux doivent concorder.
  if (payload.hd !== DOMAINE || !email.endsWith(`@${DOMAINE}`)) throw new DomaineRefuse(email);

  return { email, nom: String(payload.name ?? email.split("@")[0]), sub: String(payload.sub) };
}
