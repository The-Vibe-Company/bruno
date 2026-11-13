import { colorer, retirer } from "@/api/agendas";
import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";

export const PATCH = route(C.ColorerAgenda, ({ ctx, params, entree }) => colorer(ctx, params.id, entree.couleur));
export const DELETE = route(undefined, ({ ctx, params }) => retirer(ctx, params.id));
