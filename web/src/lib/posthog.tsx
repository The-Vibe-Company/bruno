"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

function actif() {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

/**
 * Lie les événements au Membre. L'identifiant stable est l'id, pas l'adresse :
 * le nom et l'e-mail partent en propriétés.
 */
export function identifierMembre(membre: { id: string; email: string; nom: string }) {
  if (!actif()) return;
  posthog.identify(membre.id, { email: membre.email, name: membre.nom });
}

/** À la déconnexion, pour que la personne suivante n'hérite pas de l'identité. */
export function oublierMembre() {
  if (!actif()) return;
  posthog.reset();
}

/** Posé dans le cadre connecté : au retour de Google, la page se charge et le Membre est identifié. */
export function IdentifierMembre({ id, email, nom }: { id: string; email: string; nom: string }) {
  useEffect(() => { identifierMembre({ id, email, nom }); }, [id, email, nom]);
  return null;
}
