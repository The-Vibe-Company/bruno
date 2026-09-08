/**
 * Les erreurs de l'API de Bruno.
 *
 * Une règle qui vient de la base (un `CHECK` violé) doit ressortir comme un refus lisible,
 * pas comme un 500. C'est particulièrement vrai pour l'invariant 2 : quand quelqu'un tente
 * de mettre une Tâche Sur le feu sans Assigné, il doit savoir *pourquoi*.
 */
export type CodeErreur =
  | "introuvable"
  | "requete_invalide"
  | "droit_entree_sur_le_feu"
  | "statut_hors_sur_le_feu"
  | "raison_obligatoire"
  | "engagement_par_report"
  | "minimum_creneaux"
  | "deja_terminee"
  | "affectation_desactivee"
  | "non_authentifie";

export class ErreurApi extends Error {
  constructor(
    readonly code: CodeErreur,
    readonly statut: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const introuvable = (quoi = "Tâche") =>
  new ErreurApi("introuvable", 404, `${quoi} introuvable.`);

/**
 * Traduit une violation de contrainte Postgres en refus explicite. La base reste la source
 * de vérité — l'API ne fait que rendre son verdict compréhensible.
 *
 * Drizzle enveloppe les erreurs du pilote dans un `DrizzleQueryError` : le nom de la
 * contrainte n'est pas en surface mais plus bas dans la chaîne des `cause`. On la remonte.
 */
function nomContrainte(e: unknown): string | undefined {
  for (let cur = e, i = 0; cur && i < 5; cur = (cur as { cause?: unknown }).cause, i++) {
    const n = (cur as { constraint_name?: string }).constraint_name;
    if (n) return n;
  }
  return undefined;
}

export function depuisPostgres(e: unknown): ErreurApi | null {
  const contrainte = nomContrainte(e);
  switch (contrainte) {
    case "tache_droit_entree_sur_le_feu":
      return new ErreurApi("droit_entree_sur_le_feu", 422,
        "Une Tâche ne peut pas entrer dans Sur le feu sans un Assigné et un Engagement.");
    case "tache_statut_sur_le_feu":
      return new ErreurApi("statut_hors_sur_le_feu", 422,
        "Le Statut n'existe que dans Sur le feu, et y est obligatoire.");
    case "creneau_quart_heure":
      return new ErreurApi("requete_invalide", 422, "Un Créneau tombe sur un quart d'heure : 09:00, 09:15, 09:30 ou 09:45.");
    case "report_raison_obligatoire":
      return new ErreurApi("raison_obligatoire", 422,
        "Un Report est toujours motivé : la raison ne peut pas être vide.");
    default:
      return null;
  }
}

/** Enveloppe toute écriture : une contrainte Postgres violée ressort en refus lisible. */
export async function traduire<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const err = depuisPostgres(e);
    if (err) throw err;
    throw e;
  }
}
