/**
 * Les Projets : exactement la même chose qu'une Affectation, sur un autre axe (BRU-71). Même
 * table, même code, même interface — seul le genre change. Si une règle bouge pour l'une, elle
 * bouge pour l'autre : c'est précisément ce qu'Antoine a demandé.
 */
import * as R from "./rattachements";

type Ctx = { spaceId: string };

export const lister = (ctx: Ctx) => R.lister(ctx, "projet");
export const ajouter = (ctx: Ctx, nom: string, couleur: string) => R.ajouter(ctx, "projet", nom, couleur);
export const activer = (ctx: Ctx, id: string, actif: boolean) => R.activer(ctx, "projet", id, actif);
export const supprimer = (ctx: Ctx, id: string) => R.supprimer(ctx, "projet", id);

export const enCours = (ctx: Ctx) => R.enCours(ctx, "projet");
export const surLaPeriode = (ctx: Ctx, du: string, au: string) => R.surLaPeriode(ctx, "projet", du, au);
export const auJour = (ctx: Ctx, jour: string) => R.auJour(ctx, "projet", jour);
export const historique = (ctx: Ctx, membreId: string) => R.historique(ctx, "projet", membreId);
export const poser = (ctx: Ctx, membreId: string, projetId: string, debut?: string) => R.poser(ctx, "projet", membreId, projetId, debut);
export const fermer = (ctx: Ctx, id: string, jour?: string) => R.fermer(ctx, "projet", id, jour);
