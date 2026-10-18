/**
 * Les huit outils du MCP. Chacun appelle une fonction métier déjà scopée par
 * `{ spaceId, membreId }` — jamais de SQL ici. Les invariants (Sur le feu, raison,
 * Report) restent ceux de `taches.ts` et de Postgres.
 */
import type { McpServer } from "@modelcontextprotocol/server";
import { ZodError, z } from "zod";
import * as C from "@/api/contrat";
import { ErreurApi } from "@/api/erreurs";
import type { Ctx } from "@/api/membre-courant";
import { lister as listerMembres } from "@/api/membres";
import * as T from "@/api/taches";
import { journaliserAppel } from "./journaliser";

const uuid = z.string().uuid();

/** Terminer, abandonner, rouvrir, ou un Statut de Sur le feu. `bloque` exige une raison. */
export const EntreeStatut = z.discriminatedUnion("action", [
  z.object({ id: uuid, action: z.literal("a_faire") }),
  z.object({ id: uuid, action: z.literal("en_cours") }),
  z.object({
    id: uuid,
    action: z.literal("bloque"),
    raison: z.string().trim().min(1, "Bloqué, oui — mais pourquoi ? La raison est obligatoire."),
    dependDeId: uuid.nullish(),
  }),
  z.object({ id: uuid, action: z.literal("terminer") }),
  z.object({ id: uuid, action: z.literal("abandonner") }),
  z.object({ id: uuid, action: z.literal("rouvrir") }),
]);

export const EntreeDeplacer = z.intersection(z.object({ id: uuid }), C.DeplacerTache);
export const EntreeModifier = C.ModifierTache.extend({ id: uuid });
export const EntreeReporter = C.Reporter.extend({ id: uuid });
const EntreeId = z.object({ id: uuid });

type Annotations = { readOnlyHint?: boolean; destructiveHint?: boolean };

export type Outil = {
  nom: string;
  description: string;
  schema: z.ZodType;
  annotations?: Annotations;
  executer: (ctx: Ctx, entree: unknown) => Promise<unknown>;
};

async function statut(ctx: Ctx, entree: unknown) {
  const e = EntreeStatut.parse(entree);
  if (e.action === "terminer") return T.terminer(ctx, e.id);
  if (e.action === "abandonner") return T.abandonner(ctx, e.id);
  if (e.action === "rouvrir") return T.rouvrir(ctx, e.id);
  if (e.action === "bloque") {
    return T.changerStatut(ctx, e.id, { statut: "bloque", raison: e.raison, dependDeId: e.dependDeId });
  }
  return T.changerStatut(ctx, e.id, { statut: e.action });
}

