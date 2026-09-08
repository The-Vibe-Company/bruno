/**
 * Schéma de Bruno — BRU-2 / THE-578
 *
 * Le vocabulaire vient de CONTEXT.md ; les règles citées viennent du PRD.
 * Principe de ce fichier : **les invariants sont des contraintes Postgres**, pas des `if`
 * dans l'interface. Une règle que la base ne fait pas respecter finira par être violée.
 */
import { sql } from "drizzle-orm";
import {
  boolean, check, date, index, integer, pgEnum, pgTable, primaryKey,
  numeric, smallint, text, time, timestamp, unique, uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ énumérations */

/** Les quatre Buckets. Toujours posés par un humain, jamais calculés (invariant 1). */
export const bucketEnum = pgEnum("bucket", ["a_trier", "sur_le_feu", "a_venir", "idees"]);

/** Le Statut n'existe que dans Sur le feu. Terminé n'en est pas un. */
export const statutEnum = pgEnum("statut", ["a_faire", "en_cours", "bloque"]);

/** Les deux fins qui laissent une trace. Supprimer n'en est pas une : la ligne disparaît. */
export const etatTerminalEnum = pgEnum("etat_terminal", ["termine", "abandonne"]);

/** Seuls les `humain` existent en V1 ; `agent` garde la porte ouverte (PRD §4). */
export const membreTypeEnum = pgEnum("membre_type", ["humain", "agent"]);

export const frequenceEnum = pgEnum("frequence", ["hebdomadaire", "mensuelle"]);

/* ------------------------------------------------------------------ l'espace */

/**
 * Multi-tenant dans le schéma uniquement (ADR 0001) : chaque table porte `space_id`,
 * et il n'existe aucune UI d'espace. Une demi-journée de coût, la porte reste ouverte.
 */
export const space = pgTable("space", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ les gens */

export const membre = pgTable("membre", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id").notNull().references(() => space.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  email: text("email").notNull(),
  /** Tous les Membres ont exactement les mêmes droits : il n'y a pas de colonne `role`. */
  type: membreTypeEnum("type").notNull().default("humain"),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("membre_email_unique").on(t.spaceId, t.email)]);

/* ------------------------------------------------------------------ les affectations */

/**
 * Ce à quoi un Membre peut travailler : un client comme MONKA, ou un sujet interne.
 * Le mot est plus large que « client » — `Interne` en est une.
 * On **désactive**, on ne supprime jamais : l'historique ne doit pas se trouer (BRU-26).
 */
export const affectation = pgTable("affectation", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id").notNull().references(() => space.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  couleur: text("couleur").notNull(),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("affectation_nom_unique").on(t.spaceId, t.nom)]);

/**
 * La période pendant laquelle un Membre est sur une Affectation.
 * Ce nom n'apparaît **jamais** dans l'interface — elle dit « Affectation : MONKA ».
 * Ce n'est pas une Tâche : pas d'Engagement, pas de Statut, pas de Rang, pas de Report,
 * et **rien à cocher** (invariant 6). On en sort en posant `fin`.
 */
export const affectationMembre = pgTable("affectation_membre", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id").notNull().references(() => space.id, { onDelete: "cascade" }),
  membreId: uuid("membre_id").notNull().references(() => membre.id, { onDelete: "cascade" }),
  affectationId: uuid("affectation_id").notNull().references(() => affectation.id),
  debut: date("debut").notNull(),
  /** `null` = toujours dessus. Plusieurs Affectations simultanées sont normales. */
  fin: date("fin"),
}, (t) => [
  check("affectation_membre_periode", sql`${t.fin} IS NULL OR ${t.fin} >= ${t.debut}`),
  index("affectation_membre_courante").on(t.membreId, t.fin),
]);

/* ------------------------------------------------------------------ la Tâche */

export const tache = pgTable("tache", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id").notNull().references(() => space.id, { onDelete: "cascade" }),

  titre: text("titre").notNull(),
  /** Le seul champ libre. Pas de commentaires, pas de sous-tâches, pas de pièces jointes. */
  notes: text("notes"),
  /** Toujours conservée, jamais écrasée par l'Enrichissement (règle 3). */
  transcriptionBrute: text("transcription_brute"),

  bucket: bucketEnum("bucket").notNull().default("a_trier"),
  statut: statutEnum("statut"),

  /**
   * La position **est** la priorité : aucune échelle, aucun niveau, aucun drapeau « urgent »,
   * et aucun numéro affiché. `numeric` est de la précision arbitraire en Postgres : insérer
   * entre deux voisins en faisant la moyenne ne dégrade jamais, contrairement à un flottant.
   */
  rang: numeric("rang").notNull(),

  assigneId: uuid("assigne_id").references(() => membre.id, { onDelete: "set null" }),
  /** Le jour où l'on s'engage à le faire. Jamais une échéance. Bouge par Report seul. */
  engagement: date("engagement"),

  reportsCount: integer("reports_count").notNull().default(0),
  etatTerminal: etatTerminalEnum("etat_terminal"),
  termineLe: timestamp("termine_le", { withTimezone: true }),

  recurrenceId: uuid("recurrence_id"),
  creeParId: uuid("cree_par_id").references(() => membre.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  /**
   * INVARIANT 2 — le droit d'entrée Sur le feu.
   * La seule règle dure de Bruno, et la raison d'être de ce fichier : elle vit ici pour
   * qu'aucun chemin ne puisse la contourner — ni l'UI, ni l'API, ni un script.
   */
  check("tache_droit_entree_sur_le_feu",
    sql`${t.bucket} <> 'sur_le_feu' OR (${t.assigneId} IS NOT NULL AND ${t.engagement} IS NOT NULL)`),

  /** Le Statut n'existe que dans Sur le feu — et y est obligatoire. */
  check("tache_statut_sur_le_feu",
    sql`(${t.bucket} = 'sur_le_feu') = (${t.statut} IS NOT NULL)`),

  /** Terminé et Abandonné datent ; les Tâches vivantes non. */
  check("tache_fin_datee",
    sql`(${t.etatTerminal} IS NULL) = (${t.termineLe} IS NULL)`),

  check("tache_titre_non_vide", sql`length(btrim(${t.titre})) > 0`),
  check("tache_reports_positifs", sql`${t.reportsCount} >= 0`),

  /** Le board ne lit que les Tâches vivantes : c'est la requête la plus fréquente. */
  index("tache_board").on(t.spaceId, t.bucket, t.etatTerminal, t.rang),
  index("tache_engagement").on(t.spaceId, t.assigneId, t.engagement),
]);

/**
 * Les Aidants contribuent sans répondre de la Tâche. Aucun verrou d'édition n'en découle :
 * n'importe qui peut terminer n'importe quelle Tâche.
 */
export const tacheAidant = pgTable("tache_aidant", {
  spaceId: uuid("space_id").notNull().references(() => space.id, { onDelete: "cascade" }),
  tacheId: uuid("tache_id").notNull().references(() => tache.id, { onDelete: "cascade" }),
  membreId: uuid("membre_id").notNull().references(() => membre.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.tacheId, t.membreId] })]);

