/** Les appels du board vers l'API. Même origine : le cookie de session part tout seul. */
import type { Mutation } from "./deplacement";

async function poster(chemin: string, corps?: unknown) {
  const r = await fetch(chemin, {
    method: "POST",
    headers: corps ? { "content-type": "application/json" } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
}

export const appliquer = (m: Mutation) =>
  m.type === "statut"
    ? poster(`/api/taches/${m.id}/statut`, { statut: m.statut })
    : poster(`/api/taches/${m.id}/rang`, { avantId: m.avantId, apresId: m.apresId });

export const terminer = (id: string) => poster(`/api/taches/${id}/terminer`);
export type Destination =
  | { bucket: "sur_le_feu"; assigneId: string; engagement: string; statut?: "a_faire" | "en_cours" | "bloque" }
  | { bucket: "a_venir"; engagement?: string | null }
  | { bucket: "idees" }
  | { bucket: "a_trier" };
/** Changer de Bucket. Vers Sur le feu, le droit d'entrée est exigé — par le contrat, puis par la base. */
export const deplacerBucket = (id: string, destination: Destination) => poster(`/api/taches/${id}/bucket`, destination);
export const abandonner = (id: string) => poster(`/api/taches/${id}/abandonner`);
/** Le seul chemin qui déplace un Engagement Sur le feu — et il exige une raison (invariant 4). */
export const reporter = (id: string, corps: { raison: string; nouvelEngagement: string }) => poster(`/api/taches/${id}/reporter`, corps);
export async function supprimer(id: string) {
  const r = await fetch(`/api/taches/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`Erreur ${r.status}`);
}
