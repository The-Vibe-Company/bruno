/**
 * Les migrations, mais seulement depuis la production.
 *
 * Les déploiements de prévisualisation partagent la base de production (une seule base Neon,
 * branchée sur les deux environnements). Chaque build de PR lançait donc `drizzle-kit migrate`
 * sur la vraie base : le 30 septembre 2026, la prévisualisation d'une PR a supprimé une table
 * que la production servait encore, et l'application a cessé d'ouvrir les fiches — en prod,
 * avant même que la PR soit relue.
 *
 * Une prévisualisation ne migre donc plus rien. Elle se construit contre le schéma tel qu'il
 * est : si son code attend une table qui n'existe pas encore, c'est elle qui se plaint, et
 * elle seule. La production, elle, migre comme avant, et un échec arrête le déploiement.
 *
 * Le vrai remède reste une base par environnement (Neon sait brancher) ; ceci est la ceinture.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ou = process.env.VERCEL_ENV; // absent en local, sinon production / preview / development

if (ou && ou !== "production") {
  console.log(`Migrations ignorées : déploiement « ${ou} », qui partage la base de production.`);
  process.exit(0);
}

// Par son chemin, pas par le PATH : ce script tourne aussi bien depuis `pnpm build` qu'à la main.
const local = fileURLToPath(new URL("../node_modules/.bin/drizzle-kit", import.meta.url));
const bin = existsSync(local) ? local : "drizzle-kit";
const r = spawnSync(bin, ["migrate"], { stdio: "inherit", shell: !existsSync(local) });
process.exit(r.status ?? 1);
