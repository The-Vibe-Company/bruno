/**
 * Les Agendas : brancher, débrancher, et lire ce qu'il y a dedans pour le Calendrier.
 *
 * Comme le reste de Bruno, tout le monde voit tout : les Agendas de chacun s'affichent pour
 * tous. On branche un lien iCal pour n'importe qui ; un compte Google ou Microsoft, seulement
 * pour soi — c'est son propriétaire qui dit oui chez le fournisseur.
 */
import { and, asc, eq } from "drizzle-orm";
import { ouvrir, sceller } from "@/agenda/coffre";
import { evenementsGoogle, evenementsMicrosoft, jetonAcces, oublierAcces, type FournisseurOAuth } from "@/agenda/fournisseurs";
import { lireIcs, normaliserLien, origineDuLien, type EvenementLu } from "@/agenda/ical";
import { ajouterJours, minuit } from "@/agenda/periode";
import { db } from "@/db/client";
import { agenda, membre } from "@/db/schema";
import type { Agenda, AjouterLienAgenda, Evenement, LectureAgendas } from "./contrat";
import { ErreurApi, introuvable } from "./erreurs";
import type { Ctx } from "./membre-courant";

type Ligne = typeof agenda.$inferSelect;

function origine(l: Ligne): Agenda["origine"] {
  if (l.fournisseur === "google") return "google";
  if (l.fournisseur === "microsoft") return "outlook";
  try { return origineDuLien(ouvrir(l.secret)); } catch { return "autre"; }
}

const resume = (l: Ligne): Agenda => ({
  id: l.id, membreId: l.membreId, fournisseur: l.fournisseur, nom: l.nom, origine: origine(l), couleur: l.couleur, createdAt: l.createdAt.toISOString(),
});

export async function lister(ctx: Ctx): Promise<Agenda[]> {
  const lignes = await db.select().from(agenda).where(eq(agenda.spaceId, ctx.spaceId)).orderBy(asc(agenda.createdAt));
  return lignes.map(resume);
}

/* ------------------------------------------------------------------ le lien iCal */

const TAILLE_MAX = 10 * 1024 * 1024;
/** Un fichier iCal se relit au plus toutes les deux minutes : changer de semaine ne refait pas le voyage. */
const fichiers = new Map<string, { texte: string; lu: number }>();
const FRAICHEUR_MS = 2 * 60_000;

async function telecharger(url: URL): Promise<string> {
  let r: Response;
  try {
    r = await fetch(url, { headers: { accept: "text/calendar, */*" }, redirect: "follow", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new Error("Le lien ne répond pas.");
  }
  if (!r.ok) throw new Error(`Le lien répond ${r.status}${r.status === 404 || r.status === 401 ? " — le calendrier n'est plus publié ?" : ""}.`);
  const texte = await r.text();
  if (texte.length > TAILLE_MAX) throw new Error("Ce calendrier est trop gros pour être lu.");
  if (!texte.includes("BEGIN:VCALENDAR")) throw new Error("Ce lien ne donne pas un calendrier iCal.");
  return texte;
}

async function lireLien(agendaId: string, url: string, du: Date, au: Date): Promise<EvenementLu[]> {
  const garde = fichiers.get(agendaId);
  const texte = garde && Date.now() - garde.lu < FRAICHEUR_MS ? garde.texte : await telecharger(normaliserLien(url));
  if (!garde || garde.texte !== texte) fichiers.set(agendaId, { texte, lu: Date.now() });
  return lireIcs(texte, du, au);
}

export async function ajouterLien(ctx: Ctx, entree: AjouterLienAgenda): Promise<Agenda[]> {
  const [pour] = await db.select({ id: membre.id }).from(membre)
    .where(and(eq(membre.id, entree.membreId), eq(membre.spaceId, ctx.spaceId)));
  if (!pour) throw introuvable("Membre");

  let url: URL;
  try {
    url = normaliserLien(entree.url);
    // Lu tout de suite : un lien qui ne marche pas se refuse ici, pas en silence sur le Calendrier.
    const maintenant = new Date();
    lireIcs(await telecharger(url), maintenant, new Date(maintenant.getTime() + 7 * 86_400_000));
  } catch (e) {
    throw new ErreurApi("requete_invalide", 422, e instanceof Error ? e.message : "Ce lien est illisible.");
  }

  const pose = await db.insert(agenda).values({
    spaceId: ctx.spaceId, membreId: entree.membreId, fournisseur: "ical", nom: entree.nom, secret: sceller(url.toString()), ajouteParId: ctx.membreId,
  }).onConflictDoNothing().returning({ id: agenda.id });
  if (pose.length === 0) throw new ErreurApi("requete_invalide", 422, `« ${entree.nom} » existe déjà pour ce Membre : donnez un autre nom.`);
  return lister(ctx);
}

/* ------------------------------------------------------------------ Google et Microsoft */

/** Au retour d'OAuth. Rebrancher le même compte remplace le secret au lieu d'empiler un doublon. */
export async function brancherCompte(ctx: Ctx, fournisseur: FournisseurOAuth, email: string, refreshToken: string) {
  const [l] = await db.insert(agenda).values({
    spaceId: ctx.spaceId, membreId: ctx.membreId, fournisseur, nom: email, secret: sceller(refreshToken), ajouteParId: ctx.membreId,
  }).onConflictDoUpdate({ target: [agenda.membreId, agenda.fournisseur, agenda.nom], set: { secret: sceller(refreshToken) } })
    .returning({ id: agenda.id });
  oublierAcces(l.id);
}

export async function retirer(ctx: Ctx, id: string): Promise<Agenda[]> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw introuvable("Agenda");
  const sortis = await db.delete(agenda).where(and(eq(agenda.id, id), eq(agenda.spaceId, ctx.spaceId))).returning({ id: agenda.id });
  if (sortis.length === 0) throw introuvable("Agenda");
  oublierAcces(id);
  fichiers.delete(id);
  return lister(ctx);
}

/** La couleur d'un Agenda sur le Calendrier ; null lui rend celle de son Membre. */
export async function colorer(ctx: Ctx, id: string, couleur: string | null): Promise<Agenda[]> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw introuvable("Agenda");
  const touches = await db.update(agenda).set({ couleur: couleur?.toUpperCase() ?? null })
    .where(and(eq(agenda.id, id), eq(agenda.spaceId, ctx.spaceId))).returning({ id: agenda.id });
  if (touches.length === 0) throw introuvable("Agenda");
  return lister(ctx);
}

