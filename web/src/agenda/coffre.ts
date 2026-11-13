/**
 * Le coffre des Agendas : ce qui ouvre le calendrier de quelqu'un ne dort jamais en clair.
 *
 * Un jeton de rafraîchissement Google ou Microsoft, une adresse iCal secrète : chacun vaut un accès
 * en lecture à l'agenda d'une personne. On les chiffre en AES-256-GCM avec une clé tirée de
 * `AGENDA_CLE`, ou à défaut de `SESSION_SECRET` — pas de nouveau secret à poser pour démarrer.
 * Changer l'un ou l'autre rend les Agendas illisibles : il faudra les rebrancher, rien de pire.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { reglage } from "@/auth/config";

const VERSION = "v1";

function cle(): Buffer {
  const source = process.env.AGENDA_CLE ?? reglage("SESSION_SECRET");
  return Buffer.from(hkdfSync("sha256", source, "bruno", "agenda/coffre/v1", 32));
}

export function sceller(clair: string): string {
  const iv = randomBytes(12);
  const chiffre = createCipheriv("aes-256-gcm", cle(), iv);
  const corps = Buffer.concat([chiffre.update(clair, "utf8"), chiffre.final()]);
  return [VERSION, iv.toString("base64url"), chiffre.getAuthTag().toString("base64url"), corps.toString("base64url")].join(".");
}

export function ouvrir(scelle: string): string {
  const [version, iv, etiquette, corps] = scelle.split(".");
  if (version !== VERSION || !iv || !etiquette || corps === undefined) throw new Error("Secret d'Agenda illisible.");
  const dechiffre = createDecipheriv("aes-256-gcm", cle(), Buffer.from(iv, "base64url"));
  dechiffre.setAuthTag(Buffer.from(etiquette, "base64url"));
  return Buffer.concat([dechiffre.update(Buffer.from(corps, "base64url")), dechiffre.final()]).toString("utf8");
}
