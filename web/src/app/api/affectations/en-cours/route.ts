import * as C from "@/api/contrat";
import { enCours, poser } from "@/api/affectations";
import { route } from "@/api/route-outils";

/** Qui est sur quoi, maintenant. */
export const GET = route(undefined, ({ ctx }) => enCours(ctx));
/** « Aujourd'hui je suis sur MONKA. » */
export const POST = route(C.PoserAffectation, ({ ctx, entree }) => poser(ctx, entree.membreId ?? ctx.membreId, entree.affectationId, entree.debut));
