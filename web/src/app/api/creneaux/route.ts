import * as C from "@/api/contrat";
import { ajouter, lister } from "@/api/creneaux";
import { route } from "@/api/route-outils";

export const GET = route(undefined, ({ ctx }) => lister(ctx));
export const POST = route(C.PoserCreneau, ({ ctx, entree }) => ajouter(ctx, entree.heure));
