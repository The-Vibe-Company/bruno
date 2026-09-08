import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { lister } from "@/api/creneaux";
import { sessionCourante } from "@/auth/serveur";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { Compte } from "@/reglages/Compte";
import { Creneaux } from "@/reglages/Creneaux";
import { Coquille } from "../Coquille";

export const dynamic = "force-dynamic";

/** Les Réglages : les Créneaux, le compte. Et bientôt la liste des Affectations (BRU-26). Rien d'autre. */
export default async function Reglages() {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const [creneaux, [moi]] = await Promise.all([lister(session), db.select().from(membre).where(eq(membre.id, session.membreId))]);
  return (
    <Coquille initiale={session.nom.charAt(0).toUpperCase()} page="reglages">
      <header className="flex h-16 flex-none items-center border-b border-bord-2 px-8"><h1 className="text-[22px] font-medium tracking-tight">Réglages</h1></header>
      <main className="grid flex-1 grid-cols-1 content-start gap-16 px-10 py-8 md:grid-cols-2">
        <Creneaux initiaux={creneaux} />
        <div className="flex flex-col gap-12"><Compte nom={moi.nom} email={moi.email} /></div>
      </main>
    </Coquille>
  );
}
