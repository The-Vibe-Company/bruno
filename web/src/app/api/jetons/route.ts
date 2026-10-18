import * as C from "@/api/contrat";
import { creer, lister } from "@/api/jetons";
import { route } from "@/api/route-outils";

/** Les jetons de celui qui parle. Jamais ceux d'un autre Membre. */
export const GET = route(undefined, ({ ctx }) => lister(ctx));

/** Le clair est dans cette réponse, et nulle part ailleurs. */
export const POST = route(C.CreerJeton, ({ ctx, entree }) => creer(ctx, entree));
