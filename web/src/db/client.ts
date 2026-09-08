import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { dbUrl } from "./url";

/**
 * Une seule connexion par processus. Sur Vercel, les fonctions sont réutilisées entre
 * requêtes (Fluid Compute) : ouvrir un pool par appel épuiserait Neon pour rien.
 */
const global_ = globalThis as unknown as { __brunoSql?: postgres.Sql };
const client = global_.__brunoSql ?? postgres(dbUrl("runtime"), { max: 5 });
if (process.env.NODE_ENV !== "production") global_.__brunoSql = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
