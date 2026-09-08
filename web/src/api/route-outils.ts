/**
 * La plomberie commune des routes : résoudre qui parle, valider l'entrée, sérialiser la
 * sortie, et transformer une ErreurApi en réponse. Les routes n'écrivent rien d'autre que
 * leur logique propre.
 */
import { ZodError, type ZodType } from "zod";
import { ErreurApi } from "./erreurs";
import { membreCourant, type Ctx } from "./membre-courant";

type Params = Record<string, string>;

export function route<S extends ZodType | undefined, R>(
  schema: S,
  fn: (args: {
    ctx: Ctx;
    entree: S extends ZodType ? ReturnType<S["parse"]> : undefined;
    params: Params;
    request: Request;
  }) => Promise<R>,
) {
  return async (request: Request, contexte?: { params: Promise<Params> }) => {
    try {
      const ctx = await membreCourant(request);
      const params = (await contexte?.params) ?? {};
      let entree: unknown;
      if (schema) {
        const brut =
          request.method === "GET"
            ? Object.fromEntries(new URL(request.url).searchParams)
            : await request.json().catch(() => ({}));
        entree = schema.parse(brut);
      }
      const resultat = await fn({ ctx, entree: entree as never, params, request });
      return resultat === undefined
        ? new Response(null, { status: 204 })
        : Response.json(resultat);
    } catch (e) {
      return reponseErreur(e);
    }
  };
}

export function reponseErreur(e: unknown) {
  if (e instanceof ErreurApi) {
    return Response.json({ code: e.code, message: e.message, details: e.details }, { status: e.statut });
  }
  if (e instanceof ZodError) {
    return Response.json(
      {
        code: "requete_invalide",
        message: "Requête invalide.",
        details: e.issues.map((i) => ({ champ: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  console.error(e);
  return Response.json({ code: "erreur_interne", message: "Erreur interne." }, { status: 500 });
}
