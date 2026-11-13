/**
 * Le va-et-vient OAuth d'un Agenda. Ce n'est pas une connexion : on est déjà dans Bruno, et on
 * revient dans Bruno avec un compte de plus. L'état porte le fournisseur et commence par
 * `agenda.` — c'est ainsi que `/api/auth/callback` le distingue d'une connexion.
 */
import { lireSession, jetonDeLaRequete } from "@/auth/session";
import { brancherCompte } from "@/api/agendas";
import { membreCourant } from "@/api/membre-courant";
import { echangerCodeAgenda, microsoftConfigure, urlAutorisation, type FournisseurOAuth } from "./fournisseurs";

const COOKIE = "bruno_agenda_etat";
/** Mêmes raisons que l'état de connexion (voir `auth/oauth.ts`) : il doit survivre au retour cross-site. */
const ATTRIBUTS = "Path=/; HttpOnly; SameSite=None; Secure";
const efface = `${COOKIE}=; ${ATTRIBUTS}; Max-Age=0`;

export const estEtatAgenda = (etat: string | null) => Boolean(etat?.startsWith("agenda."));

const versCalendrier = (request: Request, params: Record<string, string>) => {
  const url = new URL("/calendrier", request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { location: url.toString(), "set-cookie": efface } });
};

export async function debut(request: Request, fournisseur: string): Promise<Response> {
  if (fournisseur !== "google" && fournisseur !== "microsoft") return Response.json({ message: "Fournisseur inconnu." }, { status: 404 });
  const jeton = jetonDeLaRequete(request);
  if (!jeton || !(await lireSession(jeton))) return new Response(null, { status: 302, headers: { location: new URL("/api/auth/google", request.url).toString() } });
  if (fournisseur === "microsoft" && !microsoftConfigure()) return versCalendrier(request, { erreur: "Outlook n’est pas encore configuré sur Bruno : collez plutôt le lien iCal." });
  const etat = `agenda.${fournisseur}.${crypto.randomUUID()}`;
  return new Response(null, {
    status: 302,
    headers: { location: urlAutorisation(fournisseur, request, etat), "set-cookie": `${COOKIE}=${etat}; ${ATTRIBUTS}; Max-Age=900` },
  });
}

export async function retour(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const etat = params.get("state") ?? "";
  const attendu = (request.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))?.[1];
  if (!attendu || attendu !== etat) return versCalendrier(request, { erreur: "Le branchement a expiré. Recommencez." });
  const fournisseur = etat.split(".")[1] as FournisseurOAuth;
  if (params.get("error")) return versCalendrier(request, { erreur: params.get("error") === "access_denied" ? "Branchement annulé." : `Refusé par le fournisseur : ${params.get("error_description") ?? params.get("error")}` });
  const code = params.get("code");
  if (!code) return versCalendrier(request, { erreur: "Le fournisseur n’a rien renvoyé." });
  try {
    const ctx = await membreCourant(request);
    const { email, refreshToken } = await echangerCodeAgenda(fournisseur, request, code);
    await brancherCompte(ctx, fournisseur, email, refreshToken);
    return versCalendrier(request, { branche: email });
  } catch (e) {
    console.error("[agenda] branchement échoué", e);
    return versCalendrier(request, { erreur: e instanceof Error ? e.message : "Le branchement a échoué." });
  }
}
