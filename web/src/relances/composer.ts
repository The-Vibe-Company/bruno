/**
 * Ce que dit une Relance — BRU-24.
 *
 * Une Relance est **toujours groupée** : une notification par Créneau, jamais une par Tâche.
 * C'est la décision qui détermine si le système survit (règle 13). Et s'il n'y a rien à dire,
 * on ne dit rien : une notification vide est du bruit pur.
 *
 * Tout est pur ici : on donne l'état, on obtient le message. Les tests en profitent.
 */
import { SEUIL_SIGNAL } from "@/api/taches";
import { traine } from "./regles";

export type Nature = "point_du_matin" | "rappel" | "bilan";
export type TacheDue = { id: string; titre: string; statut: "a_faire" | "en_cours" | "bloque"; engagement: string; reportsCount: number; raisonBlocage?: string | null };
export type AVenirArrivee = { id: string; titre: string; engagement: string };
/** `id` désigne la période — c'est elle qu'on ferme d'un bouton quand elle traîne. */
export type AffectationDuJour = { id: string; nom: string; depuis: string; joursOuverts: number };

export type Situation = {
  jour: string;
  affectations: AffectationDuJour[];
  /** Sur le feu, à moi, Engagement ≤ aujourd'hui, vivantes. */
  engagees: TacheDue[];
  /** À venir, à moi, dont l'Engagement est arrivé : à proposer, jamais à déplacer (invariant 1). */
  aVenirArrivees: AVenirArrivee[];
  /** Sans Assigné mais Sur le feu ? Impossible (invariant 2). Rien à faire ici. */
};

/** `aFermer` : les Affectations qui traînent, pour que le client offre « je ne suis plus dessus » d'un bouton (règle 25). */
export type Message = { nature: Nature; titre: string; corps: string; tacheIds: string[]; aFermer: { id: string; nom: string }[] };

const pluriel = (n: number, un: string, des: string) => `${n} ${n > 1 ? des : un}`;


export function composer(nature: Nature, s: Situation): Message | null {
  const ouvertes = s.engagees.filter((t) => t.statut !== "bloque");
  const bloquees = s.engagees.filter((t) => t.statut === "bloque");

  if (nature === "point_du_matin") {
    const lignes: string[] = [];
    if (s.affectations.length) lignes.push(`Aujourd'hui : ${s.affectations.map((a) => a.nom).join(", ")}.`);
    if (ouvertes.length) lignes.push(`${pluriel(ouvertes.length, "Tâche engagée", "Tâches engagées")} aujourd'hui${ouvertes.length <= 3 ? " — " + ouvertes.map((t) => t.titre).join(" · ") : ""}.`);
    if (s.aVenirArrivees.length) lignes.push(`${pluriel(s.aVenirArrivees.length, "Tâche À venir arrive", "Tâches À venir arrivent")} : ${s.aVenirArrivees.map((t) => t.titre).join(" · ")} — les passer Sur le feu ?`);
    if (bloquees.length) lignes.push(`Toujours ${bloquees.length > 1 ? "bloquées" : "bloquée"} : ${bloquees.map((t) => t.raisonBlocage ? `${t.titre} (${t.raisonBlocage.toLowerCase()})` : t.titre).join(" · ")}.`);
    const trainent = s.affectations.filter(traine);
    for (const a of trainent) lignes.push(`Toujours sur ${a.nom} ? (depuis ${a.joursOuverts} jours)`);
    const signalees = ouvertes.filter((t) => t.reportsCount >= SEUIL_SIGNAL);
    if (signalees.length) lignes.push(`${pluriel(signalees.length, "Tâche reportée", "Tâches reportées")} ${SEUIL_SIGNAL} fois ou plus.`);
    if (lignes.length === 0) return null;
    return {
      nature, titre: "Point du matin", corps: lignes.join("\n"),
      tacheIds: [...ouvertes, ...bloquees].map((t) => t.id).concat(s.aVenirArrivees.map((t) => t.id)),
      aFermer: trainent.map((a) => ({ id: a.id, nom: a.nom })),
    };
  }

  // Rappels et Bilan : les Bloqué en sont exclus (règle 16) — les marteler cinq fois par jour
  // est le meilleur moyen de faire désactiver les Relances.
  if (ouvertes.length === 0) return null;

  if (nature === "rappel") {
    return { nature, titre: "Rappel", corps: `${pluriel(ouvertes.length, "encore ouverte", "encore ouvertes")} aujourd'hui.`, tacheIds: ouvertes.map((t) => t.id), aFermer: [] };
  }

  // Bilan : direct, il nomme la Tâche — la première par Rang, c'est celle qu'on devait faire.
  const [premiere, ...autres] = ouvertes;
  const suite = autres.length ? ` ${pluriel(autres.length, "autre engagement encore ouvert", "autres engagements encore ouverts")}.` : "";
  return { nature, titre: "Bilan", corps: `Tu devais finir ${premiere.titre}.${suite}`, tacheIds: ouvertes.map((t) => t.id), aFermer: [] };
}
