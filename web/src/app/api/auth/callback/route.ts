import { DomaineRefuse, verifierIdToken } from "@/auth/google";
import { MembreDesactive, membrePourIdentite } from "@/auth/membre";
import { retenirConnexion, retrouverConnexion } from "@/auth/connexion-echangee";
import { CodeDejaEchange, diagnostiquerEtat, echangerCode, etatEfface, retourIOS } from "@/auth/oauth";
import { creerSession, enteteCookie, type Session } from "@/auth/session";
import { estEtatAgenda, retour as retourAgenda } from "@/agenda/oauth";

/** Le retour de Google. Un refus doit être lisible, pas une page blanche. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // Un Agenda qu'on branche revient par ici aussi : c'est la seule adresse déclarée chez Google.
  if (estEtatAgenda(params.get("state"))) return retourAgenda(request);
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

  // L'état est valide ici : c'est bien le navigateur qui est parti chez Google.
  const etatRecu = params.get("state")!;
  const connecte = async (session: Session) => new Response(null, {
    status: 302,
    headers: [
      ["location", racine.toString()],
      ["set-cookie", enteteCookie(await creerSession(session))],
      ["set-cookie", etatEfface],
    ],
  });

  try {
    const identite = await verifierIdToken(await echangerCode(request, code));
    const session = await membrePourIdentite(identite);
    await retenirConnexion(etatRecu, session);
    return await connecte(session);
  } catch (e) {
    if (e instanceof DomaineRefuse) return echec("hors_domaine");
    if (e instanceof MembreDesactive) return echec("desactive");
    // Le même retour est arrivé deux fois et l'autre requête a déjà échangé le code :
    // c'est elle qui sait qui se connecte.
    if (e instanceof CodeDejaEchange) {
      const deja = await retrouverConnexion(etatRecu).catch(() => null);
      if (deja) {
        console.warn("[auth] retour de Google reçu deux fois : connexion reprise");
        return await connecte(deja);
      }
    }
    console.error("[auth] connexion échouée", e);
    return echec("erreur");
  }
}
