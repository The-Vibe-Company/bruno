import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { surLaPeriode } from "@/api/affectations";
import { terminees } from "@/api/taches";
import { sessionCourante } from "@/auth/serveur";
import { FiltreMembres } from "@/board/FiltreMembres";
import { membresActifs } from "@/lib/filtre-membres";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { Semaine, type Semaine as SemaineFaite } from "@/fait/Semaine";
import { dimancheDe, lundiDe } from "@/lib/dates";
import { instant } from "@/relances/temps";
import { Coquille } from "../Coquille";

export const dynamic = "force-dynamic";

/**
 * Fait : l'historique — Terminées *et* Abandonnées, groupées par semaine, filtrables par Membre.
 * C'est tout ce que « suivi » veut dire. Pas de compteur de jours par Affectation, pas de cumul
 * mensuel : la donnée est là, l'écran viendra si le besoin devient réel.
 */
export default async function Fait({ searchParams }: { searchParams: Promise<{ membres?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const { membres: filtre } = await searchParams;
  const { jour } = instant();
  const cetteSemaine = lundiDe(jour);

  const [finies, membres] = await Promise.all([
    terminees(session, "2000-01-01", jour),
    db.select({ id: membre.id, nom: membre.nom }).from(membre).where(eq(membre.spaceId, session.spaceId)),
  ]);
  const actifs = membresActifs(filtre, membres);
  const visibles = membres.filter((m) => actifs.has(m.id));
  const taches = finies.filter((t) => t.assigneId && actifs.has(t.assigneId));

  const lundis = [...new Set([cetteSemaine, ...taches.map((t) => lundiDe(t.jourFin))])].sort().reverse();
  const semaines: SemaineFaite[] = await Promise.all(lundis.map(async (lundi) => ({
    lundi, enCours: lundi === cetteSemaine,
    taches: taches.filter((t) => lundiDe(t.jourFin) === lundi).map((t) => ({ id: t.id, titre: t.titre, etat: t.etatTerminal!, jour: t.jourFin, assigneId: t.assigneId })),
    affectations: await surLaPeriode(session, lundi, dimancheDe(lundi)),
  })));

  return (
    <Coquille initiale={session.nom.charAt(0).toUpperCase()} page="fait">
      <header className="flex h-16 flex-none items-center gap-8 border-b border-bord-2 px-8">
        <h1 className="text-[22px] font-medium tracking-tight">Fait</h1>
        <FiltreMembres membres={membres} />
        <div className="flex-1" />
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-10 py-4">
        {semaines.map((s) => <Semaine key={s.lundi} semaine={s} membres={visibles} />)}
      </main>
    </Coquille>
  );
}
