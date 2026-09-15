/**
 * Le canal de l'iPhone : APNs (BRU-25).
 *
 * Apple ne veut ni mot de passe ni certificat — une **clé d'authentification** (`.p8`) dont on
 * signe un jeton, valable un peu moins d'une heure. On le garde en mémoire tant qu'il vaut :
 * le cron passe tous les quarts d'heure, re-signer à chaque fois ne servirait à rien.
 *
 * APNs parle **HTTP/2 seulement** — `fetch` ne sait pas, d'où `node:http2`. Une connexion par
 * envoi : une fonction ne vit pas assez longtemps pour qu'un pool ait un sens.
 */
import { connect } from "node:http2";
import { importPKCS8, SignJWT } from "jose";

/** Le jeton APNs vaut une heure ; on le refait à cinquante minutes, avec de la marge. */
let jeton: { valeur: string; jusqu: number } | null = null;

export type Reglages = { cle: string; keyId: string; teamId: string; bundleId: string; hote: string };

/**
 * Les réglages, ou `null` si APNs n'est pas configuré — Bruno se tait alors, il ne tombe pas.
 *
 * `APNS_ENV=sandbox` vise les builds lancés depuis Xcode ; TestFlight et l'App Store parlent au
 * serveur de production, c'est donc lui par défaut.
 */
export function reglages(): Reglages | null {
  const cle = process.env.APNS_KEY, keyId = process.env.APNS_KEY_ID, teamId = process.env.APNS_TEAM_ID;
  if (!cle || !keyId || !teamId) return null;
  return {
    // Collée dans une variable d'environnement, la clé perd souvent ses retours à la ligne.
    cle: cle.includes("\n") ? cle : cle.replace(/(-----BEGIN PRIVATE KEY-----)\s*/, "$1\n").replace(/\s*(-----END PRIVATE KEY-----)/, "\n$1"),
    keyId, teamId,
    bundleId: process.env.APNS_BUNDLE_ID ?? "co.thevibecompany.bruno",
    hote: process.env.APNS_ENV === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com",
  };
}

async function autorisation(r: Reglages): Promise<string> {
  if (jeton && jeton.jusqu > Date.now()) return jeton.valeur;
  const valeur = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: r.keyId })
    .setIssuer(r.teamId)
    .setIssuedAt()
    .sign(await importPKCS8(r.cle, "ES256"));
  jeton = { valeur, jusqu: Date.now() + 50 * 60 * 1000 };
  return valeur;
}

export type Notification = {
  titre: string;
  corps: string;
  /** Les Tâches que la Relance nomme : l'app en a besoin pour « Terminé ». */
  tacheIds?: string[];
  /** Un fil par nature : le Rappel de midi remplace celui de 12h45, il ne s'empile pas. */
  fil?: string;
  categorie?: string;
};

export type Reponse = { statut: number; raison?: string };

/** Un envoi, à un appareil. Le statut est celui d'APNs : 200 c'est parti, 410 le jeton est mort. */
export function envoyerA(r: Reglages, jetonAppareil: string, n: Notification, auth: string): Promise<Reponse> {
  return new Promise((resoudre) => {
    const client = connect(r.hote);
    const fin = (statut: number, raison?: string) => { client.close(); resoudre({ statut, raison }); };
    client.on("error", (e) => fin(0, e.message));
    const requete = client.request({
      ":method": "POST",
      ":path": `/3/device/${jetonAppareil}`,
      authorization: `bearer ${auth}`,
      "apns-topic": r.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      ...(n.fil ? { "apns-collapse-id": n.fil.slice(0, 64) } : {}),
      "content-type": "application/json",
    });
    let statut = 0, corps = "";
    requete.on("response", (entetes) => { statut = Number(entetes[":status"]) || 0; });
    requete.setEncoding("utf8");
    requete.on("data", (d) => { corps += d; });
    requete.on("end", () => {
      let raison: string | undefined;
      try { raison = corps ? JSON.parse(corps).reason : undefined; } catch { raison = corps || undefined; }
      fin(statut, raison);
    });
    requete.on("error", (e) => fin(0, e.message));
    requete.end(JSON.stringify({
      aps: {
        alert: { title: n.titre, body: n.corps },
        sound: "default",
        "thread-id": n.fil,
        category: n.categorie,
        "interruption-level": "time-sensitive",
      },
      tacheIds: n.tacheIds ?? [],
    }));
  });
}

/** Le jeton d'autorisation, pour un lot d'envois : on ne le re-signe pas par appareil. */
export const autorisationPour = autorisation;
