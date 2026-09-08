import * as C from "@/api/contrat";
import { ajouter, lister } from "@/api/affectations";
import { route } from "@/api/route-outils";

export const GET = route(undefined, ({ ctx }) => lister(ctx));
export const POST = route(C.AjouterAffectation, ({ ctx, entree }) => ajouter(ctx, entree.nom, entree.couleur));
