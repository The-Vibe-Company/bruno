import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { etat } from "@/api/journal";
import { ErreurApi } from "@/api/erreurs";
import { sessionCourante } from "@/auth/serveur";
import { Initiale } from "@/board/visuel";
import { Journal } from "@/affectations/Journal";
import { libelleDate, libelleDuree } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * L'état des lieux d'une Affectation : qui est dessus aujourd'hui, qui y est passé, et le journal
 * — ce qu'on s'est dit dessus, daté. Les Tâches n'y figurent pas : une Tâche ne porte jamais
 * d'Affectation, c'est un invariant du produit, et le journal existe justement pour ça.
 */
export default async function FicheAffectation({ params }: { params: Promise<{ id: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const { id } = await params;
  const vue = await etat(session, id).catch((e) => {
    if (e instanceof ErreurApi && e.statut === 404) notFound();
    throw e;
  });
  const anciens = vue.passages.filter((p) => p.fin !== null);

  return (
    <>
      <header className="flex h-12 flex-none items-center gap-3 border-b border-bord-2 px-5">
        <Link href="/affectations" className="text-[13px] text-texte-sourd hover:text-texte">Affectations</Link>
        <span className="text-texte-faible">/</span>
        <span className="h-4 w-1 flex-none rounded-full" style={{ background: vue.couleur }} />
        <h1 className="text-[17px] font-medium tracking-tight">{vue.nom}</h1>
        {!vue.actif && <span className="text-[12.5px] text-texte-faible">désactivée</span>}
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-10 overflow-y-auto px-10 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Une colonne de lecture, pas toute la largeur de l'écran : une ligne trop longue se relit mal. */}
        <section className="order-2 max-w-2xl lg:order-1">
          <h2 className="border-b border-accent pb-2 text-[15px] font-medium tracking-tight">Le journal</h2>
          <Journal affectationId={vue.id} initiales={vue.entrees} />
        </section>

        <section className="order-1 flex flex-col gap-8 lg:order-2">
          <div>
            <h2 className="border-b border-bord-2 pb-2 text-[13px] text-texte-sourd">Dessus en ce moment</h2>
            {vue.dessus.length === 0 && <p className="pt-3 text-[13.5px] text-texte-faible">Personne.</p>}
            {vue.dessus.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 border-b border-bord-2 py-2.5">
                <Initiale nom={p.nom} avatar={p.avatar} grande />
                <span className="flex-1 text-[14px]">{p.nom}</span>
                <span className="text-[12.5px] text-texte-sourd" title={`depuis le ${libelleDate(p.debut)}`}>{libelleDuree(p.debut)}</span>
              </div>
            ))}
          </div>

          <div>
            <h2 className="border-b border-bord-2 pb-2 text-[13px] text-texte-sourd">Y sont passés</h2>
            {anciens.length === 0 && <p className="pt-3 text-[13.5px] text-texte-faible">Personne d’autre pour l’instant.</p>}
            {anciens.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 border-b border-bord-2 py-2.5 text-texte-sourd">
                <Initiale nom={p.nom} avatar={p.avatar} />
                <span className="flex-1 text-[13.5px]">{p.nom}</span>
                <span className="text-[12px] text-texte-faible">{libelleDate(p.debut)} → {libelleDate(p.fin!)}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
