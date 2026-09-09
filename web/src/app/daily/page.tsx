import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auJour, enCours } from "@/api/affectations";
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
import { Coquille } from "../Coquille";

export const dynamic = "force-dynamic";

/**
 * Le Daily : l'interface de la réunion du matin. Lecture seule, projetable, une seule page.
 * Aucune donnée nouvelle — il n'agrège que ce qui existe déjà.
 */
export default async function Daily({ searchParams }: { searchParams: Promise<{ membres?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const { membres: filtre } = await searchParams;
  const { jour } = instant();
  const hier = jourOuvrePrecedent(jour);

  const [sante, dujour, delaVeille, finies, feu, membres] = await Promise.all([
    signaux(session),
    enCours(session),
    auJour(session, hier),
    terminees(session, hier),
    lister(session, { bucket: "sur_le_feu", inclureTerminees: false }),
    db.select({ id: membre.id, nom: membre.nom }).from(membre).where(eq(membre.spaceId, session.spaceId)),
  ]);
  const nomDe = new Map(membres.map((m) => [m.id, m.nom]));
  const actifs = membresActifs(filtre, membres);
  const deLui = <T extends { membreId: string }>(l: T[]) => l.filter((m) => actifs.has(m.membreId));
  const tachesHier: TacheFinie[] = finies
    .filter((t) => t.assigneId && actifs.has(t.assigneId))
    .map((t) => ({ id: t.id, titre: t.titre, etat: t.etatTerminal!, assigne: t.assigneId ? { nom: nomDe.get(t.assigneId) ?? "?" } : null }));
  const tachesFeu: TacheDuJour[] = feu.filter((t) => t.assigneId && actifs.has(t.assigneId)).map((t) => ({
    id: t.id, titre: t.titre, statut: t.statut ?? "a_faire", engagement: t.engagement, reportsCount: t.reportsCount,
    assigne: t.assigneId ? { nom: nomDe.get(t.assigneId) ?? "?" } : null,
  }));

  return (
    <Coquille initiale={session.nom.charAt(0).toUpperCase()} page="daily">
      <header className="flex h-16 flex-none items-center gap-7 border-b border-bord-2 px-8">
        <h1 className="text-[22px] font-medium tracking-tight">Daily</h1>
        <span className="text-[15px] text-texte-sourd">{libelleLong(jour)}</span>
        <FiltreMembres membres={membres} />
        <div className="flex-1" />
        <Sante aTrier={sante.aTrier} reportees={sante.reportees} seuil={SEUIL_SIGNAL} />
      </header>
      <Affectations membres={deLui(dujour)} moiId="" choix={[]} lectureSeule />
      <main className="grid min-h-0 flex-1 grid-cols-[340px_repeat(3,minmax(0,1fr))]">
        <Hier jour={hier} estLaVeille={hier === veille(jour)} affectations={deLui(delaVeille)} taches={tachesHier} />
        <SurLeFeu taches={tachesFeu} />
      </main>
    </Coquille>
  );
}
