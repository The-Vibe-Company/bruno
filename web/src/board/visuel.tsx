import { libelleBlocage, libelleJour } from "@/lib/dates";
import type { Statut } from "./deplacement";

/**
 * Le code couleur des Statuts et les petits éléments qui vont avec — sans état, sans « use client »,
 * pour que le Board (client) et le Daily (serveur) les partagent à l'identique.
 */
export const TEINTE: Record<Statut, string> = {
  a_faire: "bg-a-faire-voile border-accent/35",
  en_cours: "bg-en-cours-voile border-en-cours/35",
  bloque: "bg-bloque-voile border-bloque/35",
};

/** « reporté N× » — et à partir de trois, un badge : c'est un signal, jamais une sanction (règle 12). */
export function Reporte({ n }: { n: number }) {
  return n >= 3
    ? <span className="rounded border border-accent/50 bg-accent-voile px-1 py-px text-[11px] font-medium text-accent">reporté {n}×</span>
    : <span className="text-accent">reporté {n}×</span>;
}

export type Personne = { nom: string; avatar?: string | null };

/** La pastille d'une personne : sa photo si elle en a une, son initiale sinon. */
export function Initiale({ nom, avatar, grande = false }: { nom: string; avatar?: string | null; grande?: boolean }) {
  const taille = grande ? "h-6 w-6 text-[11.5px]" : "h-[18px] w-[18px] text-[10px]";
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element -- une data URL, pas une image distante
    return <img src={avatar} alt={nom} className={`inline-block flex-none rounded-full object-cover ${taille}`} />;
  }
  return (
    <span className={`inline-flex flex-none items-center justify-center rounded-full bg-bord-faible font-medium text-texte ${taille}`}>
      {nom.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Une Tâche finie. Le rond vide se lisait « pas encore fait » — c'est une coche qu'on attend
 * devant quelque chose de terminé. Abandonné n'en porte pas : ce n'est pas un succès, juste un
 * point final, et le trait discontinu le dit sans le juger.
 */
export function Coche({ etat, taille = 15 }: { etat: "termine" | "abandonne"; taille?: number }) {
  if (etat !== "termine") {
    return <span role="img" aria-label="Abandonné" style={{ width: taille, height: taille }} className="flex-none rounded-full border-[1.5px] border-dashed border-texte-tres-faible" />;
  }
  return (
    <svg role="img" aria-label="Terminé" width={taille} height={taille} viewBox="0 0 16 16" className="flex-none text-sur-accent">
      <circle cx="8" cy="8" r="7.25" className="fill-accent" />
      <path d="M4.6 8.4l2.3 2.3 4.5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * La ligne du bas d'une carte — sur une seule ligne, toujours.
 *
 * Bloquée, elle dit **depuis quand** plutôt que la date du jour : une Tâche bloquée n'a pas
 * glissé, elle attend quelqu'un, et c'est l'attente qui se mesure. Ailleurs, l'Engagement et les
 * Reports, comme avant.
 */
export function Meta({ tache }: { tache: { statut: Statut; engagement: string | null; reportsCount: number; raisonBlocage: string | null; bloqueLe?: string | null } }) {
  const bloquee = tache.statut === "bloque";
  return (
    <span className="flex-1 truncate text-[12px] text-texte-sourd">
      {bloquee && <span className={tache.raisonBlocage ? "text-bloque" : "italic text-texte-faible"}>{tache.raisonBlocage ?? "raison à préciser"} · </span>}
      {bloquee && tache.bloqueLe ? libelleBlocage(tache.bloqueLe) : tache.engagement ? libelleJour(tache.engagement) : "—"}
      {/* Bloquée, on s'arrête là : la raison et l'attente tiennent déjà toute la largeur, et ses
          Reports ne bougent plus — ils sont dans la fiche, avec qui et pourquoi. */}
      {!bloquee && tache.reportsCount > 0 && <> · <Reporte n={tache.reportsCount} /></>}
    </span>
  );
}
