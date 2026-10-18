import { lister, revoquer } from "@/api/jetons";
import { route } from "@/api/route-outils";

/** Révoquer coupe l'accès tout de suite. On renvoie la liste, à jour. */
export const POST = route(undefined, async ({ ctx, params }) => {
  await revoquer(ctx, params.id);
  return lister(ctx);
});
