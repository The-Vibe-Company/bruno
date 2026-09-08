"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { libelleJour } from "@/lib/dates";
import type { Statut } from "./deplacement";

export type TacheCarte = {
  id: string; titre: string; statut: Statut; engagement: string | null;
  reportsCount: number; assigne: { nom: string } | null;
  aidants: { nom: string }[]; notes: string | null; transcriptionBrute: string | null;
};

export const TEINTE: Record<Statut, string> = {
  a_faire: "bg-a-faire-voile border-accent/35",
  en_cours: "bg-en-cours-voile border-en-cours/35",
  bloque: "bg-bloque-voile border-bloque/35",
};

/** « reporté N× » — et à partir de trois, un badge : c'est un signal, jamais une sanction (règle 12). */
export function Reporte({ n }: { n: number }) {
  return n >= 3
    ? <span className="rounded-md border border-accent/50 bg-accent-voile px-1.5 py-px text-[12.5px] font-medium text-accent">reporté {n}×</span>
    : <span className="text-accent">reporté {n}×</span>;
}

export function Initiale({ nom }: { nom: string }) {
  return (
    <span className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-bord-faible text-[11px] font-medium text-texte">
      {nom.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function Carte({ tache, onTerminer, onOuvrir, fantome }: { tache: TacheCarte; onTerminer?: (id: string) => void; onOuvrir?: (id: string) => void; fantome?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tache.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOuvrir?.(tache.id)}
      className={`rounded-xl border p-3.5 pb-3 cursor-grab active:cursor-grabbing select-none transition-shadow
        ${TEINTE[tache.statut]} ${isDragging && !fantome ? "opacity-30" : ""} ${fantome ? "shadow-2xl" : ""}`}
    >
      <div className="flex items-start gap-2">
        <div className="text-[15.5px] leading-snug">{tache.titre}</div>
        <span aria-hidden className="ml-auto mt-1 grid flex-none grid-cols-2 gap-[3px] opacity-55">
          {Array.from({ length: 6 }).map((_, i) => <span key={i} className="h-[3px] w-[3px] rounded-full bg-texte-faible" />)}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2.5">
        <button
          type="button"
          aria-label="Terminé"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onTerminer?.(tache.id)}
          className={`h-[18px] w-[18px] flex-none rounded-full border-[1.5px] border-texte-tres-faible hover:border-accent
            ${tache.statut === "bloque" ? "border-dashed" : ""}`}
        />
        <span className="flex-1 text-[13.5px] text-texte-sourd">
          {tache.engagement ? libelleJour(tache.engagement) : "—"}
          {tache.reportsCount > 0 && <> · <Reporte n={tache.reportsCount} /></>}
        </span>
        {tache.assigne && <Initiale nom={tache.assigne.nom} />}
      </div>
    </div>
  );
}
