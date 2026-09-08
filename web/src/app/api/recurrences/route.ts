import * as C from "@/api/contrat";
import { creer, lister } from "@/api/recurrences";
import { route } from "@/api/route-outils";

export const GET = route(undefined, ({ ctx }) => lister(ctx));
export const POST = route(C.PoserRecurrence, ({ ctx, entree }) => creer(ctx, entree));
