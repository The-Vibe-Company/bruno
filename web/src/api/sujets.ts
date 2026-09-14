/**
 * Les Sujets du Weekly : ce dont chacun veut parler cette semaine. Une ligne de texte, rattachée
 * à un Membre et à un lundi. N'importe qui écrit sur la liste de n'importe qui — c'est une
 * réunion, pas un dossier personnel. Rien à cocher, rien à faire avancer : la semaine suivante
 * repart d'une page blanche.
 */
import { and, asc, eq } from "drizzle-orm";
import type { z } from "zod";
import * as C from "./contrat";
import { db } from "@/db/client";
import { membre, sujet } from "@/db/schema";
import { introuvable } from "./erreurs";
import { traduire } from "./erreurs";

type Ctx = { spaceId: string; membreId: string };
export type Rubrique = z.infer<typeof C.Rubrique>;
export type SujetLu = { id: string; lundi: string; rubrique: Rubrique; membreId: string; texte: string; auteur: string | null; createdAt: string };

const colonnes = {
  id: sujet.id, lundi: sujet.lundi, rubrique: sujet.rubrique, membreId: sujet.membreId, texte: sujet.texte,
  auteur: membre.nom, createdAt: sujet.createdAt,
};

const lu = (l: { id: string; lundi: string; rubrique: Rubrique; membreId: string; texte: string; auteur: string | null; createdAt: Date }): SujetLu =>
  ({ ...l, createdAt: l.createdAt.toISOString() });

/** Les Sujets d'une semaine, du plus ancien au plus récent : l'ordre où on les a posés. */
export async function lister(ctx: Ctx, lundi: string): Promise<SujetLu[]> {
  const lignes = await db.select(colonnes).from(sujet)
    .leftJoin(membre, eq(membre.id, sujet.creeParId))
    .where(and(eq(sujet.spaceId, ctx.spaceId), eq(sujet.lundi, lundi)))
    .orderBy(asc(sujet.createdAt));
  return lignes.map(lu);
}

export async function poser(ctx: Ctx, entree: z.infer<typeof C.PoserSujet>): Promise<SujetLu> {
  return traduire(async () => {
    const [m] = await db.select({ id: membre.id }).from(membre)
      .where(and(eq(membre.id, entree.membreId), eq(membre.spaceId, ctx.spaceId), eq(membre.actif, true)));
    if (!m) throw introuvable("Membre");
    const [cree] = await db.insert(sujet)
      .values({ spaceId: ctx.spaceId, lundi: entree.lundi, rubrique: entree.rubrique, membreId: entree.membreId, texte: entree.texte, creeParId: ctx.membreId })
      .returning({ id: sujet.id });
    const [ligne] = await db.select(colonnes).from(sujet)
      .leftJoin(membre, eq(membre.id, sujet.creeParId))
      .where(eq(sujet.id, cree.id));
    return lu(ligne);
  });
}

/** Changer à qui il est, ou ce qu'il dit. */
export async function modifier(ctx: Ctx, id: string, patch: z.infer<typeof C.ModifierSujet>): Promise<SujetLu> {
  return traduire(async () => {
    if (patch.membreId) {
      const [m] = await db.select({ id: membre.id }).from(membre)
        .where(and(eq(membre.id, patch.membreId), eq(membre.spaceId, ctx.spaceId), eq(membre.actif, true)));
      if (!m) throw introuvable("Membre");
    }
    if (Object.keys(patch).length > 0) {
      await db.update(sujet).set(patch).where(and(eq(sujet.id, id), eq(sujet.spaceId, ctx.spaceId)));
    }
    const [ligne] = await db.select(colonnes).from(sujet)
      .leftJoin(membre, eq(membre.id, sujet.creeParId))
      .where(and(eq(sujet.id, id), eq(sujet.spaceId, ctx.spaceId)));
    if (!ligne) throw introuvable("Sujet");
    return lu(ligne);
  });
}

/** Un Sujet se retire, sans cérémonie : il n'a de valeur que le jour de la réunion. */
export async function supprimer(ctx: Ctx, id: string): Promise<void> {
  const supprimes = await db.delete(sujet)
    .where(and(eq(sujet.id, id), eq(sujet.spaceId, ctx.spaceId)))
    .returning({ id: sujet.id });
  if (supprimes.length === 0) throw introuvable("Sujet");
}
