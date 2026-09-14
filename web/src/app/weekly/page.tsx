import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { lister as listerAffectations, surLaPeriode } from "@/api/affectations";
import { lister, parSemaine } from "@/api/sujets";
import { sessionCourante } from "@/auth/serveur";
import { Affectations } from "@/board/Affectations";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { dimancheDe, libelleDate, libelleSemaine, lundiDe } from "@/lib/dates";
import { instant } from "@/relances/temps";
import { Sujets } from "@/weekly/Sujets";
import { Coquille } from "../Coquille";

export const dynamic = "force-dynamic";

/** Trois mois en arrière : au-delà, une réunion de la semaine ne se relit pas. */
const SEMAINES_MONTREES = 13;

/**
 * Le Weekly : l'interface de la réunion de la semaine. À gauche les semaines, la courante en
 * haut ; au centre l'Affectation de chacun puis trois encarts — les skills, les projets, les
 * victoires. Une semaine, une page blanche : rien ne se traîne d'une semaine à l'autre.
 */
export default async function Weekly({ searchParams }: { searchParams: Promise<{ semaine?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const { semaine } = await searchParams;
  const { jour } = instant();
  const courante = lundiDe(jour);
  // Une semaine inconnue ramène à la courante : l'URL se partage, elle ne se bricole pas.
  const lundis = Array.from({ length: SEMAINES_MONTREES }, (_, i) => reculer(courante, i));
  const lundi = semaine && lundis.includes(semaine) ? semaine : courante;

  const [affectations, sujets, membres, choix, comptes] = await Promise.all([
    surLaPeriode(session, lundi, dimancheDe(lundi)),
    lister(session, lundi),
    db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre).where(eq(membre.spaceId, session.spaceId)),
    listerAffectations(session),
    parSemaine(session),
  ]);

  return (
    <Coquille initiale={session.nom.charAt(0).toUpperCase()} avatar={session.avatar} page="weekly">
      <header className="flex h-12 flex-none items-center gap-5 border-b border-bord-2 px-5">
        <h1 className="text-[17px] font-medium tracking-tight">Weekly</h1>
        <span className="text-[13px] text-texte-sourd">{libelleSemaine(lundi)}</span>
        <div className="flex-1" />
        <span className="text-[12.5px] text-texte-faible">Un lien collé devient cliquable — un skill, par exemple.</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Les semaines" className="flex w-[196px] flex-none flex-col overflow-y-auto border-r border-bord-2 py-3">
          <h2 className="px-4 pb-1.5 text-[11.5px] uppercase tracking-wide text-texte-faible">Semaine du</h2>
          {lundis.map((l) => (
            <Link key={l} href={l === courante ? "/weekly" : `/weekly?semaine=${l}`} aria-current={l === lundi ? "page" : undefined}
              className={`flex items-center gap-2 border-l-2 py-2 pl-4 pr-3 text-[14px] ${l === lundi ? "border-accent bg-surface-2 text-texte" : "border-transparent text-texte-sourd hover:text-texte"}`}>
              <span className="flex-1 truncate">{libelleDate(l)}</span>
              {l === courante && <span className="flex-none text-[11.5px] text-texte-faible">en cours</span>}
              {comptes[l] > 0 && <span className="flex-none text-[11.5px] tabular-nums text-texte-faible">{comptes[l]}</span>}
            </Link>
          ))}
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Qui est sur quoi : la réunion commence par là. Une semaine passée se lit, ne se change pas. */}
          <Affectations membres={affectations} moiId={session.membreId} choix={choix.filter((c) => c.actif)} lectureSeule={lundi !== courante} />
          <main className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <Sujets key={lundi} lundi={lundi} membres={membres} initiaux={sujets} moiId={session.membreId} />
          </main>
        </div>
      </div>
    </Coquille>
  );
}

/** Le lundi d'il y a `n` semaines. */
function reculer(lundi: string, n: number): string {
  const d = new Date(lundi + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 7 * n);
  return d.toISOString().slice(0, 10);
}
