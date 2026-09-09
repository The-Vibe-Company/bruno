/**
 * Les données de départ — BRU-5.
 *
 * Deux niveaux, idempotents (relancer ne change rien) :
 *   - la **base** : l'Espace, les Membres, les Affectations et des Créneaux par défaut.
 *     Sûre partout, production comprise. Sans elle, personne ne peut se connecter : la
 *     session Google atterrit dans l'unique Espace, qui doit exister.
 *   - la **démo** : les Tâches des maquettes, pour développer sans écran vide.
 *     Refusée hors de localhost, quoi qu'il arrive.
 *
 * Les Membres ne sont pré-créés que si l'on connaît leur adresse : la connexion Google crée
 * un Membre à la première venue de quiconque du domaine, une adresse devinée ferait un
 * doublon. Les autres Membres se donnent par `SEED_MEMBRES="Stan:stan@x.co,Victor:victor@x.co"`.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "./client";
import { jourOuvrePrecedent } from "@/lib/dates";
import { affectation, affectationMembre, creneau, membre, recurrence, space, tache } from "./schema";
import { dbUrl } from "./url";

/** Fixe, pour que « l'Espace » soit le même à chaque exécution et sur chaque base. */
export const SPACE_ID = "0f9d1c4a-5b3e-4a7c-9d2e-1b8f6a3c5e70";
const DOMAINE = process.env.BRUNO_DOMAINE ?? "thevibecompany.co";

const AFFECTATIONS = [
  { nom: "MONKA", couleur: "#F27313", actif: true },
  { nom: "AFP", couleur: "#4EA7FC", actif: true },
  { nom: "Coup de Pâtes", couleur: "#BB87FC", actif: true },
  { nom: "Interne", couleur: "#8A857B", actif: true },
  { nom: "Bergamote", couleur: "#4CB782", actif: false },
];
/** Le Point du matin, un Rappel, le Bilan — ce que montrent les maquettes des Réglages. */
const CRENEAUX_PAR_DEFAUT = ["09:15", "14:00", "17:30"];

function membresDeclares(): { nom: string; email: string }[] {
  const base = [{ nom: "Antoine", email: `antoine@${DOMAINE}` }];
  const autres = (process.env.SEED_MEMBRES ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean)
    .map((s) => { const [nom, email] = s.split(":"); return { nom: nom.trim(), email: email.trim().toLowerCase() }; });
  return [...base, ...autres];
}

export async function poserBase(membres = membresDeclares(), spaceId = SPACE_ID) {
  await db.insert(space).values({ id: spaceId, nom: "The Vibe Company" }).onConflictDoNothing();

  for (const m of membres) {
    await db.insert(membre).values({ spaceId, nom: m.nom, email: m.email })
      .onConflictDoUpdate({ target: [membre.spaceId, membre.email], set: { nom: m.nom } });
  }
  for (const a of AFFECTATIONS) {
    await db.insert(affectation).values({ spaceId, ...a })
      .onConflictDoUpdate({ target: [affectation.spaceId, affectation.nom], set: { couleur: a.couleur, actif: a.actif } });
  }

  // Des Créneaux par défaut seulement pour qui n'en a aucun : on ne remet pas ceux qu'un
  // Membre a choisi de retirer.
  const tous = await db.select().from(membre).where(eq(membre.spaceId, spaceId));
  for (const m of tous) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(creneau).where(eq(creneau.membreId, m.id));
    if (n === 0) {
      await db.insert(creneau).values(CRENEAUX_PAR_DEFAUT.map((heure) => ({ spaceId, membreId: m.id, heure })));
    }
  }
  return { membres: tous.length, affectations: AFFECTATIONS.length };
}

const estLocal = (url: string) => /@(localhost|127\.0\.0\.1)[:/]/.test(url);

