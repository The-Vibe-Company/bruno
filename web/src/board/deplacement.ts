/**
 * Ce qu'un glisser signifie. Pure : facile à tester, et le composant n'a rien à décider.
 *
 * Pendant le glisser, survoler une autre colonne y fait entrer la carte, à la hauteur de la
 * carte survolée : on voit où elle va atterrir avant de lâcher. Au lâcher, on compare le départ
 * et l'arrivée : un Statut à changer, et deux voisines dont le serveur déduit le Rang (BRU-3).
 */
export type Statut = "a_faire" | "en_cours" | "bloque";
export type Colonnes = Record<Statut, string[]>;

export type Mutation =
  | { type: "statut"; id: string; statut: Statut; raison?: string }
  | { type: "rang"; id: string; avantId: string | null; apresId: string | null };

export function colonneDe(colonnes: Colonnes, id: string): Statut | null {
  for (const s of Object.keys(colonnes) as Statut[]) if (colonnes[s].includes(id)) return s;
  return (id in colonnes ? (id as Statut) : null);
}

const copie = (c: Colonnes): Colonnes => ({ a_faire: [...c.a_faire], en_cours: [...c.en_cours], bloque: [...c.bloque] });

/** Pendant le glisser : entrer dans la colonne survolée, à la hauteur de la carte survolée (ou en bas). Même colonne : rien à faire, le tri s'anime tout seul. */
export function survoler(colonnes: Colonnes, actifId: string, overId: string): Colonnes {
  const depuis = colonneDe(colonnes, actifId);
  const vers = colonneDe(colonnes, overId);
  if (!depuis || !vers || depuis === vers || overId === actifId) return colonnes;
  const suivantes = copie(colonnes);
  suivantes[depuis] = suivantes[depuis].filter((x) => x !== actifId);
  const cible = suivantes[vers];
  const i = overId === vers ? cible.length : cible.indexOf(overId);
  cible.splice(i < 0 ? cible.length : i, 0, actifId);
  return suivantes;
}

/** Au lâcher, dans la colonne où la carte se trouve désormais : prendre la place de la carte survolée (vers le bas, on passe après elle). */
export function deposer(colonnes: Colonnes, actifId: string, overId: string): Colonnes {
  const col = colonneDe(colonnes, actifId);
  if (!col || colonneDe(colonnes, overId) !== col || overId === actifId || overId === col) return colonnes;
  const liste = [...colonnes[col]];
  const de = liste.indexOf(actifId), a = liste.indexOf(overId);
  liste.splice(de, 1); liste.splice(a, 0, actifId);
  return { ...colonnes, [col]: liste };
}

/** Entre le départ et l'arrivée : le Statut s'il a changé, puis les deux voisines si la place a changé. */
export function mutationsDe(depart: Colonnes, arrivee: Colonnes, actifId: string): Mutation[] {
  const de = colonneDe(depart, actifId), vers = colonneDe(arrivee, actifId);
  if (!de || !vers) return [];
  const mutations: Mutation[] = [];
  if (de !== vers) mutations.push({ type: "statut", id: actifId, statut: vers });
  const liste = arrivee[vers], i = liste.indexOf(actifId);
  const inchange = de === vers && depart[de].indexOf(actifId) === i;
  if (!inchange) mutations.push({ type: "rang", id: actifId, avantId: liste[i - 1] ?? null, apresId: liste[i + 1] ?? null });
  return mutations;
}

/** Un glisser d'un coup — survoler puis déposer — pour les tests et les cas sans aperçu. */
export function deplacer(colonnes: Colonnes, actifId: string, overId: string): { mutations: Mutation[]; colonnes: Colonnes } {
  const survole = survoler(colonnes, actifId, overId);
  const finales = survole === colonnes ? deposer(colonnes, actifId, overId) : survole;
  return { mutations: mutationsDe(colonnes, finales, actifId), colonnes: finales };
}

/** Une carte venue du panneau, lâchée sur le kanban : dans quelle colonne ? `null` si ailleurs. */
export function colonneVisee(colonnes: Colonnes, overId: string | null): Statut | null {
  return overId ? colonneDe(colonnes, overId) : null;
}
