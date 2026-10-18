/**
 * MCP distant, Streamable HTTP, sans session de transport et sans Redis.
 * Le jeton (ou la session) devient le même `{ spaceId, membreId }` que le reste de l'API.
 * L'agent agit donc en tant que ce Membre.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { createMcpHandler } from "mcp-handler";
import { ErreurApi } from "@/api/erreurs";
import { membreCourant, type Ctx } from "@/api/membre-courant";
import { reponseErreur } from "@/api/route-outils";
import { enregistrer } from "@/mcp/outils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const stockage = new AsyncLocalStorage<Ctx>();

const mcp = createMcpHandler((server) => {
  const ctx = stockage.getStore();
  if (!ctx) throw new ErreurApi("non_authentifie", 401, "Pas de session.");
  enregistrer(server, ctx);
}, {
  serverInfo: { name: "bruno", version: "1.0.0" },
  instructions:
    "Bruno, la to-do de The Vibe Company. Tu agis en tant que le Membre du jeton. " +
    "Une Capture n'entre jamais directement Sur le feu : crée, puis déplace, avec un Engagement. " +
    "Bloqué et Reporter exigent une raison. Terminer et Abandonner laissent une trace. " +
    "Il n'existe pas d'outil pour supprimer une Tâche.",
});

async function gerer(request: Request) {
  try {
    const ctx = await membreCourant(request);
    return await stockage.run(ctx, () => mcp(request));
  } catch (e) {
    return reponseErreur(e);
  }
}

export { gerer as GET, gerer as POST, gerer as DELETE };
