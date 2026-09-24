import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auJour, enCours } from "@/api/affectations";
import { auJour as projetsAuJour, enCours as projetsEnCours } from "@/api/projets";
import { lister, terminees } from "@/api/taches";
import { sessionCourante } from "@/auth/serveur";
import { Affectations } from "@/board/Affectations";
import { FiltreMembres } from "@/board/FiltreMembres";
import { membresActifs } from "@/lib/filtre-membres";
import { filtreMembres } from "@/lib/filtre-membres-serveur";
import { Hier, type TacheFinie } from "@/daily/Hier";
import { SurLeFeu, type TacheDuJour } from "@/daily/SurLeFeu";
import { db } from "@/db/client";
import { allegerAvatars } from "@/lib/avatar-url";
import { membre } from "@/db/schema";
import { jourOuvrePrecedent, libelleLong, veille } from "@/lib/dates";
import { instant } from "@/relances/temps";

export const dynamic = "force-dynamic";

/** Le bandeau reçoit l'adresse des photos, pas les photos — voir `lib/avatar-url.ts`. */
const parMembre = <T extends { membreId: string; avatar: string | null }>(l: T[]) => allegerAvatars(l, (m) => m.membreId);

/**
 * Le Daily : l'interface de la réunion du matin, projetable, une seule page. Il n'invente aucune
 * donnée — il montre ce qui existe. La colonne d'hier se lit ; celles du jour se travaillent :
 * c'est pendant le Daily qu'on coche, qu'on ouvre une fiche et qu'on ajoute ce qui vient de sortir.
 */
export default async function Daily({ searchParams }: { searchParams: Promise<{ membres?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google"); // le layout l'a déjà fait ; TypeScript veut la garantie
  const { membres: filtre } = await searchParams;
  const { jour } = instant();
  const hier = jourOuvrePrecedent(jour);

  const [dujour, projetsDuJour, delaVeille, projetsDeLaVeille, finies, feu, membres] = await Promise.all([
    enCours(session).then(parMembre),
    projetsEnCours(session).then(parMembre),
    auJour(session, hier).then(parMembre),
    projetsAuJour(session, hier).then(parMembre),
    // Depuis la dernière fois qu'on s'est vus, aujourd'hui compris : on le dit au point du matin.
    terminees(session, hier, jour),
    lister(session, { bucket: "sur_le_feu", inclureTerminees: false }),
    db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre).where(eq(membre.spaceId, session.spaceId)).then((l) => allegerAvatars(l, (m) => m.id)),
  ]);
  const parId = new Map(membres.map((m) => [m.id, m]));
  const personne = (id: string) => { const m = parId.get(id); return { nom: m?.nom ?? "?", avatar: m?.avatar ?? null }; };
  const actifs = membresActifs(await filtreMembres(filtre), membres);
  const deLui = <T extends { membreId: string }>(l: T[]) => l.filter((m) => actifs.has(m.membreId));
  // Abandonné n'est pas fait : le Daily dit ce qui a avancé, pas ce qu'on a enterré.
  const tachesHier: TacheFinie[] = finies
    .filter((t) => t.etatTerminal === "termine" && t.assigneId && actifs.has(t.assigneId))
    .map((t) => ({ id: t.id, titre: t.titre, etat: t.etatTerminal!, jour: t.jourFin, assigne: t.assigneId ? personne(t.assigneId) : null }));
  const tachesFeu: TacheDuJour[] = feu.filter((t) => t.assigneId && actifs.has(t.assigneId)).map((t) => ({
    id: t.id, titre: t.titre, statut: t.statut ?? "a_faire", engagement: t.engagement, reportsCount: t.reportsCount,
    assigneId: t.assigneId, assigne: t.assigneId ? personne(t.assigneId) : null,
    aidantIds: t.aidantIds, aidants: t.aidantIds.map(personne),
    notes: t.notes, transcriptionBrute: t.transcriptionBrute, raisonBlocage: t.raisonBlocage, bloqueLe: t.bloqueLe?.toISOString() ?? null, dependDeId: t.dependDeId, dependDe: t.dependDe,
  }));
  // Ce qu'on ajoute au Daily revient à la personne qu'on regarde — à moi quand on les regarde tous.
  const assigneParDefaut = actifs.size === 1 ? [...actifs][0] : session.membreId;

  return (
    <>
      <header className="flex h-12 flex-none items-center gap-5 border-b border-bord-2 px-5">
        <h1 className="text-[17px] font-medium tracking-tight">Daily</h1>
        <span className="text-[13px] text-texte-sourd">{libelleLong(jour)}</span>
        <div className="flex-1" />
        <FiltreMembres membres={membres} retenus={[...actifs]} />
      </header>
      <Affectations membres={deLui(dujour)} projets={deLui(projetsDuJour)} moiId="" choix={[]} lectureSeule />
      <main className="grid min-h-0 flex-1 grid-cols-[300px_repeat(3,minmax(0,1fr))] overflow-hidden">
        <Hier jour={hier} estLaVeille={hier === veille(jour)} affectations={deLui(delaVeille)} projets={deLui(projetsDeLaVeille)} taches={tachesHier} />
        <SurLeFeu taches={tachesFeu} membres={membres} assigneParDefaut={assigneParDefaut} />
      </main>
    </>
  );
}
