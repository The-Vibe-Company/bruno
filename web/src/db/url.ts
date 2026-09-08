/**
 * Où se trouve Postgres, selon l'endroit d'où l'on parle.
 *
 * En local, `DATABASE_URL` pointe sur le conteneur Docker. Sur Vercel, Neon pose ses propres
 * variables et n'utilise pas ce nom-là.
 *
 * La distinction poolée / non poolée n'est pas cosmétique : les migrations doivent passer par
 * une **connexion directe**. Le pooler de Neon ne tient pas les verrous consultatifs que
 * drizzle-kit utilise pour empêcher deux migrations concurrentes.
 */
export function dbUrl(usage: "runtime" | "migration"): string {
  const url =
    usage === "migration"
      ? process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL
      : process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Aucune base configurée. En local : lancer `docker compose up -d` et poser DATABASE_URL " +
        "(voir .env.example). Sur Vercel : Neon pose POSTGRES_URL automatiquement.",
    );
  }
  return url;
}
