/**
 * Vérifie que les invariants du PRD sont bien tenus par Postgres — pas par l'interface.
 * Chaque cas tente une écriture et attend soit un succès, soit un rejet par une contrainte
 * nommée. Sort en erreur si une seule règle ne mord pas.
 *
 *   pnpm check:invariants
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
let vert = 0;
const rouge: string[] = [];

async function passe(label: string, fn: () => Promise<unknown>) {
  try { await sql.begin(async () => { await fn(); throw new Rollback(); }); }
  catch (e) { if (!(e instanceof Rollback)) return echec(label, `refusé alors qu'il devait passer — ${msg(e)}`); }
  ok(label);
}

async function refuse(label: string, contrainte: string, fn: () => Promise<unknown>) {
  try { await sql.begin(async () => { await fn(); throw new Rollback(); }); }
  catch (e) {
    if (e instanceof Rollback) return echec(label, "accepté alors qu'il devait être refusé");
    const c = (e as { constraint_name?: string }).constraint_name;
    if (c !== contrainte) return echec(label, `refusé par « ${c ?? msg(e)} », attendu « ${contrainte} »`);
    return ok(label);
  }
  echec(label, "accepté alors qu'il devait être refusé");
}

class Rollback extends Error {}
const msg = (e: unknown) => (e as Error).message?.split("\n")[0] ?? String(e);
const ok = (l: string) => { vert++; console.log(`  ✓ ${l}`); };
const echec = (l: string, d: string) => { rouge.push(l); console.log(`  ✗ ${l}\n      ${d}`); };

const ids = {
  space: "11111111-1111-1111-1111-111111111111",
  membre: "22222222-2222-2222-2222-222222222222",
  affectation: "33333333-3333-3333-3333-333333333333",
  tache: "44444444-4444-4444-4444-444444444444",
};

async function seed() {
  await sql`delete from space where id = ${ids.space}`;
  await sql`insert into space (id, nom) values (${ids.space}, 'The Vibe Company')`;
  await sql`insert into membre (id, space_id, nom, email) values (${ids.membre}, ${ids.space}, 'Antoine', 'antoine@thevibecompany.co')`;
  await sql`insert into affectation (id, space_id, nom, couleur) values (${ids.affectation}, ${ids.space}, 'MONKA', '#F27313')`;
  await sql`insert into tache (id, space_id, titre, bucket, rang) values (${ids.tache}, ${ids.space}, 'Relancer MONKA', 'a_trier', 1)`;
}

const tache = (o: Record<string, unknown>) =>
  sql`insert into tache ${sql({ space_id: ids.space, titre: "Test", rang: "1", ...o })}`;

async function main() {
  await seed();

  console.log("\nInvariant 2 — droit d'entrée Sur le feu (la seule règle dure de Bruno)");
  await passe("une Tâche entre dans À trier sans rien",
    () => tache({ bucket: "a_trier" }));
  await refuse("Sur le feu sans Assigné ni Engagement", "tache_droit_entree_sur_le_feu",
    () => tache({ bucket: "sur_le_feu", statut: "a_faire" }));
  await refuse("Sur le feu avec Assigné mais sans Engagement", "tache_droit_entree_sur_le_feu",
    () => tache({ bucket: "sur_le_feu", statut: "a_faire", assigne_id: ids.membre }));
  await refuse("Sur le feu avec Engagement mais sans Assigné", "tache_droit_entree_sur_le_feu",
    () => tache({ bucket: "sur_le_feu", statut: "a_faire", engagement: "2026-09-08" }));
  await passe("Sur le feu avec les deux",
    () => tache({ bucket: "sur_le_feu", statut: "a_faire", assigne_id: ids.membre, engagement: "2026-09-08" }));
  await refuse("on ne contourne pas non plus par un UPDATE", "tache_droit_entree_sur_le_feu",
    () => sql`update tache set bucket = 'sur_le_feu', statut = 'a_faire' where id = ${ids.tache}`);

  console.log("\nLe Statut n'existe que dans Sur le feu");
  await refuse("Sur le feu sans Statut", "tache_statut_sur_le_feu",
    () => tache({ bucket: "sur_le_feu", assigne_id: ids.membre, engagement: "2026-09-08" }));
  await refuse("une Idée avec un Statut", "tache_statut_sur_le_feu",
    () => tache({ bucket: "idees", statut: "en_cours" }));

  console.log("\nRègle 8 — un Report est toujours motivé");
  await passe("un Report avec sa raison",
    () => sql`insert into report (space_id, tache_id, raison, ancien_engagement, nouvel_engagement)
              values (${ids.space}, ${ids.tache}, 'bloqué par la relecture', '2026-09-08', '2026-09-09')`);
  await refuse("un Report avec une raison vide", "report_raison_obligatoire",
    () => sql`insert into report (space_id, tache_id, raison, ancien_engagement, nouvel_engagement)
              values (${ids.space}, ${ids.tache}, '   ', '2026-09-08', '2026-09-09')`);

  console.log("\nLes Créneaux sont au quart d'heure");
  await passe("09:15", () => sql`insert into creneau (space_id, membre_id, heure) values (${ids.space}, ${ids.membre}, '09:15')`);
  await refuse("09:07", "creneau_quart_heure",
    () => sql`insert into creneau (space_id, membre_id, heure) values (${ids.space}, ${ids.membre}, '09:07')`);

  console.log("\nRécurrence — une règle cohérente, des décalages alignés");
  const regle = (o: Record<string, unknown>) =>
    sql`insert into recurrence ${sql({ space_id: ids.space, titre: "Post LinkedIn", assigne_id: ids.membre, ...o })}`;
  await passe("chaque lundi, 3 occurrences décalées de 0, 2 et 4 jours",
    () => regle({ frequence: "hebdomadaire", jour_semaine: 1, occurrences: 3, decalages: [0, 2, 4] }));
  await refuse("hebdomadaire mais avec un jour du mois", "recurrence_frequence_coherente",
    () => regle({ frequence: "hebdomadaire", jour_semaine: 1, jour_mois: 15, occurrences: 1, decalages: [0] }));
  await refuse("3 occurrences mais 2 décalages", "recurrence_decalages_alignes",
    () => regle({ frequence: "hebdomadaire", jour_semaine: 1, occurrences: 3, decalages: [0, 2] }));
  await refuse("la première occurrence n'est pas le jour même", "recurrence_decalages_alignes",
    () => regle({ frequence: "hebdomadaire", jour_semaine: 1, occurrences: 2, decalages: [1, 3] }));

  console.log("\nInvariant 6 — être sur une Affectation a une durée");
  const periode = (o: Record<string, unknown>) =>
    sql`insert into affectation_membre ${sql({ space_id: ids.space, membre_id: ids.membre, affectation_id: ids.affectation, ...o })}`;
  await passe("sur MONKA depuis le 3, toujours dessus", () => periode({ debut: "2026-09-03" }));
  await passe("plusieurs Affectations en même temps sont normales",
    async () => { await periode({ debut: "2026-09-03" }); await periode({ debut: "2026-09-05" }); });
  await refuse("une période qui finit avant de commencer", "affectation_membre_periode",
    () => periode({ debut: "2026-09-05", fin: "2026-09-03" }));

  console.log(`\n${vert} règles tenues par Postgres` + (rouge.length ? `, ${rouge.length} EN ÉCHEC` : "") + "\n");
  await sql.end();
  if (rouge.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
