import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { lister as listerAffectations, surLaPeriode } from "@/api/affectations";
import { lister as listerProjets, surLaPeriode as projetsSurLaPeriode } from "@/api/projets";
import { lister, parSemaine } from "@/api/sujets";
import { sessionCourante } from "@/auth/serveur";
import { Affectations } from "@/board/Affectations";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { dimancheDe, libelleSemaine, lundiDe } from "@/lib/dates";
import { instant } from "@/relances/temps";
import { Sujets } from "@/weekly/Sujets";

export const dynamic = "force-dynamic";

/** La semaine en cours, toujours. Les autres n'apparaissent que si elles portent des Sujets. */
const SEMAINES_PROCHES = 1;

/**
 * Le Weekly : l'interface de la réunion de la semaine. Deux flèches dans l'en-tête pour passer
 * d'une semaine à l'autre, l'Affectation de chacun, puis trois encarts — les skills, les projets,
 * les victoires. Une semaine, une page blanche : rien ne se traîne d'une semaine à l'autre.
 */
export default async function Weekly({ searchParams }: { searchParams: Promise<{ semaine?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google"); // le layout l'a déjà fait ; TypeScript veut la garantie
  const { semaine } = await searchParams;
  const { jour } = instant();
  const courante = lundiDe(jour);
  const comptes = await parSemaine(session);
  // La semaine en cours, plus celles qui ont servi : une liste qui ne descend pas dans le vide.
  const lundis = [...new Set([
    ...Array.from({ length: SEMAINES_PROCHES }, (_, i) => reculer(courante, i)),
    ...Object.keys(comptes).filter((l) => l <= courante),
  ])].sort().reverse();
  // Une semaine inconnue ramène à la courante : l'URL se partage, elle ne se bricole pas.
  const lundi = semaine && lundis.includes(semaine) ? semaine : courante;

  const [affectations, projets, sujets, membres, choix, choixProjets] = await Promise.all([
    surLaPeriode(session, lundi, dimancheDe(lundi)),
    projetsSurLaPeriode(session, lundi, dimancheDe(lundi)),
    lister(session, lundi),
    db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre).where(eq(membre.spaceId, session.spaceId)),
    listerAffectations(session),
    listerProjets(session),
  ]);

  // `lundis` va de la plus récente à la plus ancienne : reculer, c'est avancer dans la liste.
  const rang = lundis.indexOf(lundi);
  const precedente = lundis[rang + 1];
  const suivante = lundis[rang - 1];
  const lien = (l: string | undefined) => (l === courante ? "/weekly" : `/weekly?semaine=${l}`);

  return (
    <>
      <header className="flex h-12 flex-none items-center gap-3 border-b border-bord-2 px-5">
        <h1 className="text-[17px] font-medium tracking-tight">Weekly</h1>
        {/* Un vrai bouton de navigation, encadré : deux flèches nues au milieu du titre ne se voyaient pas. */}
        <span className="flex h-8 items-center gap-0.5 rounded-lg border border-bord-2 bg-surface pl-0.5 pr-2.5">
          <Fleche vers={precedente && lien(precedente)} libelle="Semaine précédente" sens="gauche" />
          <span className="px-1 text-[13.5px] font-medium tracking-tight">{libelleSemaine(lundi)}</span>
          <Fleche vers={suivante && lien(suivante)} libelle="Semaine suivante" sens="droite" />
          {lundi === courante && <span className="ml-1 text-[11.5px] text-texte-faible">en cours</span>}
        </span>
        <div className="flex-1" />
      </header>

      {/* Qui est sur quoi : la réunion commence par là. Une semaine passée se lit, ne se change pas. */}
      <Affectations membres={affectations} projets={projets} moiId={session.membreId}
        choix={choix.filter((c) => c.actif)} choixProjets={choixProjets.filter((c) => c.actif)} lectureSeule={lundi !== courante} />
      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <Sujets key={lundi} lundi={lundi} membres={membres} initiaux={sujets} moiId={session.membreId} projets={projets} />
      </main>
    </>
  );
}

/**
 * D'une semaine à l'autre. Grisée quand il n'y a rien de ce côté : on ne descend pas dans des
 * semaines vides, seules celles qui ont servi comptent — et il n'y a jamais de semaine d'après
 * la semaine en cours.
 */
function Fleche({ vers, libelle, sens }: { vers: string | undefined; libelle: string; sens: "gauche" | "droite" }) {
  const dessin = <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={sens === "gauche" ? "rotate-180" : ""}><path d="M4 2l4 4-4 4" /></svg>;
  const forme = "flex h-7 w-7 flex-none items-center justify-center rounded-md";
  if (!vers) return <span aria-disabled className={`${forme} text-texte-faible opacity-40`} title={`${libelle} — il n’y en a pas`}>{dessin}</span>;
  return <Link href={vers} aria-label={libelle} title={libelle} className={`${forme} text-texte-sourd hover:bg-surface-2 hover:text-texte`}>{dessin}</Link>;
}

/** Le lundi d'il y a `n` semaines. */
function reculer(lundi: string, n: number): string {
  const d = new Date(lundi + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 7 * n);
  return d.toISOString().slice(0, 10);
}
