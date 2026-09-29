import { contenu, retirer } from "@/api/images";
import { membreCourant } from "@/api/membre-courant";
import { reponseErreur, route } from "@/api/route-outils";

/** L'image elle-même. Son identifiant ne change jamais : le navigateur peut la garder pour toujours. */
export async function GET(request: Request, contexte: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await membreCourant(request);
    const { id } = await contexte.params;
    const i = await contenu(ctx, id);
    return new Response(new Uint8Array(i.contenu), {
      headers: { "content-type": i.type, "cache-control": "private, max-age=31536000, immutable" },
    });
  } catch (e) {
    return reponseErreur(e);
  }
}

export const DELETE = route(undefined, ({ ctx, params }) => retirer(ctx, params.id));
