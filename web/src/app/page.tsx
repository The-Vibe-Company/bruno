import { redirect } from "next/navigation";
import { lister } from "@/api/taches";
import { enCours } from "@/api/affectations";
import { Affectations } from "@/board/Affectations";
import { Filtres } from "@/board/Filtres";
import type { TacheAttente } from "@/board/EnAttente";
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
export default async function Board({ searchParams }: { searchParams: Promise<{ q?: string; assigne?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const { q, assigne } = await searchParams;

  const [taches, aTrier, aVenir, idees, membres, affectations] = await Promise.all([
    lister(session, { bucket: "sur_le_feu", inclureTerminees: false, q: q?.trim() || undefined, assigneId: assigne || undefined }),
    lister(session, { bucket: "a_trier", inclureTerminees: false }),
    lister(session, { bucket: "a_venir", inclureTerminees: false }),
    lister(session, { bucket: "idees", inclureTerminees: false }),
    db.select({ id: membre.id, nom: membre.nom }).from(membre).where(eq(membre.spaceId, session.spaceId)),
    enCours(session),
  ]);
  const nomDe = new Map(membres.map((m) => [m.id, m.nom]));
  const cartes: TacheCarte[] = taches.map((t) => ({
    id: t.id, titre: t.titre, statut: t.statut ?? "a_faire", engagement: t.engagement,
    reportsCount: t.reportsCount, assigne: t.assigneId ? { nom: nomDe.get(t.assigneId) ?? "?" } : null,
    aidants: t.aidantIds.map((id) => ({ nom: nomDe.get(id) ?? "?" })),
    notes: t.notes, transcriptionBrute: t.transcriptionBrute,
  }));
  const enAttente: TacheAttente[] = [...aTrier, ...aVenir, ...idees].map((t) => ({
    id: t.id, titre: t.titre, bucket: t.bucket as TacheAttente["bucket"], transcriptionBrute: t.transcriptionBrute,
    engagement: t.engagement, auteur: t.creeParId ? { nom: nomDe.get(t.creeParId) ?? "?" } : null,
    assigne: t.assigneId ? { nom: nomDe.get(t.assigneId) ?? "?" } : null,
  }));

  return (
    <Coquille initiale={session.nom.charAt(0).toUpperCase()}>
      <header className="flex h-16 flex-none items-center gap-8 border-b border-bord-2 px-8">
        <h1 className="text-[22px] font-medium tracking-tight">Sur le feu</h1>
        <span className="text-[15px] text-texte-sourd">{libelleLong()}</span>
        <div className="flex-1" />
        <Filtres membres={membres} />
      </header>
      <Affectations membres={affectations} />
      <main className="flex min-h-0 flex-1 flex-col">
        <Kanban taches={cartes} enAttente={enAttente} membres={membres} moiId={session.membreId} />
      </main>
    </Coquille>
  );
}
