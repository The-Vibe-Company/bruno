import { redirect } from "next/navigation";
import { lister, terminees } from "@/api/taches";
import { enCours, lister as listerAffectations } from "@/api/affectations";
import { enCours as projetsEnCours, lister as listerProjets } from "@/api/projets";
import { Affectations, AXE_PROJET } from "@/board/Affectations";
import { FiltreMembres } from "@/board/FiltreMembres";
import { membresActifs } from "@/lib/filtre-membres";
import type { TacheAttente, TacheFinie } from "@/board/EnAttente";
import { sessionCourante } from "@/auth/serveur";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jourOuvrePrecedent, libelleLong } from "@/lib/dates";
import { instant } from "@/relances/temps";
import { Kanban } from "@/board/Kanban";
import type { TacheCarte } from "@/board/Carte";

export const dynamic = "force-dynamic";

/** Le Board : Sur le feu en kanban. La colonne latérale (À trier, À venir, Idées) arrive avec BRU-14. */
export default async function Board({ searchParams }: { searchParams: Promise<{ membres?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google"); // le layout l'a déjà fait ; TypeScript veut la garantie
  const { membres: filtre } = await searchParams;

  const { jour } = instant();
  const [taches, aTrier, aVenir, idees, finiesRecemment, membres, affectations, choix, projets, choixProjets] = await Promise.all([
    lister(session, { bucket: "sur_le_feu", inclureTerminees: false }),
    lister(session, { bucket: "a_trier", inclureTerminees: false }),
    lister(session, { bucket: "a_venir", inclureTerminees: false }),
    lister(session, { bucket: "idees", inclureTerminees: false }),
    // Les Tâches finies depuis le dernier jour ouvré : cochée par erreur ce matin, elle se
    // rattrape ce soir — bien après le « Annuler » de six secondes.
    terminees(session, jourOuvrePrecedent(jour), jour),
    db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre).where(eq(membre.spaceId, session.spaceId)),
    enCours(session),
    listerAffectations(session),
    projetsEnCours(session),
    listerProjets(session),
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
    id: t.id, titre: t.titre, bucket: t.bucket as TacheAttente["bucket"], statut: t.statut,
    engagement: t.engagement, reportsCount: t.reportsCount,
    assigneId: t.assigneId, assigne: t.assigneId ? personne(t.assigneId) : null,
    aidantIds: t.aidantIds, aidants: t.aidantIds.map(personne),
    notes: t.notes, transcriptionBrute: t.transcriptionBrute, raisonBlocage: t.raisonBlocage,
    auteur: t.creeParId ? personne(t.creeParId) : null,
  }));

  // Abandonné n'est pas fait : la Tâche quitte le Board sans rejoindre la section Fait.
  // Le « Annuler » de six secondes reste, et elle se retrouve dans Fait › abandonnées.
  const finies: TacheFinie[] = finiesRecemment
    .filter((t) => t.etatTerminal === "termine" && t.assigneId && actifs.has(t.assigneId))
    .map((t) => ({
      id: t.id, titre: t.titre, bucket: t.bucket as TacheFinie["bucket"], statut: t.statut,
      engagement: t.engagement, reportsCount: t.reportsCount,
      assigneId: t.assigneId, assigne: t.assigneId ? personne(t.assigneId) : null,
      aidantIds: t.aidantIds, aidants: t.aidantIds.map(personne),
      notes: t.notes, transcriptionBrute: t.transcriptionBrute, raisonBlocage: t.raisonBlocage,
      fin: { etat: t.etatTerminal!, jour: t.jourFin },
    }));

  return (
    <>
      <header className="flex h-12 flex-none items-center gap-5 border-b border-bord-2 px-5">
        <h1 className="text-[17px] font-medium tracking-tight">Sur le feu</h1>
        <span className="text-[13px] text-texte-sourd">{libelleLong()}</span>
        <FiltreMembres membres={membres} />
        <div className="flex-1" />
      </header>
      <Affectations membres={affectations} moiId={session.membreId} choix={choix.filter((c) => c.actif)} />
      <Affectations membres={projets} moiId={session.membreId} choix={choixProjets.filter((c) => c.actif)} axe={AXE_PROJET} />
      <main className="flex min-h-0 flex-1 flex-col">
        <Kanban taches={cartes} enAttente={enAttente} finies={finies} membres={membres} moiId={session.membreId} />
      </main>
    </>
  );
}