export const OUTILS: Outil[] = [
  {
    nom: "list_tasks",
    description: "Lister les Tâches de l'Espace du jeton. Par défaut, seulement les Tâches vivantes — ni Terminées ni Abandonnées. Filtres : bucket (a_trier, sur_le_feu, a_venir, idees), assigneId (UUID d'un Membre, voir list_members), q (texte dans le titre ou les notes), inclureTerminees.",
    schema: C.FiltresTaches,
    annotations: { readOnlyHint: true },
    executer: (ctx, entree) => T.lister(ctx, C.FiltresTaches.parse(entree)),
  },
  {
    nom: "get_task",
    description: "Lire une Tâche : titre, notes, bucket, statut, Assigné, Aidants, Engagement, nombre de Reports, raison de blocage et dépendance. L'identifiant est un UUID.",
    schema: EntreeId,
    annotations: { readOnlyHint: true },
    executer: (ctx, entree) => T.obtenir(ctx, EntreeId.parse(entree).id),
  },
  {
    nom: "create_task",
    description: "Capturer une Tâche. Elle naît dans À trier (défaut), À venir ou Idées — jamais directement dans Sur le feu. Pour l'y mettre, enchaîner avec move_task, qui exige un Engagement (et un Assigné ; sans assigneId, c'est le Membre du jeton).",
    schema: C.CreerTache,
    annotations: { destructiveHint: false },
    executer: (ctx, entree) => T.creer(ctx, C.CreerTache.parse(entree)),
  },
  {
    nom: "update_task",
    description: "Modifier le titre, les notes, l'Assigné, les Aidants, la raison de blocage ou la dépendance. Sur le feu, changer l'Engagement est refusé : c'est postpone_task, avec une raison.",
    schema: EntreeModifier,
    annotations: { destructiveHint: false },
    executer: (ctx, entree) => {
      const { id, ...patch } = EntreeModifier.parse(entree);
      return T.modifier(ctx, id, patch);
    },
  },
  {
    nom: "move_task",
    description: "Changer de Bucket. Vers sur_le_feu, l'Engagement est obligatoire et le Statut aussi (a_faire par défaut). Sans assigneId, la Tâche est assignée au Membre du jeton : celui qui porte le jeton se désigne lui-même. Entrer Bloqué exige une raison. Sortir de Sur le feu conserve l'Assigné et l'Engagement.",
    schema: EntreeDeplacer,
    annotations: { destructiveHint: false },
    executer: (ctx, entree) => {
      const { id, ...cible } = EntreeDeplacer.parse(entree);
      return T.deplacer(ctx, id, cible);
    },
  },
  {
    nom: "set_task_status",
    description: "Changer l'état d'une Tâche. Sur le feu : action a_faire, en_cours ou bloque — bloque exige une raison. Ou terminer, abandonner, rouvrir. Terminer et Abandonner laissent une trace datée : ce n'est pas une suppression, et aucun outil ne supprime.",
    schema: EntreeStatut,
    annotations: { destructiveHint: true },
    executer: statut,
  },
  {
    nom: "postpone_task",
    description: "Reporter l'Engagement. La raison est obligatoire, et c'est le seul chemin qui déplace un Engagement déjà posé Sur le feu. nouvelEngagement est un jour, AAAA-MM-JJ.",
    schema: EntreeReporter,
    annotations: { destructiveHint: false },
    executer: (ctx, entree) => {
      const { id, ...report } = EntreeReporter.parse(entree);
      return T.reporter(ctx, id, report);
    },
  },
  {
    nom: "list_members",
    description: "Les Membres actifs de l'Espace : id et nom. Les autres outils prennent des UUID ; un prénom se résout ici.",
    schema: z.object({}),
    annotations: { readOnlyHint: true },
    executer: async (ctx) => (await listerMembres(ctx)).map(({ id, nom }) => ({ id, nom })),
  },
];

const parNom = new Map(OUTILS.map((o) => [o.nom, o]));

function enErreur(e: unknown) {
  if (e instanceof ErreurApi) {
    return { isError: true as const, content: [{ type: "text" as const, text: e.message }] };
  }
  if (e instanceof ZodError) {
    const message = e.issues.map((i) => i.message).join(" ") || "Requête invalide.";
    return { isError: true as const, content: [{ type: "text" as const, text: message }] };
  }
  console.error(e);
  return { isError: true as const, content: [{ type: "text" as const, text: "Erreur interne." }] };
}

/** Branche les outils sur le serveur MCP de cette requête, au nom de `ctx`. */
export function enregistrer(server: McpServer, ctx: Ctx) {
  for (const outil of OUTILS) {
    server.registerTool(outil.nom, {
      description: outil.description,
      inputSchema: outil.schema,
      annotations: outil.annotations,
    }, async (entree) => {
      journaliserAppel(ctx, outil.nom);
      try {
        const resultat = await outil.executer(ctx, entree);
        return { content: [{ type: "text" as const, text: JSON.stringify(resultat) }] };
      } catch (e) {
        return enErreur(e);
      }
    });
  }
}

/** Le même chemin que l'outil, sans le transport HTTP — pour les tests. */
export async function appeler(nom: string, ctx: Ctx, entree: unknown) {
  const outil = parNom.get(nom);
  if (!outil) throw new ErreurApi("introuvable", 404, `Outil ${nom} introuvable.`);
  journaliserAppel(ctx, outil.nom);
  return outil.executer(ctx, outil.schema.parse(entree));
}
