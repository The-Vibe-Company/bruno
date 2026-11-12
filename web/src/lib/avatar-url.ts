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
 * être gardé pour toujours sans jamais montrer l'ancienne. C'est un MD5 parce que Postgres le
 * calcule aussi (`md5(avatar)`) : le pouls demande l'empreinte à la base au lieu de faire venir
 * la photo deux fois par seconde (voir `api/presence.ts`). Les deux donnent la même adresse.
 *
 * Les routes JSON gardent la data URL : l'app iPhone la décode telle quelle.
 */
export function urlAvatar(membreId: string, avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  return adresseAvatar(membreId, createHash("md5").update(avatar).digest("hex").slice(0, EMPREINTE));
}

/** Les caractères d'empreinte gardés dans l'adresse. Assez pour ne jamais confondre deux photos d'une même personne. */
export const EMPREINTE = 10;

/** L'adresse, quand l'empreinte est déjà connue — calculée par la base, par exemple. */
export function adresseAvatar(membreId: string, v: string | null | undefined): string | null {
  return v ? `/api/membres/${membreId}/avatar?v=${v}` : null;
}

/** La même chose pour une liste de Membres : l'empreinte n'est calculée qu'une fois par personne. */
export function allegerAvatars<T extends { avatar: string | null }>(liste: T[], id: (m: T) => string): T[] {
  return liste.map((m) => ({ ...m, avatar: urlAvatar(id(m), m.avatar) }));
}
