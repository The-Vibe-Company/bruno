import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";
import { deplacer } from "@/api/taches";

/** Le droit d'entrée Sur le feu passe par ici, et seulement par ici. */
export const POST = route(C.DeplacerTache, ({ ctx, params, entree }) => deplacer(ctx, params.id, entree));
