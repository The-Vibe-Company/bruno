import { route } from "@/api/route-outils";
import { rouvrir } from "@/api/taches";

/** Un « Terminé » de trop : on rouvre, rien d'autre ne bouge. */
export const POST = route(undefined, ({ ctx, params }) => rouvrir(ctx, params.id));
