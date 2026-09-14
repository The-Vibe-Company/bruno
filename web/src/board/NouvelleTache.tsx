"use client";
import { useState } from "react";

/**
 * Sous la dernière carte d'une pile, une ligne discrète « Nouvelle tâche ». Un clic, et elle
 * devient un champ : Entrée crée, Échap referme. Le « + » du titre ouvre la même ligne.
 */
export function NouvelleTache({ ouvert, onOuvrir, onFermer, onCreer, compact = false }: {
  ouvert: boolean; onOuvrir: () => void; onFermer: () => void; onCreer: (titre: string) => Promise<void>; compact?: boolean;
}) {
  const [titre, setTitre] = useState("");
  const [occupe, setOccupe] = useState(false);
  async function valider() {
    const t = titre.trim();
    if (!t || occupe) return;
    setOccupe(true);
    try { await onCreer(t); setTitre(""); onFermer(); } finally { setOccupe(false); }
  }
  const hauteur = compact ? "h-8" : "h-9";
  if (!ouvert) {
    return (
      <button onClick={onOuvrir} className={`flex ${hauteur} w-full flex-none items-center gap-1.5 rounded-lg px-2 text-left text-[13px] text-texte-faible hover:bg-surface-2 hover:text-texte-sourd`}>
        <Plus />Nouvelle tâche
      </button>
    );
  }
  return (
    <input autoFocus value={titre} onChange={(e) => setTitre(e.target.value)} aria-label="Nouvelle tâche" placeholder="Nouvelle tâche"
      onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") { setTitre(""); onFermer(); } }}
      onBlur={() => { if (!titre.trim()) onFermer(); }}
      className={`${hauteur} w-full flex-none rounded-lg border border-bord-fort bg-fond px-2.5 text-[13.5px] outline-none placeholder:text-texte-faible focus:border-accent`} />
  );
}

/** Le « + » à côté d'un titre de pile. */
export function BoutonPlus({ onClick, libelle }: { onClick: () => void; libelle: string }) {
  return (
    <button onClick={onClick} aria-label={libelle} title={libelle} className="flex h-6 w-6 items-center justify-center rounded-md text-texte-faible hover:bg-surface-2 hover:text-texte">
      <Plus />
    </button>
  );
}

function Plus() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" /></svg>;
}
