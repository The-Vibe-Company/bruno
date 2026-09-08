import type { Config } from "drizzle-kit";
import { dbUrl } from "./src/db/url";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Les migrations passent par la connexion directe, jamais par le pooler.
  dbCredentials: { url: dbUrl("migration") },
  casing: "snake_case",
} satisfies Config;
