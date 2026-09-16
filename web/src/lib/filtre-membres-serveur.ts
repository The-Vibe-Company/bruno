import { cookies } from "next/headers";
import { COOKIE_MEMBRES } from "./filtre-membres";

/**
 * Qui est retenu, vu du serveur : l'URL si elle le dit, sinon le dernier choix gardé dans le
 * cookie. C'est ce qui fait qu'un filtre posé dans le Daily tient encore Sur le feu.
 *
 * Rien des deux ⇒ `undefined`, et chaque page retombe sur son défaut.
 */
export async function filtreMembres(dansLUrl: string | undefined): Promise<string | undefined> {
  return dansLUrl ?? (await cookies()).get(COOKIE_MEMBRES)?.value;
}
