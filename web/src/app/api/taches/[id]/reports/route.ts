import { route } from "@/api/route-outils";
import { reports } from "@/api/taches";

export const GET = route(undefined, ({ ctx, params }) => reports(ctx, params.id));
