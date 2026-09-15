import { debutAutorisation } from "@/auth/oauth";

/** Démarre la connexion. Il n'y a rien à remplir : on part chez Google et on revient. */
export function GET(request: Request) {
  let autorisation;
  try { autorisation = debutAutorisation(request); }
  catch { return Response.json({ message: "Paramètres de connexion invalides." }, { status: 400 }); }
  const { url, cookie } = autorisation;
  return new Response(null, { status: 302, headers: { location: url, "set-cookie": cookie } });
}
