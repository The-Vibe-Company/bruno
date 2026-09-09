/** La session vue depuis un composant serveur : le cookie, lu par Next, puis notre jeton. */
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import type { Ctx } from "@/api/membre-courant";
import { COOKIE, lireSession } from "./session";

export async function sessionCourante(): Promise<(Ctx & { nom: string; avatar: string | null }) | null> {
  const jeton = (await cookies()).get(COOKIE)?.value;
  if (!jeton) return null;
  const s = await lireSession(jeton);
  if (!s) return null;
  const [m] = await db.select().from(membre).where(eq(membre.id, s.membreId));
  if (!m || !m.actif) return null;
  return { spaceId: m.spaceId, membreId: m.id, nom: m.nom, avatar: m.avatar };
}
