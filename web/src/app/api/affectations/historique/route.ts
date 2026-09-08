import * as C from "@/api/contrat";
import { historique } from "@/api/affectations";
import { route } from "@/api/route-outils";

/** « Hier j'étais sur MONKA. » Tout, fini compris. Sans `membreId`, c'est moi. */
export const GET = route(C.FiltreHistorique, ({ ctx, entree }) => historique(ctx, entree.membreId ?? ctx.membreId));
