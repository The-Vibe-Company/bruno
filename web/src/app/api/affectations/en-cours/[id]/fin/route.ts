import { fermer } from "@/api/affectations";
import { route } from "@/api/route-outils";

/** « Je ne suis plus dessus. » La fin se pose au jour même ; rien n'est effacé. */
export const POST = route(undefined, ({ ctx, params }) => fermer(ctx, params.id));
