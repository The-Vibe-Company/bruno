import { supprimer } from "@/api/sujets";
import { route } from "@/api/route-outils";

export const DELETE = route(undefined, ({ ctx, params }) => supprimer(ctx, params.id));
