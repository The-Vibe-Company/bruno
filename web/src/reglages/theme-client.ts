/** Côté navigateur : poser le choix d'apparence — le cookie pour la prochaine fois, l'attribut pour tout de suite. */
import { COOKIE_THEME, type Theme } from "@/lib/theme";

export function appliquerTheme(t: Theme) {
  document.cookie = t === "systeme" ? `${COOKIE_THEME}=; Path=/; Max-Age=0; SameSite=Lax` : `${COOKIE_THEME}=${t}; Path=/; Max-Age=31536000; SameSite=Lax`;
  if (t === "systeme") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}