/** Les Tâches des maquettes. Remplace tout : c'est de la démo, et ça ne tourne qu'en local. */
export async function poserDemo(spaceId = SPACE_ID) {
  if (!estLocal(dbUrl("migration"))) {
    throw new Error("La démo ne se pose que sur une base locale (localhost / 127.0.0.1).");
  }
  await poserBase([
    { nom: "Antoine", email: `antoine@${DOMAINE}` },
    { nom: "Stan", email: `stan@${DOMAINE}` },
    { nom: "Victor", email: `victor@${DOMAINE}` },
  ], spaceId);
  const id = Object.fromEntries((await db.select().from(membre).where(eq(membre.spaceId, spaceId))).map((m) => [m.nom, m.id]));
  const aff = Object.fromEntries((await db.select().from(affectation).where(eq(affectation.spaceId, spaceId))).map((a) => [a.nom, a.id]));

  await db.delete(tache).where(eq(tache.spaceId, spaceId));
  await db.delete(affectationMembre).where(eq(affectationMembre.spaceId, spaceId));
  await db.delete(recurrence).where(eq(recurrence.spaceId, spaceId));

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const jour = (delta: number) => { const d = new Date(); d.setDate(d.getDate() + delta); return d.toISOString().slice(0, 10); };
  const feu = (titre: string, statut: "a_faire" | "en_cours" | "bloque", assigne: string, engagement = aujourdhui, extra = {}) =>
    ({ bucket: "sur_le_feu" as const, statut, assigneId: id[assigne], engagement, titre, ...extra });
  const hier = jourOuvrePrecedent(aujourdhui);
  const fini = (titre: string, assigne: string, etatTerminal: "termine" | "abandonne", jourFin: string) =>
    ({ ...feu(titre, "a_faire" as const, assigne, jourFin), etatTerminal, termineLe: new Date(`${jourFin}T14:00:00Z`) });

  const lignes = [
    feu("Relancer MONKA sur le devis", "a_faire", "Antoine"),
    feu("Préparer le mail Coup de Pâtes", "a_faire", "Antoine", aujourdhui, { reportsCount: 3, notes: "Reprendre les chiffres du chiffrage v2 et proposer deux créneaux.", transcriptionBrute: "faut que je prépare le mail pour Coup de Pâtes avec le chiffrage, avant vendredi si possible" }),
    feu("Cadrage atelier AFP", "a_faire", "Stan"),
    feu("Post LinkedIn 2/3", "a_faire", "Victor"),
    feu("Chiffrage refonte site Coup de Pâtes", "a_faire", "Victor", jour(1)),
    feu("Maquettes app MONKA", "en_cours", "Antoine"),
    feu("Réponse appel d'offres AFP", "en_cours", "Stan", aujourdhui, { reportsCount: 1 }),
    feu("Contrat AFP à signer", "bloque", "Stan", jour(-4), { raisonBlocage: "En attente de validation" }),
    feu("Accès serveur Coup de Pâtes", "bloque", "Victor", jour(-6), { raisonBlocage: "En attente de réponse" }),
    { bucket: "a_trier" as const, titre: "Refaire le pitch deck", transcriptionBrute: "faudrait qu'on refasse le pitch deck avant la rentrée", creeParId: id.Antoine },
    { bucket: "a_trier" as const, titre: "Rappeler Coup de Pâtes pour le contrat", transcriptionBrute: "faut rappeler Coup de Pâtes cette semaine pour le contrat", creeParId: id.Victor },
    { bucket: "a_trier" as const, titre: "Automatiser le reporting Qonto", creeParId: id.Stan },
    { bucket: "a_venir" as const, titre: "Préparer le comité de septembre", assigneId: id.Antoine, engagement: jour(9) },
    { bucket: "a_venir" as const, titre: "Renouveler le nom de domaine", assigneId: id.Stan, engagement: jour(20) },
    { bucket: "a_venir" as const, titre: "Bilan trimestriel MONKA", assigneId: id.Antoine, engagement: jour(30) },
    { bucket: "a_venir" as const, titre: "Mettre à jour les CGV", engagement: jour(45) },
    { bucket: "idees" as const, titre: "Une newsletter mensuelle" },
    { bucket: "idees" as const, titre: "Un template de proposition commerciale" },
    { bucket: "idees" as const, titre: "Tester un outil de facturation" },
    fini("Brief créa MONKA", "Antoine", "termine", hier),
    fini("Facture août", "Antoine", "termine", hier),
    fini("Compte rendu comité AFP", "Stan", "termine", hier),
    fini("Post LinkedIn 1/3", "Victor", "termine", hier),
    fini("Refonte du logo", "Antoine", "abandonne", hier),
    fini("Onboarding Bergamote", "Stan", "termine", jour(-8)),
    fini("Webinaire septembre", "Stan", "abandonne", jour(-9)),
    fini("Audit SEO Coup de Pâtes", "Victor", "termine", jour(-10)),
  ];
  await db.insert(tache).values(lignes.map((l, i) => ({ spaceId: spaceId, rang: String(i + 1), ...l })));

  await db.insert(affectationMembre).values([
    { spaceId: spaceId, membreId: id.Antoine, affectationId: aff.MONKA, debut: jour(-5) },
    { spaceId: spaceId, membreId: id.Stan, affectationId: aff.AFP, debut: jour(-12) },
    { spaceId: spaceId, membreId: id.Stan, affectationId: aff.Interne, debut: jour(-2) },
    { spaceId: spaceId, membreId: id.Victor, affectationId: aff["Coup de Pâtes"], debut: jour(-20) },
    { spaceId: spaceId, membreId: id.Antoine, affectationId: aff.Interne, debut: jour(-8), fin: hier },
  ]);
  await db.insert(recurrence).values([
    { spaceId, titre: "Post LinkedIn", assigneId: id.Victor, frequence: "hebdomadaire", jourSemaine: 1, occurrences: 3, decalages: [0, 2, 4] },
    { spaceId, titre: "Point hebdo interne", assigneId: id.Antoine, frequence: "hebdomadaire", jourSemaine: 5, occurrences: 1, decalages: [0] },
    { spaceId, titre: "Facturation mensuelle", assigneId: id.Antoine, frequence: "mensuelle", jourMois: 1, occurrences: 1, decalages: [0] },
    { spaceId, titre: "Relance des devis en attente", assigneId: id.Stan, frequence: "hebdomadaire", jourSemaine: 2, occurrences: 2, decalages: [0, 2] },
  ]);
  return { taches: lignes.length };
}

export async function compter(spaceId = SPACE_ID) {
  const n = (r: { n: number }[]) => r[0].n;
  const total = sql<number>`count(*)::int`;
  return {
    membres: n(await db.select({ n: total }).from(membre).where(eq(membre.spaceId, spaceId))),
    affectations: n(await db.select({ n: total }).from(affectation).where(eq(affectation.spaceId, spaceId))),
    taches: n(await db.select({ n: total }).from(tache).where(eq(tache.spaceId, spaceId))),
    creneaux: n(await db.select({ n: total }).from(creneau).where(eq(creneau.spaceId, spaceId))),
  };
}
