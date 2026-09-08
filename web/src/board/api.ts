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
