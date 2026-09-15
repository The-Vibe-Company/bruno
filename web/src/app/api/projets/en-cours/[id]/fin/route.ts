import { fermer } from "@/api/projets";
import { route } from "@/api/route-outils";

/** « Je ne suis plus dessus. » La fin se pose au jour même, l'histoire reste. */
export const POST = route(undefined, ({ ctx, params }) => fermer(ctx, params.id));
