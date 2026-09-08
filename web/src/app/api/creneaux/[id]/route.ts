import * as C from "@/api/contrat";
import { deplacer, retirer } from "@/api/creneaux";
import { route } from "@/api/route-outils";

export const PATCH = route(C.PoserCreneau, ({ ctx, params, entree }) => deplacer(ctx, params.id, entree.heure));
/** Refusé sous trois Créneaux : le minimum est tenu ici, pas en base (ADR 0002). */
export const DELETE = route(undefined, ({ ctx, params }) => retirer(ctx, params.id));
