"use client";
import { useSyncExternalStore } from "react";

/** Le panneau En attente replié ou non — un choix par navigateur, retenu entre deux visites. */
const CLE = "bruno.en-attente.replie";
const abonnes = new Set<() => void>();

function lire(): boolean { try { return localStorage.getItem(CLE) === "1"; } catch { return false; } }
export function poserReplie(v: boolean) { try { localStorage.setItem(CLE, v ? "1" : "0"); } catch { /* navigation privée : on vit sans */ } abonnes.forEach((f) => f()); }
/** Déplié côté serveur, puis la préférence du navigateur — sans désaccord d'hydratation. */
export const useReplie = () => useSyncExternalStore((f) => { abonnes.add(f); return () => { abonnes.delete(f); }; }, lire, () => false);
