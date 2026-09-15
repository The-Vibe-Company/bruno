import * as C from "@/api/contrat";
import { historique } from "@/api/projets";
import { route } from "@/api/route-outils";

export const GET = route(C.FiltreHistorique, ({ ctx, entree }) => historique(ctx, entree.membreId ?? ctx.membreId));
