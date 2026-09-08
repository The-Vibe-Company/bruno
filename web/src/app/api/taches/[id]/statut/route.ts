import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";
import { changerStatut } from "@/api/taches";

export const POST = route(C.ChangerStatut, ({ ctx, params, entree }) => changerStatut(ctx, params.id, entree.statut));
