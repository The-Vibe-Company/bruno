import { DomaineRefuse, verifierIdToken } from "@/auth/google";
import { MembreDesactive, membrePourIdentite } from "@/auth/membre";
import { diagnostiquerEtat, echangerCode, etatEfface, retourIOS } from "@/auth/oauth";
import { creerSession, enteteCookie } from "@/auth/session";

/** Le retour de Google. Un refus doit être lisible, pas une page blanche. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const racine = new URL("/", request.url);

  /** Un échec se lit sur la page de connexion — jamais sur `/`, qui renverrait chez Google en boucle. */
  const echec = (raison: string) => {
    const page = new URL("/connexion", request.url);
    page.searchParams.set("raison", raison);
    return new Response(null, {
      status: 302,
      headers: { location: page.toString(), "set-cookie": etatEfface },
    });
  };

  const etat = diagnostiquerEtat(request, params.get("state"));
  if (etat.valide) {
    const retour = retourIOS(params);
    if (retour) return new Response(null, {
      status: 302,
      headers: { location: retour.toString(), "set-cookie": etatEfface, "cache-control": "no-store", "referrer-policy": "no-referrer" },
    });
  }
  if (params.get("error")) return echec("refusee");
  if (!etat.valide) {
    // Booléens seulement : assez pour comprendre (cookie absent ? état absent ? différents ?),
    // rien qui permette de rejouer quoi que ce soit.
    console.warn("[auth] état OAuth invalide", etat);
    return echec("etat_invalide");
  }
  const code = params.get("code");
  if (!code) return echec("code_manquant");

  try {
    const identite = await verifierIdToken(await echangerCode(request, code));
    const session = await membrePourIdentite(identite);
    const jeton = await creerSession(session);
    return new Response(null, {
      status: 302,
      headers: [
        ["location", racine.toString()],
        ["set-cookie", enteteCookie(jeton)],
        ["set-cookie", etatEfface],
      ],
    });
  } catch (e) {
    if (e instanceof DomaineRefuse) return echec("hors_domaine");
    if (e instanceof MembreDesactive) return echec("desactive");
    console.error("[auth] connexion échouée", e);
    return echec("erreur");
  }
}
