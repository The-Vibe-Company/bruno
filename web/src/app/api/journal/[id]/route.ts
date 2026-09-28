import { effacer } from "@/api/journal";
import { route } from "@/api/route-outils";

/** Effacer une entrée : la sienne, et seulement la sienne. */
export const DELETE = route(undefined, ({ ctx, params }) => effacer(ctx, params.id));
