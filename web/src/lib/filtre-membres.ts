/**
 * Le filtre par Membre, le même partout : `?membres=a,b` dit qui est retenu. Absent, on retombe
 * sur le défaut — tout le monde sur les écrans d'équipe (le Daily, Fait), **moi seul sur le
 * Board** : on y vient pour son propre travail, pas pour celui des autres.
 *
 * Un identifiant inconnu est ignoré ; une liste vide vaut le défaut.
 */
export function membresActifs(param: string | undefined, membres: { id: string }[], defaut?: string[]): Set<string> {
  const ids = new Set(membres.map((m) => m.id));
  const choisis = (param ?? "").split(",").filter((id) => ids.has(id));
  if (choisis.length) return new Set(choisis);
  const replis = (defaut ?? []).filter((id) => ids.has(id));
  return new Set(replis.length ? replis : ids);
}
