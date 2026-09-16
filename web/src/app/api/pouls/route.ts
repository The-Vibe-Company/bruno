import * as C from "@/api/contrat";
import { battre } from "@/api/presence";
import { route } from "@/api/route-outils";

/** « Je suis là, sur cette page » — et en retour, qui d'autre l'est, et si quelque chose a bougé. */
export const POST = route(C.Battre, ({ ctx, entree }) => battre(ctx, entree.page));
