/**
 * Le va-et-vient OAuth du web. iOS ne passe pas par là : l'application native obtient son
 * jeton d'identité directement auprès de Google et l'envoie à `/api/auth/ios`.
 */
import { GOOGLE, reglage } from "./config";

const COOKIE_ETAT = "bruno_oauth_etat";

/**
 * Le cookie d'état doit revenir avec la redirection de Google, qui arrive après un POST
 * (le bouton « Continuer ») et parfois plusieurs minutes plus tard. `SameSite=Lax` se montre
 * capricieux dans ce cas précis ; `SameSite=None; Secure` est ce qu'utilisent les
 * bibliothèques OAuth pour cette raison. Le cookie est aléatoire, court et HttpOnly :
 * l'envoyer en cross-site ne révèle rien. Chrome et Firefox acceptent `Secure` sur
 * http://localhost ; Safari non — en dev, tester la connexion dans Chrome.
 */
const ATTRIBUTS_ETAT = "Path=/; HttpOnly; SameSite=None; Secure";
const VALIDITE_ETAT_S = 15 * 60;

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
  const cookie = `${COOKIE_ETAT}=${etat}; ${ATTRIBUTS_ETAT}; Max-Age=${VALIDITE_ETAT_S}`;
  return { url: url.toString(), cookie };
}

export type DiagnosticEtat = { valide: boolean; cookiePresent: boolean; etatPresent: boolean };

/** Dit si l'état est valide, et sinon *pourquoi* — sans révéler les valeurs. */
export function diagnostiquerEtat(request: Request, recu: string | null): DiagnosticEtat {
  const attendu = (request.headers.get("cookie") ?? "").match(
    new RegExp(`(?:^|;\\s*)${COOKIE_ETAT}=([^;]+)`),
  )?.[1];
  return {
    valide: Boolean(recu && attendu && recu === attendu),
    cookiePresent: Boolean(attendu),
    etatPresent: Boolean(recu),
  };
}

export const etatValide = (request: Request, recu: string | null) =>
  diagnostiquerEtat(request, recu).valide;

export const etatEfface = `${COOKIE_ETAT}=; ${ATTRIBUTS_ETAT}; Max-Age=0`;

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
  if (!reponse.ok) {
    // Google dit toujours pourquoi (invalid_grant, redirect_uri_mismatch, invalid_client…) :
    // on le garde dans le message, sinon on cherche à l'aveugle.
    const corps = (await reponse.json().catch(() => ({}))) as { error?: string; error_description?: string };
    throw new Error(
      `Google a refusé l'échange du code (${reponse.status}) : ${corps.error ?? "?"} — ${corps.error_description ?? "sans détail"}.`,
    );
  }
  const { id_token } = (await reponse.json()) as { id_token?: string };
  if (!id_token) throw new Error("Google n'a pas renvoyé de jeton d'identité.");
  return id_token;
}
