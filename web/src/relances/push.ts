/**
 * Livrer une Relance là où quelqu'un la verra (BRU-25).
 *
 * Le moteur ne sait rien de tout ça — il livre à une interface. Deux canaux derrière : le
 * navigateur d'un ordinateur (clés VAPID, contenu chiffré par nos soins) et l'app iPhone
 * (APNs, `apns.ts`). Un Membre a souvent les deux ; il reçoit sur les deux.
 *
 * Rien de configuré ⇒ rien d'envoyé, et rien qui tombe : Bruno se contente du journal, comme
 * avant d'avoir un canal.
 */
import webpush, { WebPushError } from "web-push";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { abonnementPush } from "@/db/schema";
import { autorisationPour, envoyerA, reglages } from "./apns";
import { livreurJournal, type Livreur, type RelanceDue } from "./moteur";

export type Envoi = { titre: string; corps: string; url?: string; tag?: string; tacheIds?: string[] };
type Appareil = typeof abonnementPush.$inferSelect;

/** La clé publique VAPID : elle part dans le navigateur, c'est son rôle. Vide = push web non configuré. */
export const clePublique = () => process.env.VAPID_PUBLIC_KEY ?? "";

let vapidPret = false;
function preparerVapid(): boolean {
  const publique = clePublique(), privee = process.env.VAPID_PRIVATE_KEY;
  if (!publique || !privee) return false;
  if (!vapidPret) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:bruno@thevibecompany.co", publique, privee);
    vapidPret = true;
  }
  return true;
}

/** Un appareil qui n'existe plus est effacé : sinon on lui réécrit tous les quarts d'heure jusqu'à la fin des temps. */
const oublierAppareil = (id: string) => db.delete(abonnementPush).where(eq(abonnementPush.id, id));

async function parNavigateur(appareils: Appareil[], envoi: Envoi): Promise<number> {
  if (!appareils.length || !preparerVapid()) return 0;
  const charge = JSON.stringify({ titre: envoi.titre, corps: envoi.corps, url: envoi.url, tag: envoi.tag });
  let partis = 0;
  for (const a of appareils) {
    if (!a.p256dh || !a.auth) continue;
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge);
      partis++;
    } catch (e) {
      const statut = e instanceof WebPushError ? e.statusCode : 0;
      if (statut === 404 || statut === 410) await oublierAppareil(a.id);
      else console.error(`[push] ${a.appareil ?? a.endpoint.slice(0, 40)} — ${statut || (e as Error).message}`);
    }
  }
  return partis;
}

/**
 * APNs. « Unregistered » (410) et « BadDeviceToken » (400) veulent dire la même chose : ce jeton
 * ne désigne plus rien — app désinstallée, ou build passé du bac à sable à la production.
 */
async function parApns(appareils: Appareil[], envoi: Envoi): Promise<number> {
  const r = reglages();
  if (!appareils.length || !r) return 0;
  const auth = await autorisationPour(r);
  let partis = 0;
  for (const a of appareils) {
    const { statut, raison } = await envoyerA(r, a.endpoint, {
      titre: envoi.titre, corps: envoi.corps, tacheIds: envoi.tacheIds, fil: envoi.tag, categorie: "RELANCE",
    }, auth);
    if (statut === 200) partis++;
    else if (statut === 410 || raison === "BadDeviceToken" || raison === "Unregistered") await oublierAppareil(a.id);
    else console.error(`[push] iPhone — APNs ${statut} ${raison ?? ""}`.trim());
  }
  return partis;
}

/** Envoie à tous les appareils d'un Membre, quel que soit le canal. Retourne combien sont partis. */
export async function envoyer(membreId: string, envoi: Envoi): Promise<number> {
  const appareils = await db.select().from(abonnementPush).where(eq(abonnementPush.membreId, membreId));
  return (await parNavigateur(appareils.filter((a) => a.canal === "web"), envoi))
    + (await parApns(appareils.filter((a) => a.canal === "ios"), envoi));
}

/** Combien d'appareils écoutent pour ce Membre — ce que les Réglages affichent. */
export const appareils = (membreId: string) =>
  db.select({ id: abonnementPush.id, appareil: abonnementPush.appareil, canal: abonnementPush.canal, createdAt: abonnementPush.createdAt, endpoint: abonnementPush.endpoint })
    .from(abonnementPush).where(eq(abonnementPush.membreId, membreId)).orderBy(abonnementPush.createdAt);

export const oublier = (membreId: string, id: string) =>
  db.delete(abonnementPush).where(and(eq(abonnementPush.id, id), eq(abonnementPush.membreId, membreId)));

/**
 * Le livreur du cron : les appareils **et** le journal. Le journal reste parce que c'est lui
 * qu'on relit quand quelqu'un dit « je n'ai rien reçu » — et il dit maintenant si personne
 * n'était abonné.
 */
export const livreurPush: Livreur = {
  async livrer(r: RelanceDue) {
    const partis = await envoyer(r.membreId, {
      titre: r.message.titre, corps: r.message.corps, tag: `${r.nature}-${r.heure}`, tacheIds: r.message.tacheIds,
    });
    await livreurJournal.livrer(r);
    if (partis === 0) console.warn(`[push] ${r.nom} · ${r.heure} — aucun appareil abonné`);
  },
};
