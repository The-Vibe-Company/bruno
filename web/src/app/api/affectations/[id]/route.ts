import * as C from "@/api/contrat";
import { activer } from "@/api/affectations";
import { route } from "@/api/route-outils";

/** Désactiver ou réactiver. Il n'y a pas de DELETE, et c'est voulu : on ne troue pas l'historique. */
export const PATCH = route(C.ActiverAffectation, ({ ctx, params, entree }) => activer(ctx, params.id, entree.actif));
