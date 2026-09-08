/**
 * L'Enrichissement — BRU-9. Après la Capture, jamais avant : un titre propre, et l'Assigné ou
 * l'Engagement **uniquement s'ils sont énoncés** (règle 4 : il ne devine jamais). « Urgent »
 * fait remonter en tête d'À trier, rien de plus. Il ne pose jamais Sur le feu (règle 2).
 *
 * Tout ce qui parle au modèle est ici, en pur : on donne le texte, on obtient une lecture.
 */
import { z } from "zod";

export interface Modele { completer(consigne: string, texte: string): Promise<string>; }

export type Entree = { texte: string; membres: { id: string; nom: string }[]; aujourdhui: string; jourSemaine: string };
export type Lecture = { titre: string; assigneId: string | null; engagement: string | null; urgent: boolean };

const Reponse = z.object({
  titre: z.string().trim().min(1).max(200),
  assigne: z.string().nullable().default(null),
  engagement: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  urgent: z.boolean().default(false),
});

export function consigne(e: Entree): string {
  return [
    "Tu nettoies une capture vocale ou écrite pour une to-do d'équipe. Réponds uniquement par un objet JSON, sans commentaire.",
    "Champs : titre (une ligne courte, à l'infinitif, sans ponctuation finale, en français),",
    "assigne (le prénom exact d'un membre, seulement s'il est nommé explicitement comme la personne qui doit le faire ; sinon null),",
    "engagement (la date AAAA-MM-JJ, seulement si un jour est énoncé explicitement — « demain », « vendredi », « le 20 » ; sinon null),",
    "urgent (true seulement si le mot « urgent » est dit).",
    "Règle absolue : ne devine jamais. Si ce n'est pas dit, c'est null.",
    `Aujourd'hui : ${e.jourSemaine} ${e.aujourdhui}. Membres : ${e.membres.map((m) => m.nom).join(", ") || "aucun"}.`,
  ].join("\n");
}

/** Lit la réponse du modèle. Un prénom inconnu, une date mal formée : on ne retient rien — jamais une supposition. */
export function lire(brut: string, e: Entree): Lecture | null {
  const json = brut.slice(brut.indexOf("{"), brut.lastIndexOf("}") + 1);
  const r = Reponse.safeParse(JSON.parse(json));
  if (!r.success) return null;
  const membre = r.data.assigne ? e.membres.find((m) => m.nom.localeCompare(r.data.assigne!, "fr", { sensitivity: "base" }) === 0) : undefined;
  return { titre: r.data.titre, assigneId: membre?.id ?? null, engagement: r.data.engagement, urgent: r.data.urgent };
}

export async function analyser(modele: Modele, e: Entree): Promise<Lecture | null> {
  try { return lire(await modele.completer(consigne(e), e.texte), e); }
  catch { return null; }
}
