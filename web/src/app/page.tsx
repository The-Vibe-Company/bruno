import { redirect } from "next/navigation";
import { lister } from "@/api/taches";
import { sessionCourante } from "@/auth/serveur";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { eq } from "drizzle-orm";
import { libelleLong } from "@/lib/dates";
import { Kanban } from "@/board/Kanban";
import type { TacheCarte } from "@/board/Carte";
import { Coquille } from "./Coquille";

export const dynamic = "force-dynamic";

/** Le Board : Sur le feu en kanban. La colonne latérale (À trier, À venir, Idées) arrive avec BRU-14. */
export default async function Board() {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");

  const [taches, membres] = await Promise.all([
    lister(session, { bucket: "sur_le_feu", inclureTerminees: false }),
    db.select({ id: membre.id, nom: membre.nom }).from(membre).where(eq(membre.spaceId, session.spaceId)),
  ]);
  const nomDe = new Map(membres.map((m) => [m.id, m.nom]));
  const cartes: TacheCarte[] = taches.map((t) => ({
    id: t.id, titre: t.titre, statut: t.statut ?? "a_faire", engagement: t.engagement,
    reportsCount: t.reportsCount, assigne: t.assigneId ? { nom: nomDe.get(t.assigneId) ?? "?" } : null,
  }));

  return (
    <Coquille initiale={session.nom.charAt(0).toUpperCase()}>
      <header className="flex items-baseline justify-between px-8 pt-7 pb-4">
        <h1 className="text-[28px] font-semibold tracking-tight">Sur le feu</h1>
        <span className="text-sm text-texte-sourd">{libelleLong()}</span>
      </header>
      <main className="flex min-h-0 flex-1 flex-col px-8 pb-8">
        <Kanban taches={cartes} />
      </main>
    </Coquille>
  );
}
