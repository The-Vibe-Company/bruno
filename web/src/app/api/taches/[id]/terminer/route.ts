import { route } from "@/api/route-outils";
import { terminer } from "@/api/taches";

export const POST = route(undefined, ({ ctx, params }) => terminer(ctx, params.id));
