import type { NextConfig } from "next";

/**
 * Bruno vit sur une fonction à Washington, à côté de sa base ; nous sommes à Paris. Chaque
 * aller-retour coûte ~170 ms, et sans cache le moindre changement d'onglet le payait.
 *
 * Deux réglages y répondent, avec le `prefetch` du rail :
 * — les pages visitées restent en mémoire du navigateur quelques minutes, donc y revenir
 *   n'attend rien ;
 * — une mutation appelle `router.refresh()`, qui vide ce cache : on ne lit jamais longtemps
 *   des données mortes.
 */
const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      /** Une page simplement survolée ou visitée : une demi-minute, le temps d'un aller-retour d'onglet. */
      dynamic: 30,
      /** Une page préchargée en entier (le rail) : cinq minutes, comme le défaut de Next. */
      static: 300,
    },
  },
};

export default nextConfig;
