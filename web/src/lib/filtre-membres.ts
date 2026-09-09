/**
 * Le filtre par Membre, le même partout : `?membres=a,b` dit qui est actif. Absent, tout le
 * monde l'est. Un identifiant inconnu est ignoré ; une liste vide vaut « tout le monde ».
 */
export function membresActifs(param: string | undefined, membres: { id: string }[]): Set<string> {
  const ids = new Set(membres.map((m) => m.id));
  const choisis = (param ?? "").split(",").filter((id) => ids.has(id));
  return new Set(choisis.length ? choisis : ids);
}
