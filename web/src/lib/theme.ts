/** L'apparence : le système, ou un choix — retenu dans un cookie, lu au rendu pour ne jamais clignoter. */
export const COOKIE_THEME = "bruno_theme";
export type Theme = "systeme" | "clair" | "sombre";
export const lireTheme = (valeur: string | undefined): Theme => (valeur === "clair" || valeur === "sombre" ? valeur : "systeme");
