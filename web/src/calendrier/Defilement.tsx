"use client";

import { useLayoutEffect, useRef } from "react";

/** En dessous, les réunions d'une demi-heure ne se lisent plus. */
const HEURE_MIN = 40;
/** De quoi lire le libellé de la première heure, qui déborde au-dessus de sa ligne. */
const MARGE = 10;

/**
 * La grille va de 00 h à 00 h et défile, comme un agenda papier qu'on feuillette. À l'ouverture,
 * la journée de travail (`ouverture` → `fermeture`, en heures) prend toute la hauteur de ce qui
 * défile, sous l'en-tête collant ; le reste de la nuit est au-dessus et au-dessous, à portée de
 * molette. La place change (fenêtre redimensionnée) : les heures suivent.
 */
export function Defilement({ ouverture, fermeture }: { ouverture: number; fermeture: number }) {
  const ici = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const repere = ici.current;
    const grille = repere?.closest<HTMLElement>("[data-grille]");
    if (!repere || !grille) return;
    let boite = grille.parentElement;
    while (boite && !/(auto|scroll)/.test(getComputedStyle(boite).overflowY)) boite = boite.parentElement;
    if (!boite) return;
    const conteneur = boite;
    const caler = () => {
      const entete = grille.querySelector<HTMLElement>("[data-entete]")?.offsetHeight ?? 0;
      const place = conteneur.clientHeight - entete - MARGE;
      grille.style.setProperty("--h-heure", `${Math.max(HEURE_MIN, place / (fermeture - ouverture))}px`);
      conteneur.scrollTop += repere.getBoundingClientRect().top - conteneur.getBoundingClientRect().top - entete - MARGE;
    };
    caler();
    let largeur = conteneur.clientWidth, hauteur = conteneur.clientHeight;
    const suivre = new ResizeObserver(() => {
      if (conteneur.clientWidth === largeur && conteneur.clientHeight === hauteur) return;
      largeur = conteneur.clientWidth; hauteur = conteneur.clientHeight;
      caler();
    });
    suivre.observe(conteneur);
    return () => suivre.disconnect();
  }, [ouverture, fermeture]);
  return <div ref={ici} aria-hidden className="pointer-events-none absolute left-0 h-0" style={{ top: `calc(${ouverture} * var(--h-heure, 48px))` }} />;
}
