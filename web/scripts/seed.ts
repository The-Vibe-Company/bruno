/**
 *   pnpm db:seed          la base (Espace, Membres, Affectations, Créneaux) — sûre partout
 *   pnpm db:seed:demo     + les Tâches des maquettes — localhost uniquement
 *
 * Sans DATABASE_URL dans l'environnement, lit .env.local (dev). Pour viser une autre base :
 *   DATABASE_URL=… pnpm db:seed
 */
import { existsSync, readFileSync } from "node:fs";

function chargerEnvLocal() {
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || !existsSync(".env.local")) return;
  for (const l of readFileSync(".env.local", "utf8").split("\n")) {
    const i = l.indexOf("=");
    if (i > 0 && !l.startsWith("#")) process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim();
  }
}

async function main() {
  chargerEnvLocal();
  const { compter, poserBase, poserDemo } = await import("../src/db/seed");
  const demo = process.argv.includes("--demo");
  const r = demo ? await poserDemo() : await poserBase();
  console.log(demo ? "Démo posée" : "Base posée", r, "→ état :", await compter());
  process.exit(0);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
