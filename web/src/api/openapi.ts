/**
 * Le document OpenAPI, **dérivé des schémas que les routes utilisent réellement**.
 *
 * L'ADR 0001 met en garde : un contrat écrit après coup ne sert à rien. Ici il ne peut pas
 * mentir — les formes viennent de `contrat.ts`, c'est-à-dire de la validation elle-même.
 * Le client Swift se génère à partir de ce document (BRU-6 et suivants).
 */
import { z } from "zod";
import * as C from "./contrat";

const composants = {
  Tache: C.Tache, CreerTache: C.CreerTache, ModifierTache: C.ModifierTache,
  DeplacerTache: C.DeplacerTache, ChangerStatut: C.ChangerStatut,
  Reordonner: C.Reordonner, Reporter: C.Reporter,
  Creneau: C.Creneau, PoserCreneau: C.PoserCreneau,
  Affectation: C.Affectation, AjouterAffectation: C.AjouterAffectation, ActiverAffectation: C.ActiverAffectation,
  AbonnerAppareil: C.AbonnerAppareil, AbonnerIphone: C.AbonnerIphone, Battre: C.Battre,
  Sur: C.Sur, AffectationsMembre: C.AffectationsMembre, PoserAffectation: C.PoserAffectation,
  Recurrence: C.Recurrence, PoserRecurrence: C.PoserRecurrence, ModifierMoi: C.ModifierMoi,
  Sujet: C.Sujet, PoserSujet: C.PoserSujet, ModifierSujet: C.ModifierSujet, FiltreSujets: C.FiltreSujets,
} as const;

const ref = (nom: keyof typeof composants) => ({ $ref: `#/components/schemas/${nom}` });
const corps = (nom: keyof typeof composants) => ({
  required: true,
  content: { "application/json": { schema: ref(nom) } },
});
const tache = { description: "La Tâche", content: { "application/json": { schema: ref("Tache") } } };
const idTache = {
  name: "id", in: "path", required: true,
  schema: { type: "string", format: "uuid" },
};

