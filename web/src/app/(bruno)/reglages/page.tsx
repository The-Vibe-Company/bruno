import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { lister } from "@/api/creneaux";
import { lister as listerAffectations } from "@/api/affectations";
import { lister as listerProjets } from "@/api/projets";
import { Rattachements } from "@/reglages/Rattachements";
import { sessionCourante } from "@/auth/serveur";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { cookies } from "next/headers";
import { COOKIE_THEME, lireTheme } from "@/lib/theme";
import { Apparence } from "@/reglages/Apparence";
import { Compte } from "@/reglages/Compte";
import { Creneaux } from "@/reglages/Creneaux";

export const dynamic = "force-dynamic";

/** Les Réglages : les Créneaux, la liste des Affectations, l'apparence, le compte. Rien d'autre — et surtout pas qui est sur quoi. */
export default async function Reglages() {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google"); // le layout l'a déjà fait ; TypeScript veut la garantie
  const [creneaux, affectations, projets, [moi], jar] = await Promise.all([lister(session), listerAffectations(session), listerProjets(session), db.select().from(membre).where(eq(membre.id, session.membreId)), cookies()]);
  const theme = lireTheme(jar.get(COOKIE_THEME)?.value);
  return (
    <>
      <header className="flex h-12 flex-none items-center border-b border-bord-2 px-5"><h1 className="text-[17px] font-medium tracking-tight">Réglages</h1></header>
      <main className="grid min-h-0 flex-1 grid-cols-1 content-start gap-16 overflow-y-auto px-10 py-8 md:grid-cols-2">
        <Creneaux initiaux={creneaux} />
        <div className="flex flex-col gap-12"><Rattachements affectations={affectations} projets={projets} /><Apparence initial={theme} /><Compte nom={moi.nom} email={moi.email} avatar={moi.avatar} /></div>
      </main>
    </>
  );
}