/* ------------------------------------------------------------------ le Report */

/**
 * Repousser un Engagement. Toujours explicite, toujours motivé (règle 8) : sans raison ce
 * serait un bouton snooze, et un snooze est un trou noir. La contrainte le garantit.
 */
export const report = pgTable("report", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id").notNull().references(() => space.id, { onDelete: "cascade" }),
  tacheId: uuid("tache_id").notNull().references(() => tache.id, { onDelete: "cascade" }),
  auteurId: uuid("auteur_id").references(() => membre.id, { onDelete: "set null" }),
  raison: text("raison").notNull(),
  ancienEngagement: date("ancien_engagement").notNull(),
  nouvelEngagement: date("nouvel_engagement").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("report_raison_obligatoire", sql`length(btrim(${t.raison})) > 0`),
  index("report_par_tache").on(t.tacheId, t.createdAt),
]);

/* ------------------------------------------------------------------ les Relances */

/**
 * Une heure à laquelle un Membre veut être relancé. La nature (Point du matin, Rappel,
 * Bilan) **n'est pas stockée** : elle se déduit de la position dans la journée.
 *
 * Le minimum de trois Créneaux n'est pas une contrainte de ligne — c'est un invariant de
 * table, qui exigerait un trigger. Il est tenu par l'API (BRU-23), délibérément.
 */
export const creneau = pgTable("creneau", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id").notNull().references(() => space.id, { onDelete: "cascade" }),
  membreId: uuid("membre_id").notNull().references(() => membre.id, { onDelete: "cascade" }),
  heure: time("heure").notNull(),
}, (t) => [
  unique("creneau_unique").on(t.membreId, t.heure),
  /** Au quart d'heure près, comme les Réglages le promettent. */
  check("creneau_quart_heure", sql`extract(minute from ${t.heure}) IN (0, 15, 30, 45)
                                   AND extract(second from ${t.heure}) = 0`),
]);

/* ------------------------------------------------------------------ la Récurrence */

/**
 * Une règle qui fabrique des Tâches. Elle peut en fabriquer plusieurs d'un coup, avec des
 * Engagements échelonnés : « chaque lundi, Post LinkedIn en 3 occurrences, décalées de
 * 0, 2 et 4 jours » donne 1/3 lundi, 2/3 mercredi, 3/3 vendredi.
 *
 * Les Tâches nées d'une règle sont **des Tâches ordinaires** : `tache.recurrence_id` n'est
 * qu'une trace, sans clé étrangère et sans effet. Les Reporter ou les Abandonner n'affecte
 * ni la règle ni les occurrences futures (règle 20).
 */
export const recurrence = pgTable("recurrence", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id").notNull().references(() => space.id, { onDelete: "cascade" }),
  titre: text("titre").notNull(),
  /** Obligatoire : les Tâches générées entrent Sur le feu, donc l'invariant 2 s'applique. */
  assigneId: uuid("assigne_id").notNull().references(() => membre.id),
  frequence: frequenceEnum("frequence").notNull(),
  /** 1 = lundi … 7 = dimanche, pour une règle hebdomadaire. */
  jourSemaine: smallint("jour_semaine"),
  /** 1–28, pour une règle mensuelle. Volontairement pas 29-31 : pas de mois bancals. */
  jourMois: smallint("jour_mois"),
  occurrences: smallint("occurrences").notNull().default(1),
  /** Décalage en jours de chaque occurrence, ex. {0,2,4}. Même longueur qu'`occurrences`. */
  decalages: smallint("decalages").array().notNull(),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("recurrence_frequence_coherente", sql`
    (${t.frequence} = 'hebdomadaire' AND ${t.jourSemaine} BETWEEN 1 AND 7 AND ${t.jourMois} IS NULL)
 OR (${t.frequence} = 'mensuelle'    AND ${t.jourMois} BETWEEN 1 AND 28 AND ${t.jourSemaine} IS NULL)`),
  check("recurrence_occurrences", sql`${t.occurrences} BETWEEN 1 AND 12`),
  check("recurrence_decalages_alignes",
    sql`array_length(${t.decalages}, 1) = ${t.occurrences} AND ${t.decalages}[1] = 0`),
]);
