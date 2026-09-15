import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";
import { abonner } from "@/api/push";

/** L'app iPhone annonce son jeton APNs — à chaque lancement : Apple le change quand il veut. */
export const POST = route(C.AbonnerIphone, ({ ctx, entree }) => abonner.poserIphone(ctx, entree));
