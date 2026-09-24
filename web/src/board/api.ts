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
    ? poster(`/api/taches/${m.id}/statut`, m.statut === "bloque" ? { statut: m.statut, raison: m.raison, dependDeId: m.dependDeId ?? null } : { statut: m.statut })
    : poster(`/api/taches/${m.id}/rang`, { avantId: m.avantId, apresId: m.apresId });

export const terminer = (id: string) => poster(`/api/taches/${id}/terminer`);
export type Destination =
  | { bucket: "sur_le_feu"; assigneId: string; engagement: string; statut?: "a_faire" | "en_cours" | "bloque"; raison?: string }
  | { bucket: "a_venir"; engagement?: string | null }
  | { bucket: "idees" }
  | { bucket: "a_trier" };
/** Changer de Bucket. Vers Sur le feu, le droit d'entrée est exigé — par le contrat, puis par la base. */
export const deplacerBucket = (id: string, destination: Destination) => poster(`/api/taches/${id}/bucket`, destination);
export const abandonner = (id: string) => poster(`/api/taches/${id}/abandonner`);
/** Un Terminé ou un Abandonné de trop : la fin s'efface, tout le reste est resté. */
export const rouvrir = (id: string) => poster(`/api/taches/${id}/rouvrir`);
/** Une Tâche tapée sur le web : À trier par défaut, comme une Capture — ou droit dans À venir / Idées. */
export async function creerTache(titre: string, bucket: "a_trier" | "a_venir" | "idees" = "a_trier"): Promise<{ id: string }> {
  const r = await fetch("/api/taches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ titre, bucket }) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
  return r.json();
}

export type Patch = { titre?: string; notes?: string | null; assigneId?: string; aidantIds?: string[]; raisonBlocage?: string; engagement?: string | null; dependDeId?: string | null };
/** Modifier ce qui se modifie librement : titre, Notes, Assigné, Aidants, raison du blocage — et l'Engagement, hors Sur le feu. */
export async function modifierTache(id: string, patch: Patch) {
  const r = await fetch(`/api/taches/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
}
/** Le seul chemin qui déplace un Engagement Sur le feu — et il exige une raison (invariant 4). */
export const reporter = (id: string, corps: { raison: string; nouvelEngagement: string }) => poster(`/api/taches/${id}/reporter`, corps);
export async function supprimer(id: string) {
  const r = await fetch(`/api/taches/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`Erreur ${r.status}`);
}
