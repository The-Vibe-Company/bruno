import { lister } from "@/api/membres";
import { route } from "@/api/route-outils";

/** Les Membres actifs de l'Espace — pour choisir un Assigné, des Aidants. */
export const GET = route(undefined, ({ ctx }) => lister(ctx));
