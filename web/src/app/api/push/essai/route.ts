import { route } from "@/api/route-outils";
import { abonner } from "@/api/push";

/** « Envoyer un essai » : la même notification que les Relances, tout de suite, à moi seul. */
export const POST = route(undefined, ({ ctx }) => abonner.essai(ctx));
