import Link from "next/link";
import { redirect } from "next/navigation";
import { enCours } from "@/api/affectations";
import { tableau } from "@/api/journal";
import { sessionCourante } from "@/auth/serveur";
import { Initiale } from "@/board/visuel";
import { allegerAvatars } from "@/lib/avatar-url";
import { libelleDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * Nos Affectations, une par carte : nos clients, et ce qui est interne. On sait depuis toujours
 * qui est sur quoi ; on ne savait pas où on en est avec eux. C'est ce que cet écran ouvre.
 */
export default async function Affectations() {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const [lignes, sur] = await Promise.all([
    tableau(session),
    enCours(session).then((l) => allegerAvatars(l, (m) => m.membreId)),
  ]);
  // Qui est sur quoi, retourné : la liste est par Membre, la carte est par Affectation.
  const dessus = new Map<string, { nom: string; avatar: string | null }[]>();
  for (const m of sur) for (const a of m.affectations) {
    dessus.set(a.affectationId, [...(dessus.get(a.affectationId) ?? []), { nom: m.nom, avatar: m.avatar }]);
  }

  return (
    <>
      <header className="flex h-12 flex-none items-center gap-5 border-b border-bord-2 px-5">
        <h1 className="text-[17px] font-medium tracking-tight">Affectations</h1>
        <span className="text-[13px] text-texte-sourd">{lignes.filter((a) => a.actif).length} en cours</span>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lignes.map((a) => (
            <Link key={a.id} href={`/affectations/${a.id}`}
              className="flex flex-col gap-3 rounded-xl border border-bord-2 bg-surface p-4 transition-colors hover:border-bord-fort">
              <div className="flex items-center gap-2.5">
                <span className="h-5 w-1 flex-none rounded-full" style={{ background: a.couleur }} />
                <span className={`flex-1 truncate text-[16px] font-medium tracking-tight ${a.actif ? "" : "text-texte-faible"}`}>{a.nom}</span>
                {!a.actif && <span className="text-[12px] text-texte-faible">désactivée</span>}
              </div>
              <div className="flex min-h-6 items-center gap-2">
                {(dessus.get(a.id) ?? []).map((m) => <Initiale key={m.nom} nom={m.nom} avatar={m.avatar} grande />)}
                <span className="text-[13px] text-texte-sourd">
                  {a.dessus === 0 ? "personne dessus" : a.dessus === 1 ? "une personne dessus" : `${a.dessus} personnes dessus`}
                </span>
              </div>
              <div className="text-[12.5px] text-texte-faible">
                {a.notes === 0 ? "Rien au journal" : `${a.notes} entrée${a.notes > 1 ? "s" : ""} · dernière le ${libelleDate(a.derniere!.slice(0, 10))}`}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
