import { documentOpenApi } from "@/api/openapi";

/** Le contrat, servi tel qu'il est appliqué. Public : il ne contient aucune donnée. */
export function GET() {
  return Response.json(documentOpenApi());
}
