import { retirer } from "@/api/agendas";
import { route } from "@/api/route-outils";

export const DELETE = route(undefined, ({ ctx, params }) => retirer(ctx, params.id));
