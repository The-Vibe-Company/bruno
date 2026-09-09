import * as C from "@/api/contrat";
import { activer, supprimer } from "@/api/affectations";
import { route } from "@/api/route-outils";

/** Désactiver ou réactiver — le geste normal. */
export const PATCH = route(C.ActiverAffectation, ({ ctx, params, entree }) => activer(ctx, params.id, entree.actif));
/** Supprimer — seulement si elle n'a jamais servi ; sinon l'API refuse et renvoie vers Désactiver. */
export const DELETE = route(undefined, ({ ctx, params }) => supprimer(ctx, params.id));
