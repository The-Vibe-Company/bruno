import { lister, poser } from "@/api/fichiers";
import { membreCourant } from "@/api/membre-courant";
import { reponseErreur, route } from "@/api/route-outils";

/** Les fichiers posés sur une Tâche — noms, types et poids ; jamais les octets. */
export const GET = route(undefined, ({ ctx, params }) => lister(ctx, params.id));

/**
 * En poser un. Le corps est le fichier lui-même : un `multipart` pour trois champs aurait
 * demandé un analyseur là où deux en-têtes suffisent.
 */
export async function POST(request: Request, contexte: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await membreCourant(request);
    const { id } = await contexte.params;
    const contenu = Buffer.from(await request.arrayBuffer());
    const nom = decodeURIComponent(request.headers.get("x-nom") ?? "fichier");
    const type = request.headers.get("content-type")?.split(";")[0] ?? "";
    return Response.json(await poser(ctx, id, { nom, type, contenu }));
  } catch (e) {
    return reponseErreur(e);
  }
}
