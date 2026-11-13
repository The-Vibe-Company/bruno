import { ajouterLien, lister } from "@/api/agendas";
import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";

/** Les Agendas de tout le monde : le Calendrier les montre tous. */
export const GET = route(undefined, ({ ctx }) => lister(ctx));

/** Un lien iCal, pour n'importe quel Membre. Google et Microsoft passent par /api/auth/agenda. */
export const POST = route(C.AjouterLienAgenda, ({ ctx, entree }) => ajouterLien(ctx, entree));
