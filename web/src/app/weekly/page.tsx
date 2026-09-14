import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { surLaPeriode } from "@/api/affectations";
import { lister } from "@/api/sujets";
import { sessionCourante } from "@/auth/serveur";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { dimancheDe, libelleSemaine, lundiDe } from "@/lib/dates";
import { instant } from "@/relances/temps";
import { Sujets } from "@/weekly/Sujets";
import { Coquille } from "../Coquille";

export const dynamic = "force-dynamic";

/**
 * Le Weekly : l'interface de la réunion de la semaine. Comme le Daily, il n'invente rien — il
 * rappelle l'Affectation de chacun — mais il porte une chose à lui : les Sujets, ce dont on veut
 * parler. Une semaine, une page blanche : rien ne se traîne d'une semaine à l'autre.
 */
export default async function Weekly() {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const { jour } = instant();
  const lundi = lundiDe(jour);

  const [affectations, sujets, membres] = await Promise.all([
    surLaPeriode(session, lundi, dimancheDe(lundi)),
    lister(session, lundi),
    db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre).where(eq(membre.spaceId, session.spaceId)),
  ]);

  return (
    <Coquille initiale={session.nom.charAt(0).toUpperCase()} avatar={session.avatar} page="weekly">
      <header className="flex h-12 flex-none items-center gap-5 border-b border-bord-2 px-5">
        <h1 className="text-[17px] font-medium tracking-tight">Weekly</h1>
        <span className="text-[13px] text-texte-sourd">{libelleSemaine(lundi)}</span>
        <div className="flex-1" />
        <span className="text-[12.5px] text-texte-faible">Un lien collé devient cliquable — un skill, par exemple.</span>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-10 py-7">
        <Sujets lundi={lundi} membres={membres} affectations={affectations} initiaux={sujets} moiId={session.membreId} />
      </main>
    </Coquille>
  );
}
