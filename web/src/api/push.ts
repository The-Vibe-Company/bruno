/**
 * Les appareils abonnés aux Relances, côté API. La mécanique d'envoi est dans
 * `src/relances/push.ts` ; ici on ne fait que la ranger derrière « moi » : un Membre ne voit et
 * n'efface que ses propres appareils.
 */
import { ErreurApi } from "./erreurs";
import { db } from "@/db/client";
import { abonnementPush } from "@/db/schema";
import { appareils, envoyer, oublier } from "@/relances/push";

type Ctx = { spaceId: string; membreId: string };
export type Appareil = { id: string; appareil: string | null; depuis: string; endpoint: string };

const mesAppareils = async (ctx: Ctx): Promise<Appareil[]> =>
  (await appareils(ctx.membreId)).map((a) => ({ id: a.id, appareil: a.appareil, depuis: a.createdAt.toISOString(), endpoint: a.endpoint }));

/**
 * Poser un abonnement. Le même navigateur qui redemande renvoie le même `endpoint` : on écrase
 * plutôt que d'empiler, sinon une Relance arriverait en double sur le même écran.
 */
async function poser(ctx: Ctx, e: { endpoint: string; p256dh: string; auth: string; appareil?: string | null }): Promise<Appareil[]> {
  await db.insert(abonnementPush)
    .values({ spaceId: ctx.spaceId, membreId: ctx.membreId, endpoint: e.endpoint, p256dh: e.p256dh, auth: e.auth, appareil: e.appareil ?? null })
    .onConflictDoUpdate({
      target: abonnementPush.endpoint,
      set: { membreId: ctx.membreId, spaceId: ctx.spaceId, p256dh: e.p256dh, auth: e.auth, appareil: e.appareil ?? null },
    });
  return mesAppareils(ctx);
}

async function retirer(ctx: Ctx, id: string): Promise<Appareil[]> {
  await oublier(ctx.membreId, id);
  return mesAppareils(ctx);
}

/** L'essai : ce n'est pas une Relance, donc rien n'est tracé — on peut le refaire. */
async function essai(ctx: Ctx): Promise<{ partis: number }> {
  const partis = await envoyer(ctx.membreId, {
    titre: "Bruno",
    corps: "Les Relances arriveront ici : le Point du matin, les Rappels, le Bilan.",
    tag: "essai",
  });
  if (partis === 0) throw new ErreurApi("requete_invalide", 422, "Aucun appareil abonné : activez les notifications sur celui-ci.");
  return { partis };
}

export const abonner = { mesAppareils, poser, retirer, essai };
