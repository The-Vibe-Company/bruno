import { eq } from "drizzle-orm";
import { route } from "@/api/route-outils";
import { db } from "@/db/client";
import { membre } from "@/db/schema";

/** Qui suis-je. La seule route dont le web a besoin pour savoir s'il est connecté. */
export const GET = route(undefined, async ({ ctx }) => {
  const [m] = await db.select().from(membre).where(eq(membre.id, ctx.membreId));
  return { id: m.id, nom: m.nom, email: m.email, spaceId: m.spaceId };
});
