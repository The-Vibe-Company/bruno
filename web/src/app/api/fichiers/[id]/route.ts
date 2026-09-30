import { contenu, retirer } from "@/api/fichiers";
import { membreCourant } from "@/api/membre-courant";
import { reponseErreur, route } from "@/api/route-outils";

/**
 * Le fichier lui-même. Il est rangé en privé : c'est ici qu'on vérifie qui demande, et l'octet
 * ne sort que pour un Membre de l'Espace. Son identifiant ne change jamais, donc le navigateur
 * peut le garder ; un PDF s'ouvre sous son vrai nom.
 */
export async function GET(request: Request, contexte: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await membreCourant(request);
    const { id } = await contexte.params;
    const f = await contenu(ctx, id);
    return new Response(f.flux, {
      headers: {
        "content-type": f.type,
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.nom)}`,
        "cache-control": "private, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return reponseErreur(e);
  }
}

export const DELETE = route(undefined, ({ ctx, params }) => retirer(ctx, params.id));
