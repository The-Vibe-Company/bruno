/**
 * Le va-et-vient OAuth du web et d'iOS. Le client iOS garde le vérificateur PKCE,
 * Google reçoit son empreinte et le secret Google reste sur le serveur.
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
  const params = new URL(request.url).searchParams;
  const ios = params.get("platform") === "ios";
  const state = params.get("state");
  const challenge = params.get("code_challenge");
  if (ios && (!state || !/^[A-Za-z0-9_-]{43}$/.test(state) || !challenge || !/^[A-Za-z0-9_-]{43}$/.test(challenge))) {
    throw new Error("Paramètres de connexion iOS invalides.");
  }
  const etat = ios ? `ios.${state}.${crypto.randomUUID()}` : crypto.randomUUID();
  const url = new URL(GOOGLE.autorisation);
  url.searchParams.set("client_id", reglage("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", urlRetour(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", etat);
  if (ios) {
    url.searchParams.set("code_challenge", challenge!);
    url.searchParams.set("code_challenge_method", "S256");
  }
  // Ne proposer que les comptes du domaine : le refus survient avant même l'écran de choix.
  url.searchParams.set("hd", process.env.BRUNO_DOMAINE ?? "thevibecompany.co");
  // Toujours repasser par l'écran de Google. Sans ça, avec un seul compte ouvert dans le
  // navigateur, Google reconnecte le même sans rien montrer — et se déconnecter ne sert à rien
  // (Antoine, 14 septembre). Un clic de plus à chaque connexion, et chacun voit qui il est.
  url.searchParams.set("prompt", "select_account");
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

/** Appeler seulement après validation du cookie d'état. Aucune session dans l'URL. */
export function retourIOS(params: URLSearchParams): URL | null {
  const state = params.get("state")?.match(/^ios\.([A-Za-z0-9_-]{43})\.[0-9a-f-]{36}$/)?.[1];
  if (!state) return null;
  const retour = new URL("bruno://auth");
  retour.searchParams.set("state", state);
  const code = params.get("code");
  if (params.has("error") || !code) retour.searchParams.set("error", "refusee");
  else retour.searchParams.set("code", code);
  return retour;
}

/** Échange le code contre les jetons. Seul le `id_token` nous intéresse. */
export async function echangerCode(request: Request, code: string, codeVerifier?: string): Promise<string> {
  const reponse = await fetch(GOOGLE.jeton, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: reglage("GOOGLE_CLIENT_ID"),
      client_secret: reglage("GOOGLE_CLIENT_SECRET"),
      redirect_uri: urlRetour(request),
      grant_type: "authorization_code",
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
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
