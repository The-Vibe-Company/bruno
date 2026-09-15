"use client";
import * as Popover from "@radix-ui/react-popover";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { Statut } from "./deplacement";
import { Initiale, Meta, TEINTE, type Personne } from "./visuel";

export type Membre = { id: string; nom: string; avatar?: string | null };
export type TacheCarte = {
  id: string; titre: string; statut: Statut; engagement: string | null;
  reportsCount: number; assigneId: string | null; assigne: Personne | null;
  aidantIds: string[]; aidants: Personne[]; notes: string | null; transcriptionBrute: string | null;
  raisonBlocage: string | null;
};

/** L'Assigné, en grand : un clic, et on le change — sans ouvrir la carte, sans la glisser. */
function Assigne({ tache, membres, onAssigner }: { tache: TacheCarte; membres: Membre[]; onAssigner: (id: string, membreId: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <Popover.Root open={ouvert} onOpenChange={setOuvert}>
      <Popover.Trigger asChild>
        <button aria-label={`Assigné : ${tache.assigne?.nom ?? "personne"} — changer`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
          className="rounded-full ring-offset-2 ring-offset-fond hover:ring-2 hover:ring-bord-fort">
          <Initiale nom={tache.assigne?.nom ?? "?"} avatar={tache.assigne?.avatar} grande />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} onPointerDown={(e) => e.stopPropagation()} className="anime-bulle z-40 w-48 overflow-hidden rounded-lg border border-bord-fort bg-surface py-1 shadow-xl outline-none">
          <div className="px-3 pb-1 pt-1.5 text-[12px] text-texte-sourd">Assigner à</div>
          {membres.map((m) => (
            <button key={m.id} onClick={(e) => { e.stopPropagation(); setOuvert(false); if (m.id !== tache.assigneId) onAssigner(tache.id, m.id); }}
              className="flex h-9 w-full items-center gap-2.5 px-3 text-left text-[13.5px] hover:bg-surface-2">
              <Initiale nom={m.nom} avatar={m.avatar} />{m.nom}
              {m.id === tache.assigneId && <span className="ml-auto text-accent">✓</span>}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Carte({ tache, membres = [], onTerminer, onOuvrir, onAssigner, fantome }: {
  tache: TacheCarte; membres?: Membre[]; onTerminer?: (id: string) => void; onOuvrir?: (id: string) => void;
  onAssigner?: (id: string, membreId: string) => void; fantome?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tache.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOuvrir?.(tache.id)}
      className={`rounded-lg border px-3 pt-2.5 pb-2 cursor-grab active:cursor-grabbing select-none transition-shadow
        ${TEINTE[tache.statut]} ${isDragging && !fantome ? "opacity-30" : ""} ${fantome ? "shadow-2xl" : ""}`}
    >
      <div className="line-clamp-2 text-[13.5px] leading-snug">{tache.titre}</div>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          aria-label="Terminé"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onTerminer?.(tache.id); }}
          className={`h-[15px] w-[15px] flex-none rounded-full border-[1.5px] border-texte-tres-faible hover:border-accent
            ${tache.statut === "bloque" ? "border-dashed" : ""}`}
        />
        <Meta tache={tache} />
        {tache.assigne && (onAssigner && membres.length > 0
          ? <Assigne tache={tache} membres={membres} onAssigner={onAssigner} />
          : <Initiale nom={tache.assigne.nom} avatar={tache.assigne.avatar} grande />)}
      </div>
    </div>
  );
}
