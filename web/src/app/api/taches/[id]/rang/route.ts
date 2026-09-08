import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";
import { reordonner } from "@/api/taches";

export const POST = route(C.Reordonner, ({ ctx, params, entree }) => reordonner(ctx, params.id, entree));
