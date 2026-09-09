import { eq } from "drizzle-orm";
import * as C from "@/api/contrat";
import { route } from "@/api/route-outils";
import { db } from "@/db/client";
import { membre } from "@/db/schema";

/** Qui suis-je. La seule route dont le web a besoin pour savoir s'il est connecté. */
export const GET = route(undefined, async ({ ctx }) => {
  const [m] = await db.select().from(membre).where(eq(membre.id, ctx.membreId));
  return { id: m.id, nom: m.nom, email: m.email, spaceId: m.spaceId, avatar: m.avatar };
});

/** Ma photo de profil — la poser, ou la retirer. */
export const PATCH = route(C.ModifierMoi, async ({ ctx, entree }) => {
  await db.update(membre).set({ avatar: entree.avatar }).where(eq(membre.id, ctx.membreId));
  const [m] = await db.select().from(membre).where(eq(membre.id, ctx.membreId));
  return { id: m.id, nom: m.nom, email: m.email, spaceId: m.spaceId, avatar: m.avatar };
});
