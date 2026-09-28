import * as C from "@/api/contrat";
import { ecrire, etat } from "@/api/journal";
import { route } from "@/api/route-outils";

/** L'état des lieux d'une Affectation : qui est dessus, qui y est passé, et ce qu'on en a dit. */
export const GET = route(undefined, ({ ctx, params }) => etat(ctx, params.id));
/** Écrire au journal — daté, signé, jamais écrasé. */
export const POST = route(C.EcrireAuJournal, ({ ctx, params, entree }) => ecrire(ctx, params.id, entree.texte));
