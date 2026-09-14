import * as C from "@/api/contrat";
import { modifier, supprimer } from "@/api/sujets";
import { route } from "@/api/route-outils";

/** Changer à qui il est, ou ce qu'il dit. */
export const PATCH = route(C.ModifierSujet, ({ ctx, params, entree }) => modifier(ctx, params.id, entree));
export const DELETE = route(undefined, ({ ctx, params }) => supprimer(ctx, params.id));