export function documentOpenApi() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Bruno",
      version: "1.0.0",
      description:
        "L'API de la to-do de The Vibe Company. Le vocabulaire est celui de CONTEXT.md. " +
        "Une Tâche ne peut pas entrer dans Sur le feu sans un Assigné et un Engagement : " +
        "c'est refusé ici, et la base le refuse aussi.",
    },
    paths: {
      "/api/taches": {
        get: {
          summary: "Lister les Tâches",
          parameters: Object.entries(z.toJSONSchema(C.FiltresTaches).properties ?? {}).map(
            ([nom, schema]) => ({ name: nom, in: "query", schema }),
          ),
          responses: { 200: { description: "Les Tâches, par Rang croissant",
            content: { "application/json": { schema: { type: "array", items: ref("Tache") } } } } },
        },
        post: {
          summary: "Capturer une Tâche",
          description: "Atterrit dans À trier. Une Capture ne pose jamais Sur le feu.",
          requestBody: corps("CreerTache"),
          responses: { 200: tache },
        },
      },
      "/api/taches/{id}": {
        parameters: [idTache],
        get: { summary: "Lire une Tâche", responses: { 200: tache, 404: { description: "Introuvable" } } },
        patch: { summary: "Modifier une Tâche", requestBody: corps("ModifierTache"), responses: { 200: tache } },
        delete: {
          summary: "Supprimer une Tâche",
          description: "Efface pour de bon. Réservé à ce qui n'aurait jamais dû exister — sinon, Abandonner.",
          responses: { 204: { description: "Supprimée" } },
        },
      },
      "/api/taches/{id}/bucket": {
        parameters: [idTache],
        post: {
          summary: "Changer de Bucket",
          description:
            "Vers `sur_le_feu`, l'Assigné et l'Engagement sont exigés : c'est le droit d'entrée, " +
            "la seule règle dure de Bruno. Sortir de Sur le feu conserve les deux.",
          requestBody: corps("DeplacerTache"),
          responses: { 200: tache, 422: { description: "Droit d'entrée non satisfait" } },
        },
      },
      "/api/taches/{id}/statut": {
        parameters: [idTache],
        post: { summary: "Changer de Statut", requestBody: corps("ChangerStatut"), responses: { 200: tache } },
      },
      "/api/taches/{id}/rang": {
        parameters: [idTache],
        post: {
          summary: "Réordonner",
          description: "Se placer entre deux voisines. Le serveur calcule le Rang.",
          requestBody: corps("Reordonner"),
          responses: { 200: tache },
        },
      },
      "/api/taches/{id}/terminer": {
        parameters: [idTache],
        post: { summary: "Terminer", responses: { 200: tache, 409: { description: "A déjà une fin" } } },
      },
      "/api/taches/{id}/abandonner": {
        parameters: [idTache],
        post: {
          summary: "Abandonner",
          description: "On a décidé de ne pas le faire. C'est une décision, elle reste consultable.",
          responses: { 200: tache, 409: { description: "A déjà une fin" } },
        },
      },
      "/api/taches/{id}/reporter": {
        parameters: [idTache],
        post: {
          summary: "Reporter",
          description:
            "Le seul chemin qui déplace un Engagement, et il exige une raison. " +
            "Incrémente le compteur et laisse une trace.",
          requestBody: corps("Reporter"),
          responses: { 200: tache, 422: { description: "Raison manquante" } },
        },
      },
      "/api/creneaux": {
        get: { summary: "Mes Créneaux", description: "Dans l'ordre de la journée, avec leur nature — déduite de la position, jamais choisie.",
          responses: { 200: { description: "Les Créneaux", content: { "application/json": { schema: { type: "array", items: ref("Creneau") } } } } } },
        post: { summary: "Ajouter un Créneau", requestBody: corps("PoserCreneau"), responses: { 200: { description: "Les Créneaux" }, 422: { description: "Pas au quart d'heure, ou déjà pris" } } },
      },
      "/api/creneaux/{id}": {
        parameters: [idTache],
        patch: { summary: "Déplacer un Créneau", description: "Les natures sont recalculées.", requestBody: corps("PoserCreneau"), responses: { 200: { description: "Les Créneaux" } } },
        delete: { summary: "Retirer un Créneau", description: "Refusé sous trois : le Point du matin, au moins un Rappel, le Bilan.", responses: { 200: { description: "Les Créneaux" }, 422: { description: "Minimum de trois" } } },
      },
      "/api/membres": {
        get: { summary: "Les Membres actifs", responses: { 200: { description: "id et nom", content: { "application/json": { schema: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, nom: { type: "string" } } } } } } } } },
      },
      "/api/affectations": {
        get: { summary: "Les Affectations", description: "Ce à quoi on peut travailler, désactivées comprises.",
          responses: { 200: { description: "La liste", content: { "application/json": { schema: { type: "array", items: ref("Affectation") } } } } } },
        post: { summary: "Ajouter une Affectation", requestBody: corps("AjouterAffectation"), responses: { 200: { description: "La liste" }, 422: { description: "Nom déjà pris" } } },
      },
      "/api/affectations/en-cours": {
        get: { summary: "Qui est sur quoi", description: "Chaque Membre actif avec ses Affectations du moment.",
          responses: { 200: { description: "Par Membre", content: { "application/json": { schema: { type: "array", items: ref("AffectationsMembre") } } } } } },
        post: { summary: "« Aujourd'hui je suis sur MONKA »", description: "Continue, plusieurs à la fois sans limite. Sans membreId c'est moi, sans debut c'est aujourd'hui. Déjà dessus : rien ne double.",
          requestBody: corps("PoserAffectation"), responses: { 200: { description: "Qui est sur quoi, à jour" }, 422: { description: "Affectation désactivée" } } },
      },
      "/api/affectations/en-cours/{id}/fin": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        post: { summary: "« Je ne suis plus dessus »", description: "L'unique action : la fin se pose au jour même. L'historique reste.", responses: { 200: { description: "Qui est sur quoi, à jour" } } },
      },
      "/api/affectations/historique": {
        get: { summary: "« Hier j'étais sur MONKA »", description: "Tout, fini compris, du plus récent au plus ancien.",
          parameters: [{ name: "membreId", in: "query", schema: { type: "string", format: "uuid" } }],
          responses: { 200: { description: "L'historique", content: { "application/json": { schema: { type: "array", items: ref("Sur") } } } } } },
      },
      "/api/affectations/{id}": {
        parameters: [idTache],
        patch: { summary: "Désactiver ou réactiver", description: "Le geste normal : l'historique ne doit pas se trouer.", requestBody: corps("ActiverAffectation"), responses: { 200: { description: "La liste" } } },
        delete: { summary: "Supprimer", description: "Définitif : les périodes qui la nomment partent avec. Pour l'enlever sans trouer l'historique, désactivez-la (PATCH).", responses: { 200: { description: "La liste" } } },
      },
      "/api/direct": {
        get: { summary: "Le direct", description: "Un flux qui reste ouvert (SSE). Le serveur envoie l'état — empreinte et présents — dès qu'il change, et se referme au bout de quatre minutes : le navigateur rouvre seul.", responses: { 200: { description: "text/event-stream" } } },
      },
      "/api/membres/{id}/avatar": {
        parameters: [idTache],
        get: { summary: "La photo d'un Membre", description: "L'image elle-même, pour les pages web : elles donnent son adresse au lieu de recopier la photo dans chaque carte. L'adresse porte une empreinte (?v=), la réponse se garde indéfiniment.", responses: { 200: { description: "image/jpeg, image/png ou image/webp" }, 404: { description: "Pas de photo" } } },
      },
      "/api/pouls": {
        post: { summary: "Je suis là", description: "Dit où l'on regarde, et rapporte qui d'autre est là plus une empreinte de ce qui est affiché : si elle change, la page se redemande.", requestBody: corps("Battre"), responses: { 200: { description: "Les présents et l'empreinte" } } },
      },
      "/api/push/abonnements": {
        get: { summary: "Mes appareils abonnés", description: "Ceux qui recevront mes Relances en notification.", responses: { 200: { description: "Les appareils" } } },
        post: { summary: "Abonner cet appareil", description: "Ce que le navigateur donne quand on accepte. Le même endpoint remplace, il ne s'ajoute pas.", requestBody: corps("AbonnerAppareil"), responses: { 200: { description: "Les appareils" } } },
      },
      "/api/push/abonnements/{id}": {
        parameters: [idTache],
        delete: { summary: "Ne plus rien recevoir sur cet appareil", responses: { 200: { description: "Les appareils restants" } } },
      },
      "/api/push/iphone": {
        post: { summary: "Abonner l'iPhone", description: "Le jeton APNs de l'app. Renvoyé à chaque lancement : Apple le change quand il veut.", requestBody: corps("AbonnerIphone"), responses: { 200: { description: "Les appareils" } } },
      },
      "/api/push/essai": {
        post: { summary: "Envoyer un essai", description: "La même notification qu'une Relance, tout de suite, à moi seul. Rien n'est tracé : on peut recommencer.", responses: { 200: { description: "Combien sont parties" }, 422: { description: "Aucun appareil abonné" } } },
      },
      "/api/recurrences": {
        get: { summary: "Les Récurrences", responses: { 200: { description: "Les règles", content: { "application/json": { schema: { type: "array", items: ref("Recurrence") } } } } } },
        post: { summary: "Créer une règle", description: "Assigné obligatoire : ses Tâches entrent Sur le feu. decalages = {0, 2, 4} pour lundi, mercredi, vendredi.", requestBody: corps("PoserRecurrence"), responses: { 200: { description: "La règle" } } },
      },
      "/api/recurrences/{id}": {
        parameters: [idTache],
        get: { summary: "Une règle", responses: { 200: { description: "La règle", content: { "application/json": { schema: ref("Recurrence") } } } } },
        put: { summary: "Modifier une règle", description: "Sans effet sur les Tâches déjà fabriquées (règle 20).", requestBody: corps("PoserRecurrence"), responses: { 200: { description: "La règle" } } },
        delete: { summary: "Supprimer une règle", description: "Les Tâches nées de la règle restent.", responses: { 204: { description: "Supprimée" } } },
      },
      "/api/projets": {
        get: { summary: "Les Projets", description: "Exactement une Affectation, sur un autre axe : même objet, même mécanique.", responses: { 200: { description: "Les Projets", content: { "application/json": { schema: { type: "array", items: ref("Affectation") } } } } } },
        post: { summary: "Ajouter un Projet", requestBody: corps("AjouterAffectation"), responses: { 200: { description: "Les Projets" } } },
      },
      "/api/projets/{id}": {
        parameters: [idTache],
        patch: { summary: "Désactiver ou réactiver un Projet", requestBody: corps("ActiverAffectation"), responses: { 200: { description: "Les Projets" } } },
        delete: { summary: "Supprimer un Projet", description: "Définitif : les périodes qui le nomment partent avec. Sinon, désactivez-le (PATCH).", responses: { 200: { description: "Les Projets" } } },
      },
      "/api/projets/en-cours": {
        get: { summary: "Qui est sur quel Projet", responses: { 200: { description: "Par Membre", content: { "application/json": { schema: { type: "array", items: ref("AffectationsMembre") } } } } } },
        post: { summary: "Se poser sur un Projet", requestBody: corps("PoserAffectation"), responses: { 200: { description: "Par Membre" } } },
      },
      "/api/projets/en-cours/{id}/fin": {
        parameters: [idTache],
        post: { summary: "Ne plus être sur ce Projet", description: "La fin se pose au jour même, l'histoire reste.", responses: { 200: { description: "Par Membre" } } },
      },
      "/api/projets/historique": {
        get: { summary: "Les Projets d'un Membre, fini compris", parameters: [{ name: "membreId", in: "query", schema: { type: "string", format: "uuid" } }], responses: { 200: { description: "Du plus récent au plus ancien", content: { "application/json": { schema: { type: "array", items: ref("Sur") } } } } } },
      },
      "/api/sujets": {
        get: {
          summary: "Les Sujets d'une semaine",
          description: "Ce dont on parle au Weekly, rangé en trois encarts : skills, projects, wins. Rien à cocher : la semaine suivante repart d'une page blanche.",
          parameters: [{ name: "lundi", in: "query", required: true, schema: { type: "string", format: "date" } }],
          responses: { 200: { description: "Les Sujets", content: { "application/json": { schema: { type: "array", items: ref("Sujet") } } } } },
        },
        post: {
          summary: "Poser un Sujet",
          description: "Sur sa liste ou celle d'un autre — c'est une réunion, pas un dossier personnel.",
          requestBody: corps("PoserSujet"),
          responses: { 200: { description: "Le Sujet", content: { "application/json": { schema: ref("Sujet") } } } },
        },
      },
      "/api/sujets/{id}": {
        parameters: [idTache],
        patch: { summary: "Changer à qui il est, ou ce qu'il dit", requestBody: corps("ModifierSujet"), responses: { 200: { description: "Le Sujet", content: { "application/json": { schema: ref("Sujet") } } } } },
        delete: { summary: "Retirer un Sujet", responses: { 204: { description: "Retiré" } } },
      },
      "/api/taches/{id}/rouvrir": {
        parameters: [idTache],
        post: { summary: "Rouvrir une Tâche finie", description: "Un Terminé ou un Abandonné de trop : la fin s'efface, Bucket, Statut et Engagement sont restés.", responses: { 200: { description: "La Tâche, rouverte" }, 409: { description: "Pas de fin à annuler" } } },
      },
      "/api/taches/{id}/reports": {
        parameters: [idTache],
        get: { summary: "L'historique des Reports", responses: { 200: { description: "Les Reports, du plus récent au plus ancien" } } },
      },
    },
    components: {
      schemas: Object.fromEntries(
        Object.entries(composants).map(([nom, schema]) => [nom, z.toJSONSchema(schema, { io: "input" })]),
      ),
    },
  };
}
