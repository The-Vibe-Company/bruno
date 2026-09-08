/**
 * Le va-et-vient OAuth du web. iOS ne passe pas par là : l'application native obtient son
 * jeton d'identité directement auprès de Google et l'envoie à `/api/auth/ios`.
 */
import { GOOGLE, reglage } from "./config";

const COOKIE_ETAT = "bruno_oauth_etat";

export const urlRetour = (request: Request) =>
  new URL("/api/auth/callback", new URL(request.url).origin).toString();

export function debutAutorisation(request: Request) {
  const etat = crypto.randomUUID();
  const url = new URL(GOOGLE.autorisation);
  url.searchParams.set("client_id", reglage("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", urlRetour(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", etat);
  // Ne proposer que les comptes du domaine : le refus survient avant même l'écran de choix.
  url.searchParams.set("hd", process.env.BRUNO_DOMAINE ?? "thevibecompany.co");
  const cookie = `${COOKIE_ETAT}=${etat}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
  return { url: url.toString(), cookie };
}

export function etatValide(request: Request, recu: string | null): boolean {
  const attendu = (request.headers.get("cookie") ?? "").match(
    new RegExp(`(?:^|;\\s*)${COOKIE_ETAT}=([^;]+)`),
  )?.[1];
  return Boolean(recu && attendu && recu === attendu);
}

export const etatEfface = `${COOKIE_ETAT}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

/** Échange le code contre les jetons. Seul le `id_token` nous intéresse. */
export async function echangerCode(request: Request, code: string): Promise<string> {
  const reponse = await fetch(GOOGLE.jeton, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: reglage("GOOGLE_CLIENT_ID"),
      client_secret: reglage("GOOGLE_CLIENT_SECRET"),
      redirect_uri: urlRetour(request),
      grant_type: "authorization_code",
    }),
  });
  if (!reponse.ok) throw new Error(`Google a refusé l'échange du code (${reponse.status}).`);
  const { id_token } = (await reponse.json()) as { id_token?: string };
  if (!id_token) throw new Error("Google n'a pas renvoyé de jeton d'identité.");
  return id_token;
}
