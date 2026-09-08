import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";
import { reporter } from "@/api/taches";

/** Le seul chemin qui déplace un Engagement, et il exige une raison (invariant 4). */
export const POST = route(C.Reporter, ({ ctx, params, entree }) => reporter(ctx, params.id, entree));
