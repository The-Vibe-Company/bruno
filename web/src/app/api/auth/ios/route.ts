import { DomaineRefuse, verifierIdToken } from "@/auth/google";
import { membrePourIdentite } from "@/auth/membre";
import { creerSession } from "@/auth/session";

/**
 * L'entrée d'iOS. L'application obtient son jeton d'identité nativement auprès de Google,
 * l'envoie ici, et repart avec une session de Bruno à garder dans le trousseau.
 */
export async function POST(request: Request) {
  const { idToken } = (await request.json().catch(() => ({}))) as { idToken?: string };
  if (!idToken) {
    return Response.json({ code: "requete_invalide", message: "idToken manquant." }, { status: 422 });
  }
  try {
    const session = await membrePourIdentite(await verifierIdToken(idToken));
    return Response.json({ jeton: await creerSession(session) });
  } catch (e) {
    if (e instanceof DomaineRefuse) {
      return Response.json({ code: "hors_domaine", message: e.message }, { status: 403 });
    }
    console.error(e);
    return Response.json({ code: "non_authentifie", message: "Jeton refusé." }, { status: 401 });
  }
}
