"use client";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Carte, type Membre, type TacheCarte } from "./Carte";
import type { Statut } from "./deplacement";
import { BoutonPlus, NouvelleTache } from "./NouvelleTache";

const LIBELLE: Record<Statut, string> = { a_faire: "À faire", en_cours: "En cours", bloque: "Bloqué" };
const COULEUR: Record<Statut, string> = { a_faire: "bg-accent border-accent", en_cours: "bg-en-cours border-en-cours", bloque: "bg-bloque border-bloque" };

export function Colonne({ statut, taches, membres, onTerminer, onOuvrir, onAssigner, saisie, onSaisir, onCreer }: {
  statut: Statut; taches: TacheCarte[]; membres: Membre[]; onTerminer: (id: string) => void; onOuvrir: (id: string) => void; onAssigner: (id: string, membreId: string) => void;
  saisie: boolean; onSaisir: (ouvert: boolean) => void; onCreer: (titre: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: statut });
  const [point, filet] = COULEUR[statut].split(" ");
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className={`flex items-baseline justify-between border-b pb-1.5 ${filet}`}>
        <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-tight">
          <span className={`h-1.5 w-1.5 rounded-full ${point}`} />
          {LIBELLE[statut]}
        </h2>
        <span className="flex items-center gap-1.5">
          <BoutonPlus onClick={() => onSaisir(true)} libelle={`Nouvelle tâche · ${LIBELLE[statut]}`} />
          <span className="text-xs text-texte-sourd">{taches.length}</span>
        </span>
      </header>
      <SortableContext id={statut} items={taches.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto pt-2 rounded-b-lg transition-colors ${isOver ? "bg-surface-2" : ""}`}>
          {taches.map((t) => <Carte key={t.id} tache={t} membres={membres} onTerminer={onTerminer} onOuvrir={onOuvrir} onAssigner={onAssigner} />)}
          <NouvelleTache ouvert={saisie} onOuvrir={() => onSaisir(true)} onFermer={() => onSaisir(false)} onCreer={onCreer} />
        </div>
      </SortableContext>
    </section>
  );
}
