import Link from "next/link";
import { lire, lister } from "@/api/agendas";
import type { Ctx } from "@/api/membre-courant";
import { Grille } from "@/calendrier/Grille";
import { habiller, personnesDuCalendrier } from "@/calendrier/habillage";

/**
 * La journée au Calendrier, dans le Daily : au point du matin, on dit aussi qui est en rendez-vous
 * et quand. La même grille que le Calendrier, les mêmes couleurs, pour les mêmes visages allumés.
 *
 * Elle arrive après le reste (voir `ColonneAgenda`) : lire les Google et les Outlook prend son
 * temps, les Tâches n'ont pas à l'attendre.
 */
export async function AgendaDuJour({ session, jour, actifs }: { session: Ctx; jour: string; actifs: Set<string> }) {
  const [equipe, agendas] = await Promise.all([personnesDuCalendrier(session), lister(session)]);
  if (agendas.length === 0) {
    return (
      <p className="py-2.5 text-[13.5px] leading-relaxed text-texte-faible">
        Aucun agenda branché. <Link href="/calendrier" className="text-texte-sourd underline-offset-2 hover:text-texte hover:underline">Le Calendrier</Link> les branche.
      </p>
    );
  }
  const lecture = await lire(session, jour, jour, actifs);
  const { couleurs, noms, sources } = habiller(equipe, agendas, session.membreId);
  const muets = agendas.filter((a) => lecture.erreurs.some((e) => e.agendaId === a.id));
  return (
    <>
      {muets.length > 0 && (
        <p className="pt-2 text-[12.5px] text-texte-sourd">
          <span className="text-bloque">Muet</span> : {muets.map((a) => `${a.nom} (${noms[a.membreId] ?? "?"})`).join(", ")}
        </p>
      )}
      <div className="pt-2">
        <Grille jours={[jour]} aujourdhui={jour} evenements={lecture.evenements} couleurs={couleurs} sources={sources} etroite />
      </div>
    </>
  );
}

/** La colonne : son titre tout de suite, la grille quand elle est lue. */
export function ColonneAgenda({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col overflow-y-auto border-l border-bord-2 py-4 pl-4 pr-4">
      <header className="flex items-baseline justify-between border-b border-bord-fort pb-1.5">
        <h2 className="text-[15px] font-medium tracking-tight">
          <Link href="/calendrier?vue=jour" className="hover:text-accent">Agenda</Link>
        </h2>
      </header>
      {children}
    </section>
  );
}

export function AgendaEnAttente() {
  return <p className="py-2.5 text-[13.5px] text-texte-faible">Lecture des agendas…</p>;
}
