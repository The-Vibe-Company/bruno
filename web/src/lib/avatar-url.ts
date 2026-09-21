import { createHash } from "node:crypto";

/**
 * L'adresse d'une photo de profil, à la place de la photo elle-même.
 *
 * Les photos sont gardées en data URL (10 à 15 Ko chacune). Les pages les recopiaient dans
 * chaque carte : 18 copies de 3 photos sur le board, soit 180 Ko sur 230 — les trois quarts de
 * la page, retéléchargés à chaque rafraîchissement, donc à chaque action et, avec le direct, à
 * chaque geste d'un autre. Une adresse pèse soixante octets et le navigateur la garde en cache.
 *
 * `v` est une empreinte de la photo : une nouvelle photo change l'adresse, donc le cache peut
 * être gardé pour toujours sans jamais montrer l'ancienne.
 *
 * Les routes JSON gardent la data URL : l'app iPhone la décode telle quelle.
 */
export function urlAvatar(membreId: string, avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  const v = createHash("sha1").update(avatar).digest("hex").slice(0, 10);
  return `/api/membres/${membreId}/avatar?v=${v}`;
}

/** La même chose pour une liste de Membres : l'empreinte n'est calculée qu'une fois par personne. */
export function allegerAvatars<T extends { avatar: string | null }>(liste: T[], id: (m: T) => string): T[] {
  return liste.map((m) => ({ ...m, avatar: urlAvatar(id(m), m.avatar) }));
}
