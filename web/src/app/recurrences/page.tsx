import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { lister } from "@/api/recurrences";
import { sessionCourante } from "@/auth/serveur";
import { Initiale } from "@/board/visuel";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { Editeur, type Brouillon } from "@/recurrences/Editeur";
import { libelleFrequence, libelleNombre } from "@/recurrences/regle";
import { instant } from "@/relances/temps";
import { Coquille } from "../Coquille";

export const dynamic = "force-dynamic";

/** Les Récurrences : la liste des règles à gauche, la règle ouverte à droite. Web uniquement (règle 18). */
export default async function Recurrences({ searchParams }: { searchParams: Promise<{ regle?: string; nouvelle?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const { regle: ouverteId, nouvelle } = await searchParams;
  const [regles, membres] = await Promise.all([
    lister(session),
    db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre).where(eq(membre.spaceId, session.spaceId)),
  ]);
  const nomDe = new Map(membres.map((m) => [m.id, m]));
  const ouverte = nouvelle ? null : (regles.find((r) => r.id === ouverteId) ?? regles[0] ?? null);
  const brouillon: Brouillon = ouverte
    ? { id: ouverte.id, titre: ouverte.titre, assigneId: ouverte.assigneId, frequence: ouverte.frequence, jourSemaine: ouverte.jourSemaine ?? 1, jourMois: ouverte.jourMois ?? 1, decalages: ouverte.decalages }
    : { id: null, titre: "", assigneId: session.membreId, frequence: "hebdomadaire", jourSemaine: 1, jourMois: 1, decalages: [0] };

  return (
    <Coquille initiale={session.nom.charAt(0).toUpperCase()} avatar={session.avatar} page="recurrences">
      <header className="flex h-12 flex-none items-center gap-5 border-b border-bord-2 px-5">
        <h1 className="text-[17px] font-medium tracking-tight">Récurrences</h1>
        <span className="text-[13px] text-texte-sourd">{regles.length} règle{regles.length > 1 ? "s" : ""}</span>
        <div className="flex-1" />
        <Link href="/recurrences?nouvelle=1" className="flex h-9 items-center rounded-md bg-accent px-3.5 text-sm font-medium text-sur-accent">Nouvelle règle</Link>
      </header>
      <main className="grid min-h-0 flex-1 grid-cols-[420px_minmax(0,1fr)]">
        <section className="overflow-y-auto border-r border-bord-2 px-8 pt-7">
          <header className="flex items-baseline justify-between border-b border-bord-faible pb-2.5"><h2 className="text-xl font-medium tracking-tight">Règles</h2><span className="text-sm text-texte-sourd">{regles.length}</span></header>
          {regles.length === 0 && <p className="mt-4 text-[15px] text-texte-faible">Aucune règle. La première : « le lundi, Post LinkedIn en 3 occurrences ».</p>}
          {regles.map((r) => (
            <Link key={r.id} href={`/recurrences?regle=${r.id}`} aria-current={r.id === ouverte?.id ? "true" : undefined}
              className={`mt-2 block rounded-[10px] border bg-surface px-3.5 py-3 shadow-sm ${r.id === ouverte?.id ? "border-accent" : "border-bord hover:border-bord-fort"}`}>
              <div className="text-[15.5px]">{r.titre}</div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="flex-1 text-[13.5px] text-texte-sourd">{libelleFrequence(r)} · {libelleNombre(r.occurrences)}</span>
                <Initiale nom={nomDe.get(r.assigneId)?.nom ?? "?"} avatar={nomDe.get(r.assigneId)?.avatar} />
              </div>
            </Link>
          ))}
        </section>
        <Editeur key={ouverte?.id ?? "nouvelle"} initial={brouillon} membres={membres} aujourdhui={instant().jour} />
      </main>
    </Coquille>
  );
}