/* ------------------------------------------------------------------ lire */

const JOURS_MAX = 42;

async function lireUn(l: Ligne, du: Date, au: Date): Promise<EvenementLu[]> {
  const secret = ouvrir(l.secret);
  if (l.fournisseur === "ical") return lireLien(l.id, secret, du, au);
  const remplacer = async (nouveau: string) => { await db.update(agenda).set({ secret: sceller(nouveau) }).where(eq(agenda.id, l.id)); };
  let jeton: string;
  try { jeton = await jetonAcces(l.fournisseur, l.id, secret, remplacer); }
  catch (e) {
    // invalid_grant : l'accès a été retiré, ou le mot de passe changé. Seul un nouveau branchement y remédie.
    throw new Error(String(e).includes("invalid_grant") ? "L'accès a expiré : rebranchez ce compte." : e instanceof Error ? e.message : "Accès refusé.");
  }
  return l.fournisseur === "google" ? evenementsGoogle(jeton, du, au) : evenementsMicrosoft(jeton, du, au);
}

/**
 * Tous les Agendas de l'Espace, en parallèle, du premier jour au dernier inclus. Un Agenda qui ne
 * répond pas ne prive pas les autres : il est listé dans `erreurs` et l'écran le dit.
 */
export async function lire(ctx: Ctx, duJour: string, auJour: string, membres?: Set<string>): Promise<LectureAgendas> {
  if (auJour < duJour) throw new ErreurApi("requete_invalide", 422, "La période finit avant de commencer.");
  if (ajouterJours(duJour, JOURS_MAX) < auJour) throw new ErreurApi("requete_invalide", 422, `${JOURS_MAX} jours au plus.`);
  const du = minuit(duJour);
  const au = minuit(ajouterJours(auJour, 1));
  // Les visages éteints sur le Calendrier : leurs agendas ne sont même pas lus.
  const lignes = (await db.select().from(agenda).where(eq(agenda.spaceId, ctx.spaceId)))
    .filter((l) => !membres || membres.has(l.membreId));

  const lus = await Promise.all(lignes.map(async (l) => {
    try {
      const evenements: Evenement[] = (await lireUn(l, du, au)).map((e) => ({ ...e, id: `${l.id}:${e.id}`, agendaId: l.id, membreId: l.membreId }));
      return { evenements, erreur: null };
    } catch (e) {
      console.warn("[agenda] lecture échouée", l.fournisseur, l.id, e instanceof Error ? e.message : e);
      return { evenements: [], erreur: { agendaId: l.id, message: e instanceof Error ? e.message : "Illisible." } };
    }
  }));
  return {
    evenements: lus.flatMap((x) => x.evenements).sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0)),
    erreurs: lus.flatMap((x) => (x.erreur ? [x.erreur] : [])),
  };
}
