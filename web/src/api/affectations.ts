/**
 * Les Affectations : ce à quoi un Membre travaille (BRU-26, BRU-27). Toute la mécanique vit dans
 * `rattachements.ts` — ce fichier ne fait que fixer le genre. Voir aussi `projets.ts`, son jumeau.
 */
import * as R from "./rattachements";

export type { Affectation, Sur, AffectationsMembre } from "./rattachements";
export { fondre } from "./rattachements";

type Ctx = { spaceId: string };

export const lister = (ctx: Ctx) => R.lister(ctx, "affectation");
export const ajouter = (ctx: Ctx, nom: string, couleur: string) => R.ajouter(ctx, "affectation", nom, couleur);
export const activer = (ctx: Ctx, id: string, actif: boolean) => R.activer(ctx, "affectation", id, actif);
export const supprimer = (ctx: Ctx, id: string) => R.supprimer(ctx, "affectation", id);

export const enCours = (ctx: Ctx) => R.enCours(ctx, "affectation");
export const surLaPeriode = (ctx: Ctx, du: string, au: string) => R.surLaPeriode(ctx, "affectation", du, au);
export const auJour = (ctx: Ctx, jour: string) => R.auJour(ctx, "affectation", jour);
export const historique = (ctx: Ctx, membreId: string) => R.historique(ctx, "affectation", membreId);
export const poser = (ctx: Ctx, membreId: string, affectationId: string, debut?: string) => R.poser(ctx, "affectation", membreId, affectationId, debut);
export const fermer = (ctx: Ctx, id: string, jour?: string) => R.fermer(ctx, "affectation", id, jour);
