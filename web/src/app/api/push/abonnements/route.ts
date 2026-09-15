import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";
import { abonner } from "@/api/push";

/** Les appareils qui recevront mes Relances. */
export const GET = route(undefined, ({ ctx }) => abonner.mesAppareils(ctx));
/** S'abonner : le navigateur vient d'accepter. Deux fois depuis le même navigateur ne fait qu'un. */
export const POST = route(C.AbonnerAppareil, ({ ctx, entree }) => abonner.poser(ctx, entree));
