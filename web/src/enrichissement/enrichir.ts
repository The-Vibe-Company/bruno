/**
 * Appliquer une lecture à une Tâche — après sa création, sans rien bloquer. Si le modèle
 * échoue ou n'est pas joignable, la Tâche reste avec son titre brut : un état parfaitement
 * acceptable. La transcription brute n'est jamais touchée (règle 3).
 */
import { eq } from "drizzle-orm";
import { lister, modifier, obtenir, reordonner } from "@/api/taches";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { JOURS } from "@/recurrences/regle";
import { instant } from "@/relances/temps";
import { analyser, type Modele } from "./analyser";
import { modeleAnthropic } from "./anthropic";

type Ctx = { spaceId: string; membreId: string };

export async function enrichir(ctx: Ctx, tacheId: string, modele: Modele | null = modeleAnthropic()): Promise<boolean> {
  if (!modele) return false;
  try {
    const t = await obtenir(ctx, tacheId);
    // Seule une Capture s'enrichit : une Tâche déjà triée a été relue par un humain.
    if (t.bucket !== "a_trier" || t.etatTerminal) return false;
    const membres = await db.select({ id: membre.id, nom: membre.nom }).from(membre).where(eq(membre.spaceId, ctx.spaceId));
    const i = instant();
    const lecture = await analyser(modele, { texte: t.transcriptionBrute ?? t.titre, membres, aujourdhui: i.jour, jourSemaine: JOURS[i.jourSemaine - 1] });
    if (!lecture) return false;
    await modifier(ctx, tacheId, {
      titre: lecture.titre,
      ...(lecture.assigneId ? { assigneId: lecture.assigneId } : {}),
      ...(lecture.engagement ? { engagement: lecture.engagement } : {}),
    });
    if (lecture.urgent) {
      const [premiere] = await lister(ctx, { bucket: "a_trier", inclureTerminees: false });
      if (premiere && premiere.id !== tacheId) await reordonner(ctx, tacheId, { avantId: null, apresId: premiere.id });
    }
    return true;
  } catch (e) {
    console.warn(`[enrichissement] ${tacheId} laissée telle quelle :`, (e as Error).message);
    return false;
  }
}
