import { route } from "@/api/route-outils";
import { abonner } from "@/api/push";

/** Ne plus rien recevoir sur cet appareil-là. */
export const DELETE = route(undefined, ({ ctx, params }) => abonner.retirer(ctx, params.id));
