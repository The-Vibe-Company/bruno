/**
 * Ce qu'un glisser signifie. Pure : facile à tester, et le composant n'a rien à décider.
 *
 * Une carte lâchée dans une autre colonne change de Statut ; sa position dans la liste
 * d'arrivée donne ses deux voisines, dont le serveur déduit le Rang (BRU-3).
 */
export type Statut = "a_faire" | "en_cours" | "bloque";
export type Colonnes = Record<Statut, string[]>;

export type Mutation =
  | { type: "statut"; id: string; statut: Statut }
  | { type: "rang"; id: string; avantId: string | null; apresId: string | null };

export function colonneDe(colonnes: Colonnes, id: string): Statut | null {
  for (const s of Object.keys(colonnes) as Statut[]) if (colonnes[s].includes(id)) return s;
  return (id in colonnes ? (id as Statut) : null);
}

/**
 * `overId` est soit une carte (on se place à sa hauteur), soit une colonne (on se place en bas).
 * Renvoie les mutations à envoyer, dans l'ordre, et les colonnes telles qu'elles seront.
 */
export function deplacer(colonnes: Colonnes, actifId: string, overId: string): { mutations: Mutation[]; colonnes: Colonnes } {
  const depuis = colonneDe(colonnes, actifId);
  const vers = colonneDe(colonnes, overId);
  if (!depuis || !vers || overId === actifId) return { mutations: [], colonnes };

  const suivantes: Colonnes = { a_faire: [...colonnes.a_faire], en_cours: [...colonnes.en_cours], bloque: [...colonnes.bloque] };
  suivantes[depuis] = suivantes[depuis].filter((x) => x !== actifId);

  const cible = suivantes[vers];
  let index = cible.length;
  if (overId !== vers) {
    const i = cible.indexOf(overId);
    // Dans la même colonne, glisser vers le bas passe *après* la carte survolée.
    index = i < 0 ? cible.length : (depuis === vers && colonnes[depuis].indexOf(actifId) < colonnes[depuis].indexOf(overId) ? i + 1 : i);
  }
  cible.splice(index, 0, actifId);

  const mutations: Mutation[] = [];
  if (depuis !== vers) mutations.push({ type: "statut", id: actifId, statut: vers });
  const avantId = cible[index - 1] ?? null;
  const apresId = cible[index + 1] ?? null;
  const inchange = depuis === vers && colonnes[depuis].indexOf(actifId) === index;
  if (!inchange) mutations.push({ type: "rang", id: actifId, avantId, apresId });
  return { mutations, colonnes: suivantes };
}
