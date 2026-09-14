import { cookieEfface } from "@/auth/session";

/**
 * Se déconnecter : un formulaire, une vraie navigation, et on atterrit sur la page de connexion
 * qui le dit. Pas de `fetch` suivi d'un `router.push("/")` : `/` renverrait aussitôt chez Google,
 * qui reconnecterait sans rien demander — et la déconnexion aurait l'air de ne rien faire.
 */
export function POST(request: Request) {
  const destination = new URL("/connexion?raison=deconnecte", request.url);
  return new Response(null, { status: 303, headers: { location: destination.toString(), "set-cookie": cookieEfface } });
}
