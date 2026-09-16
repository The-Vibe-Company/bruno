/**
 * Le filtre par Membre, le même partout : `?membres=a,b` dit qui est retenu. Absent, on retombe
 * sur le défaut — tout le monde sur les écrans d'équipe (le Daily, Fait), **moi seul sur le
 * Board** : on y vient pour son propre travail, pas pour celui des autres.
 *
 * `?membres=aucun` dit **personne**, et l'écran reste vide. Sans ce mot, éteindre le dernier
 * visage revenait à ne rien demander — donc à tout rallumer, ce qui se lisait comme un bug.
 *
 * Un identifiant inconnu est ignoré ; une liste vide vaut le défaut.
 */
export const AUCUN = "aucun";

/**
 * Le dernier choix, gardé d'une page à l'autre. Sans lui, filtrer sur Antoine dans le Daily puis
 * passer Sur le feu rallumait tout le monde : le filtre avait l'air de ne pas tenir.
 * L'URL passe devant quand elle dit quelque chose — un lien partagé montre ce qu'il promet.
 */
export const COOKIE_MEMBRES = "bruno_membres";

export function membresActifs(param: string | undefined, membres: { id: string }[], defaut?: string[]): Set<string> {
  if (param === AUCUN) return new Set();
  const ids = new Set(membres.map((m) => m.id));
  const choisis = (param ?? "").split(",").filter((id) => ids.has(id));
  if (choisis.length) return new Set(choisis);
  const replis = (defaut ?? []).filter((id) => ids.has(id));
  return new Set(replis.length ? replis : ids);
}
