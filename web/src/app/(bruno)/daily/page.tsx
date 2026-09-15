import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auJour, enCours } from "@/api/affectations";
import { auJour as projetsAuJour, enCours as projetsEnCours } from "@/api/projets";
import { SEUIL_SIGNAL, lister, signaux, terminees } from "@/api/taches";
import { sessionCourante } from "@/auth/serveur";
import { Affectations } from "@/board/Affectations";
import { FiltreMembres } from "@/board/FiltreMembres";
import { membresActifs } from "@/lib/filtre-membres";
import { Hier, type TacheFinie } from "@/daily/Hier";
import { Sante } from "@/daily/Sante";
import { SurLeFeu, type TacheDuJour } from "@/daily/SurLeFeu";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { jourOuvrePrecedent, libelleLong, veille } from "@/lib/dates";
import { instant } from "@/relances/temps";

export const dynamic = "force-dynamic";

/**
 * Le Daily : l'interface de la réunion du matin. Lecture seule, projetable, une seule page.
 * Aucune donnée nouvelle — il n'agrège que ce qui existe déjà.
 */
export default async function Daily({ searchParams }: { searchParams: Promise<{ membres?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google"); // le layout l'a déjà fait ; TypeScript veut la garantie
  const { membres: filtre } = await searchParams;
  const { jour } = instant();
  const hier = jourOuvrePrecedent(jour);

  const [sante, dujour, projetsDuJour, delaVeille, projetsDeLaVeille, finies, feu, membres] = await Promise.all([
    signaux(session),
    enCours(session),
    projetsEnCours(session),
    auJour(session, hier),
    projetsAuJour(session, hier),
    // Depuis la dernière fois qu'on s'est vus, aujourd'hui compris : on le dit au point du matin.
    terminees(session, hier, jour),
    lister(session, { bucket: "sur_le_feu", inclureTerminees: false }),
    db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre).where(eq(membre.spaceId, session.spaceId)),
  ]);
  const parId = new Map(membres.map((m) => [m.id, m]));
  const personne = (id: string) => { const m = parId.get(id); return { nom: m?.nom ?? "?", avatar: m?.avatar ?? null }; };
  const actifs = membresActifs(filtre, membres);
  const deLui = <T extends { membreId: string }>(l: T[]) => l.filter((m) => actifs.has(m.membreId));
  // Abandonné n'est pas fait : le Daily dit ce qui a avancé, pas ce qu'on a enterré.
  const tachesHier: TacheFinie[] = finies
    .filter((t) => t.etatTerminal === "termine" && t.assigneId && actifs.has(t.assigneId))
    .map((t) => ({ id: t.id, titre: t.titre, etat: t.etatTerminal!, jour: t.jourFin, assigne: t.assigneId ? personne(t.assigneId) : null }));
  const tachesFeu: TacheDuJour[] = feu.filter((t) => t.assigneId && actifs.has(t.assigneId)).map((t) => ({
    id: t.id, titre: t.titre, statut: t.statut ?? "a_faire", engagement: t.engagement, reportsCount: t.reportsCount,
    assigne: t.assigneId ? personne(t.assigneId) : null, raisonBlocage: t.raisonBlocage,
  }));

  return (
    <>
      <header className="flex h-12 flex-none items-center gap-5 border-b border-bord-2 px-5">
        <h1 className="text-[17px] font-medium tracking-tight">Daily</h1>
        <span className="text-[13px] text-texte-sourd">{libelleLong(jour)}</span>
        <FiltreMembres membres={membres} />
        <div className="flex-1" />
        <Sante aTrier={sante.aTrier} reportees={sante.reportees} seuil={SEUIL_SIGNAL} />
      </header>
      <Affectations membres={deLui(dujour)} projets={deLui(projetsDuJour)} moiId="" choix={[]} lectureSeule />
      <main className="grid min-h-0 flex-1 grid-cols-[300px_repeat(3,minmax(0,1fr))] overflow-hidden">
        <Hier jour={hier} estLaVeille={hier === veille(jour)} affectations={deLui(delaVeille)} projets={deLui(projetsDeLaVeille)} taches={tachesHier} />
        <SurLeFeu taches={tachesFeu} />
      </main>
    </>
  );
}
