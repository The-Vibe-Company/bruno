import { after } from "next/server";
import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";
import { creer, lister } from "@/api/taches";
import { enrichir } from "@/enrichissement/enrichir";

export const GET = route(C.FiltresTaches, ({ ctx, entree }) => lister(ctx, entree));
/** Créer, répondre — puis enrichir, après la réponse, sans jamais la retarder (BRU-9). */
export const POST = route(C.CreerTache, async ({ ctx, entree }) => {
  const t = await creer(ctx, entree);
  if (t.bucket === "a_trier") after(() => enrichir(ctx, t.id));
  return t;
});
