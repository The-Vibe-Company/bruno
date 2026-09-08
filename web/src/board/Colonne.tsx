"use client";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Carte, type TacheCarte } from "./Carte";
import type { Statut } from "./deplacement";

const LIBELLE: Record<Statut, string> = { a_faire: "À faire", en_cours: "En cours", bloque: "Bloqué" };
const COULEUR: Record<Statut, string> = { a_faire: "bg-accent border-accent", en_cours: "bg-en-cours border-en-cours", bloque: "bg-bloque border-bloque" };

export function Colonne({ statut, taches, onTerminer }: { statut: Statut; taches: TacheCarte[]; onTerminer: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: statut });
  const [point, filet] = COULEUR[statut].split(" ");
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className={`flex items-baseline justify-between border-b pb-2.5 ${filet}`}>
        <h2 className="flex items-center gap-2.5 text-xl font-medium tracking-tight">
          <span className={`h-2 w-2 rounded-full ${point}`} />
          {LIBELLE[statut]}
        </h2>
        <span className="text-sm text-texte-sourd">{taches.length}</span>
      </header>
      <SortableContext id={statut} items={taches.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`flex min-h-24 flex-1 flex-col gap-2.5 pt-2.5 rounded-b-lg transition-colors ${isOver ? "bg-surface-2" : ""}`}>
          {taches.map((t) => <Carte key={t.id} tache={t} onTerminer={onTerminer} />)}
        </div>
      </SortableContext>
    </section>
  );
}
