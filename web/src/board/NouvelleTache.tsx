"use client";
import { useState } from "react";

/**
 * Sous la dernière carte d'une pile, une ligne discrète « Nouvelle tâche ». Un clic, et elle
 * devient un champ : Entrée crée, Échap referme. Le « + » du titre ouvre la même ligne.
 */
export function NouvelleTache({ ouvert, onOuvrir, onFermer, onCreer, compact = false }: {
  ouvert: boolean; onOuvrir: () => void; onFermer: () => void; onCreer: (titre: string) => void; compact?: boolean;
}) {
  const [titre, setTitre] = useState("");
  /**
   * Entrée vide le champ sans rien attendre : la Tâche apparaît tout de suite (le Board la pose
   * avant la réponse), et le champ reste ouvert pour la suivante. Attendre le serveur ici, c'est
   * une demi-seconde les doigts en l'air à chaque ligne.
   */
  function valider() {
    const t = titre.trim();
    if (!t) return;
    setTitre("");
    void onCreer(t);
  }
  const hauteur = compact ? "h-8" : "h-9";
  if (!ouvert) return <LigneNouvelle onClick={onOuvrir} compact={compact} />;
  return (
    <input autoFocus value={titre} onChange={(e) => setTitre(e.target.value)} aria-label="Nouvelle tâche" placeholder="Nouvelle tâche"
      onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") { setTitre(""); onFermer(); } }}
      onBlur={() => onFermer()}
      className={`${hauteur} w-full flex-none rounded-lg border border-bord-fort bg-fond px-2.5 text-[13.5px] outline-none placeholder:text-texte-faible focus:border-accent`} />
  );
}

/** La ligne discrète sous la dernière carte d'une pile. */
export function LigneNouvelle({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button onClick={onClick} className={`flex ${compact ? "h-8" : "h-9"} w-full flex-none items-center gap-1.5 rounded-lg px-2 text-left text-[13px] text-texte-faible hover:bg-surface-2 hover:text-texte-sourd`}>
      <Plus />Nouvelle tâche
    </button>
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
