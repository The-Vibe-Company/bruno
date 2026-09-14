/**
 * Le contrat de l'API — et sa seule source de vérité.
 *
 * L'ADR 0001 prévoit un contrat OpenAPI dont sont dérivés le client Swift et les types du web,
 * en prévenant qu'un fichier écrit après coup ne sert à rien. D'où ce choix : les schémas
 * ci-dessous sont **ceux que les routes utilisent pour valider** les requêtes. L'OpenAPI est
 * produit à partir d'eux (`/api/openapi.json`), donc il ne peut pas mentir sur ce que
 * l'API accepte réellement.
 */
import { z } from "zod";

export const Bucket = z.enum(["a_trier", "sur_le_feu", "a_venir", "idees"]);
export const Statut = z.enum(["a_faire", "en_cours", "bloque"]);
export const EtatTerminal = z.enum(["termine", "abandonne"]);

const uuid = z.string().uuid();
/** Une date simple, sans heure ni fuseau : un Engagement est un jour, pas un instant. */
const jour = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Attendu : AAAA-MM-JJ");

export const Tache = z.object({
  id: uuid,
  titre: z.string(),
  notes: z.string().nullable(),
  transcriptionBrute: z.string().nullable(),
  bucket: Bucket,
  statut: Statut.nullable(),
  rang: z.string(),
  assigneId: uuid.nullable(),
  aidantIds: z.array(uuid),
  engagement: jour.nullable(),
  reportsCount: z.number().int(),
  raisonBlocage: z.string().nullable(),
  etatTerminal: EtatTerminal.nullable(),
  createdAt: z.string(),
});
export type Tache = z.infer<typeof Tache>;

/** Une Capture n'a besoin que d'un titre : tout le reste se décide au tri (règle 2). */
export const CreerTache = z.object({
  titre: z.string().trim().min(1, "Le titre ne peut pas être vide"),
  notes: z.string().optional(),
  transcriptionBrute: z.string().optional(),
  /** Par défaut `a_trier` : une Capture n'atterrit jamais ailleurs. */
  bucket: Bucket.exclude(["sur_le_feu"]).default("a_trier"),
  assigneId: uuid.nullish(),
  engagement: jour.nullish(),
});

export const ModifierTache = z.object({
  titre: z.string().trim().min(1).optional(),
  notes: z.string().nullish(),
  assigneId: uuid.nullish(),
  engagement: jour.nullish(),
  aidantIds: z.array(uuid).optional(),
  /** Changer la raison d'une Tâche déjà Bloquée. Ailleurs, refusé. */
  raisonBlocage: z.string().trim().min(1).optional(),
});

/**
 * Changer de Bucket. Vers `sur_le_feu`, l'Assigné et l'Engagement sont exigés dès la
 * validation — on refuse la requête avant même d'atteindre la base, avec un message clair.
 * La contrainte Postgres reste le dernier rempart : elle attrape tout ce qui passerait à côté.
 */
export const DeplacerTache = z.discriminatedUnion("bucket", [
  z.object({
    bucket: z.literal("sur_le_feu"),
    assigneId: uuid,
    engagement: jour,
    statut: Statut.default("a_faire"),
    raison: z.string().trim().min(1).optional(),
  }).refine((d) => d.statut !== "bloque" || !!d.raison, { message: "Bloqué, oui — mais pourquoi ? La raison est obligatoire.", path: ["raison"] }),
  z.object({ bucket: z.literal("a_trier") }),
  z.object({ bucket: z.literal("a_venir"), engagement: jour.nullish() }),
  z.object({ bucket: z.literal("idees") }),
]);

/** Bloquer exige une raison — c'est elle qui rend le blocage lisible sur la carte. */
export const ChangerStatut = z.discriminatedUnion("statut", [
  z.object({ statut: z.literal("bloque"), raison: z.string().trim().min(1, "Bloqué, oui — mais pourquoi ? La raison est obligatoire.") }),
  z.object({ statut: z.enum(["a_faire", "en_cours"]) }),
]);

/** Réordonner, c'est se placer entre deux voisines. Le serveur calcule le rang. */
export const Reordonner = z.object({
  avantId: uuid.nullish(),
  apresId: uuid.nullish(),
});

