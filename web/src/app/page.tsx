import { redirect } from "next/navigation";
import { lister } from "@/api/taches";
import { enCours, lister as listerAffectations } from "@/api/affectations";
import { Affectations } from "@/board/Affectations";
import { Recherche } from "@/board/Filtres";
import { FiltreMembres } from "@/board/FiltreMembres";
import { membresActifs } from "@/lib/filtre-membres";
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
export default async function Board({ searchParams }: { searchParams: Promise<{ q?: string; membres?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const { q, membres: filtre } = await searchParams;

  const [taches, aTrier, aVenir, idees, membres, affectations, choix] = await Promise.all([
    lister(session, { bucket: "sur_le_feu", inclureTerminees: false, q: q?.trim() || undefined }),
    lister(session, { bucket: "a_trier", inclureTerminees: false }),
    lister(session, { bucket: "a_venir", inclureTerminees: false }),
    lister(session, { bucket: "idees", inclureTerminees: false }),
    db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre).where(eq(membre.spaceId, session.spaceId)),
    enCours(session),
    listerAffectations(session),
  ]);
  const parId = new Map(membres.map((m) => [m.id, m]));
  const personne = (id: string) => { const m = parId.get(id); return { nom: m?.nom ?? "?", avatar: m?.avatar ?? null }; };
  const actifs = membresActifs(filtre, membres);
  const cartes: TacheCarte[] = taches.filter((t) => t.assigneId && actifs.has(t.assigneId)).map((t) => ({
    id: t.id, titre: t.titre, statut: t.statut ?? "a_faire", engagement: t.engagement,
    reportsCount: t.reportsCount, assigneId: t.assigneId, assigne: t.assigneId ? personne(t.assigneId) : null,
    aidantIds: t.aidantIds, aidants: t.aidantIds.map(personne),
    notes: t.notes, transcriptionBrute: t.transcriptionBrute, raisonBlocage: t.raisonBlocage,
  }));
  const enAttente: TacheAttente[] = [...aTrier, ...aVenir, ...idees].map((t) => ({
    id: t.id, titre: t.titre, bucket: t.bucket as TacheAttente["bucket"], transcriptionBrute: t.transcriptionBrute,
    engagement: t.engagement, auteur: t.creeParId ? personne(t.creeParId) : null,
    assigne: t.assigneId ? personne(t.assigneId) : null,
  }));

  return (
    <Coquille initiale={session.nom.charAt(0).toUpperCase()} avatar={session.avatar}>
      <header className="flex h-12 flex-none items-center gap-5 border-b border-bord-2 px-5">
        <h1 className="text-[17px] font-medium tracking-tight">Sur le feu</h1>
        <span className="text-[13px] text-texte-sourd">{libelleLong()}</span>
        <FiltreMembres membres={membres} />
        <div className="flex-1" />
        <Recherche />
      </header>
      <Affectations membres={affectations} moiId={session.membreId} choix={choix.filter((c) => c.actif)} />
      <main className="flex min-h-0 flex-1 flex-col">
        <Kanban taches={cartes} enAttente={enAttente} membres={membres} moiId={session.membreId} />
      </main>
    </Coquille>
  );
}
