import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { lister } from "@/api/creneaux";
import { lister as listerAffectations } from "@/api/affectations";
import { Affectations } from "@/reglages/Affectations";
import { sessionCourante } from "@/auth/serveur";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { cookies } from "next/headers";
import { COOKIE_THEME, lireTheme } from "@/lib/theme";
import { Apparence } from "@/reglages/Apparence";
import { Compte } from "@/reglages/Compte";
import { Creneaux } from "@/reglages/Creneaux";
import { Coquille } from "../Coquille";

export const dynamic = "force-dynamic";

/** Les Réglages : les Créneaux, la liste des Affectations, l'apparence, le compte. Rien d'autre — et surtout pas qui est sur quoi. */
export default async function Reglages() {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const [creneaux, affectations, [moi], jar] = await Promise.all([lister(session), listerAffectations(session), db.select().from(membre).where(eq(membre.id, session.membreId)), cookies()]);
  const theme = lireTheme(jar.get(COOKIE_THEME)?.value);
  return (
    <Coquille initiale={session.nom.charAt(0).toUpperCase()} avatar={session.avatar} page="reglages">
      <header className="flex h-12 flex-none items-center border-b border-bord-2 px-5"><h1 className="text-[17px] font-medium tracking-tight">Réglages</h1></header>
      <main className="grid flex-1 grid-cols-1 content-start gap-16 px-10 py-8 md:grid-cols-2">
        <Creneaux initiaux={creneaux} />
        <div className="flex flex-col gap-12"><Affectations initiales={affectations} /><Apparence initial={theme} /><Compte nom={moi.nom} email={moi.email} avatar={moi.avatar} /></div>
      </main>
    </Coquille>
  );
}