export const Reporter = z.object({
  raison: z.string().trim().min(1, "Un Report est toujours motivé"),
  nouvelEngagement: jour,
});

export const FiltresTaches = z.object({
  bucket: Bucket.optional(),
  assigneId: uuid.optional(),
  /** Recherche texte simple sur le titre et les notes. Rien d'autre — pas de tags. */
  q: z.string().trim().min(1).optional(),
  /** Par défaut on ne renvoie que les Tâches vivantes : le board ne montre pas les fins. */
  inclureTerminees: z.coerce.boolean().default(false),
});

/* ------------------------------------------------------------------ les Créneaux */

/** Une heure au quart d'heure : « 09:15 ». Il n'y a rien d'autre à régler. */
export const Heure = z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, "Une heure au quart d'heure, comme 09:15");
export const Creneau = z.object({
  id: uuid, heure: Heure,
  /** Déduite de la position dans la journée, jamais choisie. */
  nature: z.enum(["point_du_matin", "rappel", "bilan"]),
});
export const PoserCreneau = z.object({ heure: Heure });

/* ------------------------------------------------------------------ moi */

/** Une photo de profil : une petite image en data URL, ou rien. */
export const ModifierMoi = z.object({
  avatar: z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Une image, en data URL").max(200_000, "Trop lourde : 160 px suffisent").nullable(),
});

/* ------------------------------------------------------------------ les Affectations */

export const Affectation = z.object({ id: uuid, nom: z.string(), couleur: z.string(), actif: z.boolean() });
export const AjouterAffectation = z.object({
  nom: z.string().trim().min(1, "Un nom").max(40),
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Une couleur, comme #F27313"),
});
export const ActiverAffectation = z.object({ actif: z.boolean() });

export const Sur = z.object({ id: uuid, affectationId: uuid, nom: z.string(), couleur: z.string(), depuis: jour, jusqu: jour.nullable() });
export const AffectationsMembre = z.object({ membreId: uuid, nom: z.string(), affectations: z.array(Sur) });
/** « Aujourd'hui je suis sur MONKA. » Sans `membreId`, c'est moi. Sans `debut`, c'est aujourd'hui. */
export const PoserAffectation = z.object({ affectationId: uuid, membreId: uuid.optional(), debut: jour.optional() });
export const FiltreHistorique = z.object({ membreId: uuid.optional() });

/* ------------------------------------------------------------------ les Récurrences */

export const Frequence = z.enum(["hebdomadaire", "mensuelle"]);
export const Recurrence = z.object({
  id: uuid, titre: z.string(), assigneId: uuid, frequence: Frequence,
  jourSemaine: z.number().int().min(1).max(7).nullable(), jourMois: z.number().int().min(1).max(28).nullable(),
  occurrences: z.number().int(), decalages: z.array(z.number().int()), actif: z.boolean(),
});
/**
 * Une règle. L'Assigné est obligatoire (règle 21). `decalages` : le décalage en jours de chaque
 * occurrence — {0, 2, 4} pour lundi, mercredi, vendredi — le premier vaut toujours 0.
 */
export const PoserRecurrence = z.object({
  titre: z.string().trim().min(1, "Un titre").max(200),
  assigneId: uuid,
  frequence: Frequence,
  jourSemaine: z.number().int().min(1).max(7).optional(),
  jourMois: z.number().int().min(1, "Entre 1 et 28").max(28, "Entre 1 et 28 : pas de mois bancals").optional(),
  decalages: z.array(z.number().int().min(0).max(366)).min(1).max(12)
    .refine((d) => d[0] === 0, "La première occurrence tombe le jour même")
    .refine((d) => d.every((x, i) => i === 0 || x > d[i - 1]), "Les Engagements s'échelonnent dans l'ordre"),
});

/* ------------------------------------------------------------------ le Weekly */

export const Sujet = z.object({
  id: uuid,
  lundi: jour,
  membreId: uuid,
  texte: z.string(),
  auteur: z.string().nullable(),
  createdAt: z.string(),
});

export const FiltreSujets = z.object({ lundi: jour });
export const PoserSujet = z.object({
  lundi: jour,
  membreId: uuid,
  texte: z.string().trim().min(1, "Un Sujet sans texte n'en est pas un").max(500),
});

