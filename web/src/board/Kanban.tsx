"use client";
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { abandonner, appliquer, supprimer, terminer } from "./api";
import { Detail } from "./Detail";
import { Carte, type TacheCarte } from "./Carte";
import { Colonne } from "./Colonne";
import { colonneDe, deplacer, type Colonnes, type Statut } from "./deplacement";

const STATUTS: Statut[] = ["a_faire", "en_cours", "bloque"];

export function Kanban({ taches }: { taches: TacheCarte[] }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const parId = useMemo(() => new Map(taches.map((t) => [t.id, t])), [taches]);
  const initiales = useMemo<Colonnes>(() => ({
    a_faire: taches.filter((t) => t.statut === "a_faire").map((t) => t.id),
    en_cours: taches.filter((t) => t.statut === "en_cours").map((t) => t.id),
    bloque: taches.filter((t) => t.statut === "bloque").map((t) => t.id),
  }), [taches]);
  const [colonnes, setColonnes] = useState<Colonnes>(initiales);
  // Quand le serveur renvoie de nouvelles données, on repart d'elles : ajustement pendant
  // le rendu, le motif que React recommande à la place d'un effet.
  const [base, setBase] = useState(initiales);
  if (base !== initiales) { setBase(initiales); setColonnes(initiales); }
  const [actif, setActif] = useState<TacheCarte | null>(null);
  const [ouverteId, setOuverteId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const rafraichir = () => demarrer(() => router.refresh());

  async function finDeGlisser({ active, over }: DragEndEvent) {
    setActif(null);
    if (!over || active.id === over.id) return;
    const { mutations, colonnes: suivantes } = deplacer(colonnes, String(active.id), String(over.id));
    if (mutations.length === 0) return;
    setColonnes(suivantes);
    try {
      for (const m of mutations) await appliquer(m);
    } catch (e) {
      setErreur((e as Error).message);
      setColonnes(initiales);
    }
    rafraichir();
  }

  const action = (fn: (id: string) => Promise<void>) => async (id: string) => {
    setErreur(null);
    try { await fn(id); } catch (e) { setErreur((e as Error).message); }
    rafraichir();
  };
  const onTerminer = action(terminer);

  const carte = (id: string, statut: Statut): TacheCarte => ({ ...parId.get(id)!, statut });

  return (
    <DndContext
      // Un id stable : sans lui, dnd-kit numérote ses attributs d'accessibilité différemment
      // côté serveur et côté client, et React signale un décalage d'hydratation.
      id="dnd-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }: DragStartEvent) => setActif(parId.get(String(active.id)) ?? null)}
      onDragEnd={finDeGlisser}
      onDragCancel={() => setActif(null)}
    >
      {erreur && (
        <p role="alert" className="mb-3 rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">
          {erreur} <button className="ml-2 underline" onClick={() => setErreur(null)}>ok</button>
        </p>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-6">
        {STATUTS.map((s) => (
          <Colonne key={s} statut={s} taches={colonnes[s].filter((id) => parId.has(id)).map((id) => carte(id, s))} onTerminer={onTerminer} onOuvrir={setOuverteId} />
        ))}
      </div>
      <DragOverlay>{actif ? <Carte tache={actif} fantome /> : null}</DragOverlay>
      <Detail
        tache={ouverteId ? (() => { const t = parId.get(ouverteId); return t ? carte(ouverteId, colonneDe(colonnes, ouverteId) ?? t.statut) : null; })() : null}
        onFermer={() => setOuverteId(null)}
        onTerminer={action(terminer)}
        onAbandonner={action(abandonner)}
        onSupprimer={action(supprimer)}
      />
    </DndContext>
  );
}
