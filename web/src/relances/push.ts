/**
 * Livrer une Relance là où quelqu'un la verra : une notification du navigateur (BRU-25 bis).
 *
 * Le moteur ne sait rien de tout ça — il livre à une interface. Le push web, c'est l'ordinateur :
 * le Mac, aux heures des Créneaux, sans rien demander à Apple. Sur iPhone c'est l'app qui les
 * recevra, par APNs (BRU-25) — avec l'appui long « Terminé / Reporter » qu'une notification de
 * navigateur ne sait pas faire.
 *
 * Les clés VAPID signent nos envois : le service de push (Apple, Google) n'accepte un message
 * pour un abonnement que s'il vient de la même paire de clés que celle qui l'a créé.
 */
import webpush, { WebPushError } from "web-push";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { abonnementPush } from "@/db/schema";
import { livreurJournal, type Livreur, type RelanceDue } from "./moteur";

export type Envoi = { titre: string; corps: string; url?: string; tag?: string };

/** La clé publique : elle part dans le navigateur, c'est son rôle. Vide = push non configuré. */
export const clePublique = () => process.env.VAPID_PUBLIC_KEY ?? "";

let prete = false;
function preparer(): boolean {
  const publique = clePublique(), privee = process.env.VAPID_PRIVATE_KEY;
  if (!publique || !privee) return false;
  if (!prete) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:bruno@thevibecompany.co", publique, privee);
    prete = true;
  }
  return true;
}

/**
 * Envoie à tous les appareils d'un Membre. Retourne combien sont partis.
 *
 * Un appareil qui répond 404 ou 410 est parti pour de bon (navigateur désinstallé, permission
 * retirée) : on efface sa ligne, sinon on lui réécrit tous les quarts d'heure jusqu'à la fin des
 * temps. Les autres erreurs se notent et ne font rien tomber : une Relance qui n'arrive pas ne
 * doit pas empêcher les suivantes.
 */
export async function envoyer(membreId: string, envoi: Envoi): Promise<number> {
  if (!preparer()) return 0;
  const appareils = await db.select().from(abonnementPush).where(eq(abonnementPush.membreId, membreId));
  const charge = JSON.stringify(envoi);
  let partis = 0;
  for (const a of appareils) {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge);
      partis++;
    } catch (e) {
      const statut = e instanceof WebPushError ? e.statusCode : 0;
      if (statut === 404 || statut === 410) await db.delete(abonnementPush).where(eq(abonnementPush.id, a.id));
      else console.error(`[push] ${a.appareil ?? a.endpoint.slice(0, 40)} — ${statut || (e as Error).message}`);
    }
  }
  return partis;
}

/** Combien d'appareils écoutent pour ce Membre — ce que les Réglages affichent. */
export const appareils = (membreId: string) =>
  db.select({ id: abonnementPush.id, appareil: abonnementPush.appareil, createdAt: abonnementPush.createdAt, endpoint: abonnementPush.endpoint })
    .from(abonnementPush).where(eq(abonnementPush.membreId, membreId)).orderBy(abonnementPush.createdAt);

export const oublier = (membreId: string, id: string) =>
  db.delete(abonnementPush).where(and(eq(abonnementPush.id, id), eq(abonnementPush.membreId, membreId)));

/**
 * Le livreur du cron : la notification **et** le journal. Le journal reste parce que c'est lui
 * qu'on relit quand quelqu'un dit « je n'ai rien reçu » — et il dit maintenant sur combien
 * d'appareils c'est parti.
 */
export const livreurPush: Livreur = {
  async livrer(r: RelanceDue) {
    const partis = await envoyer(r.membreId, { titre: r.message.titre, corps: r.message.corps, tag: `${r.nature}-${r.heure}` });
    await livreurJournal.livrer(r);
    if (partis === 0) console.warn(`[push] ${r.nom} · ${r.heure} — aucun appareil abonné`);
  },
};
