import { debutAutorisation } from "@/auth/oauth";

/** Démarre la connexion. Il n'y a rien à remplir : on part chez Google et on revient. */
export function GET(request: Request) {
  const { url, cookie } = debutAutorisation(request);
  return new Response(null, { status: 302, headers: { location: url, "set-cookie": cookie } });
}
