import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";
import { modifier, obtenir, supprimer } from "@/api/taches";

export const GET = route(undefined, ({ ctx, params }) => obtenir(ctx, params.id));
export const PATCH = route(C.ModifierTache, ({ ctx, params, entree }) => modifier(ctx, params.id, entree));
/** Supprimer efface pour de bon : réservé à ce qui n'aurait jamais dû exister. */
export const DELETE = route(undefined, ({ ctx, params }) => supprimer(ctx, params.id));
