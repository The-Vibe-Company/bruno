import { route } from "@/api/route-outils";
import { abandonner } from "@/api/taches";

export const POST = route(undefined, ({ ctx, params }) => abandonner(ctx, params.id));
