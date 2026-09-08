/**
 * Les réglages de l'authentification. Aucun n'a de valeur par défaut : une session signée
 * avec un secret deviné n'est pas une session.
 */
export const DOMAINE = process.env.BRUNO_DOMAINE ?? "thevibecompany.co";

export function reglage(nom: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "SESSION_SECRET"): string {
  const v = process.env[nom];
  if (!v) {
    throw new Error(
      `${nom} manquant. Voir .env.example — les identifiants Google se créent dans la console ` +
        "Google Cloud, avec l'écran de consentement en mode « Interne ».",
    );
  }
  return v;
}

export const GOOGLE = {
  autorisation: "https://accounts.google.com/o/oauth2/v2/auth",
  jeton: "https://oauth2.googleapis.com/token",
  jwks: "https://www.googleapis.com/oauth2/v3/certs",
  emetteurs: ["https://accounts.google.com", "accounts.google.com"],
} as const;
