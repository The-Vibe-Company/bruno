import * as C from "@/api/contrat";
import { lister, poser } from "@/api/sujets";
import { route } from "@/api/route-outils";

/** Les Sujets d'une semaine. */
export const GET = route(C.FiltreSujets, ({ ctx, entree }) => lister(ctx, entree.lundi));
/** « Cette semaine, je veux parler de… » — sur sa liste ou celle d'un autre. */
export const POST = route(C.PoserSujet, ({ ctx, entree }) => poser(ctx, entree));
