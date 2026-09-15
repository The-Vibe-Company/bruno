import { DomaineRefuse, verifierIdToken } from "@/auth/google";
import { MembreDesactive, membrePourIdentite } from "@/auth/membre";
import { creerSession } from "@/auth/session";
import { echangerCode } from "@/auth/oauth";

/**
 * L'entrée d'iOS. Échange le code Google à usage unique avec le vérificateur PKCE
 * conservé par l'app, puis renvoie la session à garder dans le trousseau.
 * L'échange d'un idToken obtenu par un SDK natif reste compatible.
 */
export async function POST(request: Request) {
  const corps: unknown = await request.json().catch(() => null);
  if (!corps || typeof corps !== "object") return Response.json({ message: "Requête invalide." }, { status: 422 });
  const { idToken, code, codeVerifier } = corps as Record<string, unknown>;
  const codeValide = typeof code === "string" && code.length > 0 && code.length < 4096 &&
    typeof codeVerifier === "string" && /^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier);
  const jetonValide = typeof idToken === "string" && idToken.length > 0;
  if (!codeValide && !jetonValide) {
    return Response.json({ code: "requete_invalide", message: "Code et vérificateur de connexion manquants." }, { status: 422 });
  }
  try {
    const token = codeValide ? await echangerCode(request, code, codeVerifier) : idToken as string;
    const session = await membrePourIdentite(await verifierIdToken(token));
    return Response.json({ jeton: await creerSession(session) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof DomaineRefuse) {
      return Response.json({ code: "hors_domaine", message: e.message }, { status: 403 });
    }
    if (e instanceof MembreDesactive) return Response.json({ message: "Ce compte a été désactivé." }, { status: 403 });
    console.error(e);
    return Response.json({ code: "non_authentifie", message: "Jeton refusé." }, { status: 401 });
  }
}
