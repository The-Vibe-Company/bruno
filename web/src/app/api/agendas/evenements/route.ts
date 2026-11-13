import { lire } from "@/api/agendas";
import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";

export const GET = route(C.PeriodeAgendas, ({ ctx, entree }) => lire(ctx, entree.du, entree.au));
