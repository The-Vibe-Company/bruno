import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";
import { creer, lister } from "@/api/taches";

export const GET = route(C.FiltresTaches, ({ ctx, entree }) => lister(ctx, entree));
export const POST = route(C.CreerTache, ({ ctx, entree }) => creer(ctx, entree));
