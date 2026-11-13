"use client";

import { useEffect, useState } from "react";

/** Le temps de lire « Agenda branché : … » ; une erreur, elle, attend qu'on la ferme. */
const DUREE_SUCCES = 4000;

/**
 * Ce que le retour d'un branchement laisse dans l'URL (`?branche=` ou `?erreur=`), dit une fois.
 * L'URL est nettoyée aussitôt : recharger la page ou la garder en favori ne le redit pas.
 */
export function Avis({ message, erreur }: { message: string; erreur: boolean }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("branche");
    url.searchParams.delete("erreur");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    if (erreur) return;
    const minuterie = setTimeout(() => setVisible(false), DUREE_SUCCES);
    return () => clearTimeout(minuterie);
  }, [erreur]);

  if (!visible) return null;
  return (
    <p role={erreur ? "alert" : "status"} className={`mx-5 mt-3 flex items-center gap-3 rounded-lg border px-3 py-2 text-[13.5px] ${erreur ? "border-bloque/40 bg-bloque-voile" : "border-en-cours/40 bg-en-cours-voile"}`}>
      <span className="flex-1">{message}</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fermer" title="Fermer"
        className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-texte-sourd hover:bg-surface-2 hover:text-texte">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>
      </button>
    </p>
  );
}
