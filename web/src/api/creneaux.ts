/**
 * Les Créneaux d'un Membre — BRU-23.
 *
 * Chacun pose ses heures, au quart d'heure, trois au minimum. La nature d'une Relance ne se
 * configure pas : elle se déduit de la position dans la journée — la première est le Point du
 * matin, la dernière le Bilan, celles du milieu des Rappels. Il n'y a rien d'autre à régler
 * que des heures.
 *
 * Le minimum de trois est un invariant de table, hors de portée d'un CHECK (ADR 0002) : c'est
 * ici qu'il est tenu, délibérément.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { creneau } from "@/db/schema";
import { ErreurApi, depuisPostgres, introuvable } from "./erreurs";

export type Nature = "point_du_matin" | "rappel" | "bilan";
export type Creneau = { id: string; heure: string; nature: Nature };
export const MINIMUM = 3;

type Ctx = { spaceId: string; membreId: string };

/** « HH:MM », à partir de ce que renvoie Postgres (« HH:MM:SS »). */
const court = (h: string) => h.slice(0, 5);

/** La nature de chaque heure, dans l'ordre de la journée. Pure : c'est la règle, testée telle quelle. */
export function natures(heures: string[]): { heure: string; nature: Nature }[] {
  const triees = [...heures].sort();
  return triees.map((heure, i) => ({
    heure,
    nature: i === 0 ? "point_du_matin" : i === triees.length - 1 ? "bilan" : "rappel",
  }));
}

export async function lister(ctx: Ctx): Promise<Creneau[]> {
  const lignes = await db.select().from(creneau)
    .where(and(eq(creneau.spaceId, ctx.spaceId), eq(creneau.membreId, ctx.membreId)))
    .orderBy(asc(creneau.heure));
  const nat = natures(lignes.map((l) => court(l.heure)));
  return lignes.map((l) => ({ id: l.id, heure: court(l.heure), nature: nat.find((n) => n.heure === court(l.heure))!.nature }));
}

async function traduire<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (e) {
    const err = depuisPostgres(e);
    if (err) throw err;
    if ((e as { cause?: { constraint_name?: string } })?.cause?.constraint_name === "creneau_unique"
      || (e as { constraint_name?: string })?.constraint_name === "creneau_unique") {
      throw new ErreurApi("requete_invalide", 422, "Il y a déjà un Créneau à cette heure.");
    }
    throw e;
  }
}

export async function ajouter(ctx: Ctx, heure: string): Promise<Creneau[]> {
  await traduire(() => db.insert(creneau).values({ spaceId: ctx.spaceId, membreId: ctx.membreId, heure }));
  return lister(ctx);
}

export async function deplacer(ctx: Ctx, id: string, heure: string): Promise<Creneau[]> {
  const [c] = await db.select().from(creneau).where(and(eq(creneau.id, id), eq(creneau.membreId, ctx.membreId)));
  if (!c) throw introuvable("Créneau");
  await traduire(() => db.update(creneau).set({ heure }).where(eq(creneau.id, id)));
  return lister(ctx);
}

/** Retirer, sauf si l'on tomberait sous trois : le Point du matin et le Bilan restent, il faut au moins un Rappel. */
export async function retirer(ctx: Ctx, id: string): Promise<Creneau[]> {
  const [c] = await db.select().from(creneau).where(and(eq(creneau.id, id), eq(creneau.membreId, ctx.membreId)));
  if (!c) throw introuvable("Créneau");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(creneau).where(eq(creneau.membreId, ctx.membreId));
  if (n <= MINIMUM) {
    throw new ErreurApi("minimum_creneaux", 422, `Trois Créneaux au minimum : le Point du matin, au moins un Rappel, le Bilan.`);
  }
  await db.delete(creneau).where(eq(creneau.id, id));
  return lister(ctx);
}
