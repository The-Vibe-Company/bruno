import posthog from "posthog-js";

/**
 * PostHog, avant que l'application ne devienne interactive.
 *
 * Les pageviews sont allumées, y compris quand on change de page sans recharger :
 * le rail navigue côté client, un simple chargement initial raterait le Daily, le Board, etc.
 * Sans clé, on n'envoie rien — elle est posée sur Vercel (`NEXT_PUBLIC_POSTHOG_KEY`).
 */
const cle = process.env.NEXT_PUBLIC_POSTHOG_KEY;
if (cle) {
  posthog.init(cle, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2026-05-30",
    capture_pageview: "history_change",
  });
}
