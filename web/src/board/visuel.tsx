import { libelleJour } from "@/lib/dates";
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

/** La ligne du bas d'une carte : la raison du blocage s'il y en a une, l'Engagement, les Reports — sur une seule ligne, toujours. */
export function Meta({ tache }: { tache: { statut: Statut; engagement: string | null; reportsCount: number; raisonBlocage: string | null } }) {
  return (
    <span className="flex-1 truncate text-[12px] text-texte-sourd">
      {tache.statut === "bloque" && <span className={tache.raisonBlocage ? "text-bloque" : "italic text-texte-faible"}>{tache.raisonBlocage ?? "raison à préciser"} · </span>}
      {tache.engagement ? libelleJour(tache.engagement) : "—"}
      {tache.reportsCount > 0 && <> · <Reporte n={tache.reportsCount} /></>}
    </span>
  );
}
