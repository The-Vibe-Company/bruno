/**
 * Une photo de profil, en image — pas en texte dans une page. Voir `lib/avatar-url.ts`.
 *
 * Réservée aux Membres de l'Espace, comme le reste. L'adresse porte une empreinte de la photo,
 * donc la réponse peut se garder indéfiniment : une nouvelle photo aura une autre adresse.
 */
import { and, eq } from "drizzle-orm";
import { membreCourant } from "@/api/membre-courant";
import { reponseErreur } from "@/api/route-outils";
import { db } from "@/db/client";
import { membre } from "@/db/schema";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await membreCourant(request);
    const { id } = await params;
    const [m] = await db.select({ avatar: membre.avatar }).from(membre)
      .where(and(eq(membre.id, id), eq(membre.spaceId, ctx.spaceId)));
    const morceaux = m?.avatar?.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (!morceaux) return new Response(null, { status: 404 });
    return new Response(Buffer.from(morceaux[2], "base64"), {
      headers: { "content-type": morceaux[1], "cache-control": "private, max-age=31536000, immutable" },
    });
  } catch (e) {
    return reponseErreur(e);
  }
}
