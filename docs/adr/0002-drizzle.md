# 2. Drizzle plutôt que Prisma

**Statut** : accepté
**Date** : 2026-09-08
**Ticket** : BRU-2 / THE-578

## Contexte

L'[ADR 0001](./0001-stack.md) fixe Postgres, sans nommer d'ORM. BRU-2 tranche, parce que le
cœur du ticket n'est pas « décrire des tables » : c'est **faire respecter les invariants du
PRD par la base**.

Le plus important est l'invariant 2 — une Tâche ne peut pas entrer dans *Sur le feu* sans
Assigné ni Engagement. Il existe déjà dans l'UI et dans l'API, mais tant qu'il n'est pas dans
Postgres, un script, une migration de données ou un bug le contournera. Le schéma en compte
onze du même genre, tous exprimés en `CHECK`.

## Décision

**Drizzle ORM**, avec `drizzle-kit` pour les migrations et `postgres.js` comme pilote.

Les `CHECK` sont déclarés en SQL directement dans le schéma TypeScript, à côté de la table
qu'ils protègent :

```ts
check("tache_droit_entree_sur_le_feu",
  sql`${t.bucket} <> 'sur_le_feu' OR (${t.assigneId} IS NOT NULL AND ${t.engagement} IS NOT NULL)`)
```

Un script `pnpm check:invariants` rejoue chaque règle contre une vraie base et échoue si une
seule ne mord pas. Il tourne aujourd'hui sur 19 cas.

## Alternatives écartées

**Prisma.** Meilleure ergonomie sur la lecture et l'écriture au quotidien, et un studio plus
agréable. Mais son schéma ne sait pas exprimer une contrainte `CHECK` : il faut éditer à la
main le SQL de chaque migration générée, et la contrainte devient invisible dans le fichier
que tout le monde lit. Sur un projet dont l'argument principal est « les invariants vivent
dans la base », c'est le mauvais compromis.

**SQL brut plus un générateur de types.** Le plus direct, et honnêtement défendable à trois
personnes. Écarté pour une seule raison : le contrat OpenAPI de l'ADR 0001 suppose des types
dérivés du schéma, et Drizzle les donne gratuitement.

**Un ORM lourd (TypeORM, Sequelize).** Hors sujet en 2026 sur du TypeScript neuf.

## Conséquences

**Bonnes.** Les onze règles du PRD sont vérifiables par une commande. Les types des tables
sont dérivés du schéma, donc l'API ne peut pas mentir sur la forme des données. Les migrations
sont du SQL lisible et modifiable à la main.

**Coûteuses.** L'écriture des requêtes est plus verbeuse qu'avec Prisma, surtout sur les
jointures — le Daily et la vue Fait en feront. Et Drizzle bouge plus vite que Prisma :
il faudra épingler les versions et relire les notes de version avant de monter.

**Surveillé.** Le minimum de trois Créneaux par Membre est un invariant de **table**, pas de
ligne : aucun `CHECK` ne peut l'exprimer. Il est tenu par l'API (BRU-23), délibérément, pour
ne pas introduire de trigger. C'est la seule règle du PRD que la base ne protège pas, et il
faut s'en souvenir.
