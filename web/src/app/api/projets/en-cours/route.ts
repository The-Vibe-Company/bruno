import * as C from "@/api/contrat";
import { enCours, poser } from "@/api/projets";
import { route } from "@/api/route-outils";

/** Qui est sur quel Projet, maintenant. */
export const GET = route(undefined, ({ ctx }) => enCours(ctx));
/** « Aujourd'hui je suis sur la refonte. » */
export const POST = route(C.PoserAffectation, ({ ctx, entree }) => poser(ctx, entree.membreId ?? ctx.membreId, entree.affectationId, entree.debut));
