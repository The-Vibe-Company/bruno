import * as C from "@/api/contrat";
import { modifier, obtenir, supprimer } from "@/api/recurrences";
import { route } from "@/api/route-outils";

export const GET = route(undefined, ({ ctx, params }) => obtenir(ctx, params.id));
export const PUT = route(C.PoserRecurrence, ({ ctx, params, entree }) => modifier(ctx, params.id, entree));
/** Supprimer la règle. Les Tâches qu'elle a fabriquées restent : elles ne lui appartiennent pas. */
export const DELETE = route(undefined, ({ ctx, params }) => supprimer(ctx, params.id));
