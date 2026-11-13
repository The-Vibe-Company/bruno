import { PALETTE } from "@/reglages/palette";

type AgendaColore = { id: string; membreId: string; couleur: string | null };

export type Couleurs = {
  /** Celle que chaque Agenda porte sur le Calendrier. */
  agendas: Record<string, string>;
  /** Celle qu'un Agenda reprend quand on efface son choix. */
  defauts: Record<string, string>;
};

/**
 * Les couleurs du Calendrier, vues par celui qui regarde. Ses propres Agendas ont chacun la leur :
 * c'est entre eux qu'il fait le tri. Les autres gardent une couleur par personne : chez eux, on
 * cherche qui, pas lequel. Une couleur choisie pour un Agenda passe avant tout, et les couleurs
 * par défaut évitent celles déjà prises tant que la palette le permet.
 *
 * `personnes` et `agendas` arrivent dans un ordre fixe (l'arrivée de chacun), pour que les
 * couleurs ne changent pas d'une visite à l'autre.
 */
export function couleursDuCalendrier(personnes: { id: string }[], agendas: AgendaColore[], moiId: string): Couleurs {
  const prises = new Set(agendas.flatMap((a) => (a.couleur ? [a.couleur.toUpperCase()] : [])));
  let tour = 0;
  const suivante = () => {
    const libre = PALETTE.find((c) => !prises.has(c.toUpperCase()));
    // Palette épuisée : on reprend dans l'ordre, deux Agendas partageront une couleur.
    const c = libre ?? PALETTE[tour++ % PALETTE.length];
    prises.add(c.toUpperCase());
    return c;
  };

  const miens = agendas.filter((a) => a.membreId === moiId);
  // Ceux qui s'affichent d'abord ; ceux qui ont déjà une couleur à eux n'ont besoin d'un défaut que pour la palette.
  const defauts: Record<string, string> = {};
  for (const a of miens) if (!a.couleur) defauts[a.id] = suivante();
  const parPersonne: Record<string, string> = {};
  for (const p of personnes) if (p.id !== moiId) parPersonne[p.id] = suivante();
  for (const a of miens) if (a.couleur) defauts[a.id] = suivante();
  for (const a of agendas) if (a.membreId !== moiId) defauts[a.id] = parPersonne[a.membreId] ?? PALETTE[PALETTE.length - 1];

  return {
    agendas: Object.fromEntries(agendas.map((a) => [a.id, a.couleur ?? defauts[a.id]])),
    defauts,
  };
}
