/** Côté navigateur : retenir qui est retenu, pour la page d'après. */
import { COOKIE_MEMBRES } from "./filtre-membres";

export function retenirMembres(choix: string) {
  document.cookie = `${COOKIE_MEMBRES}=${choix}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
