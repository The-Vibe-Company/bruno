# 3. Les migrations s'appliquent au build

**Statut** : accepté
**Date** : 2026-09-08
**Ticket** : BRU-42 / THE-618

## Contexte

Le schéma vit dans le dépôt (BRU-2) et la base de production est chez Neon. Reste à décider
**quand** une migration s'applique. Les trois façons de faire ont chacune un vrai défaut, et
choisir au hasard se paie six mois plus tard.

## Décision

`drizzle-kit migrate` tourne **dans la commande de build**, avant `next build` :

```json
"build": "drizzle-kit migrate && next build"
```

Deux détails qui rendent ça sûr :

1. **La migration passe par la connexion directe**, jamais par le pooler (`src/db/url.ts`).
   Le pooler de Neon ne tient pas les verrous consultatifs que drizzle-kit pose pour empêcher
   deux migrations concurrentes.
2. **Elle tourne avant la construction.** Si elle échoue, le déploiement échoue et l'ancienne
   version reste en ligne — on ne se retrouve jamais avec du code neuf sur un schéma vieux.

## La règle qui rend ce choix tenable

**Une migration doit toujours être compatible avec la version en ligne.** Ajouter une colonne,
une table, un index : sans risque. Renommer ou supprimer : jamais dans le même déploiement que
le code qui en dépend, parce qu'entre la fin de la migration et la bascule du trafic, l'ancienne
version tourne encore sur le nouveau schéma.

Pour un changement destructeur, deux déploiements :

1. on ajoute le nouveau, le code écrit dans les deux, l'ancien reste ;
2. une fois la version en ligne à jour, on supprime l'ancien.

C'est la seule discipline que ce choix impose, et elle n'est pas négociable.

## Alternatives écartées

**Une étape manuelle avant chaque déploiement.** Sûre, et honnêtement défendable à trois.
Écartée parce qu'on l'oubliera : la première fois que quelqu'un pousse un correctif un vendredi
soir, l'application démarre sur un schéma qui n'a pas bougé.

**Une route protégée déclenchée après le déploiement.** Le défaut est structurel : la nouvelle
version est déjà en ligne quand la migration commence. Il existe donc une fenêtre, courte mais
réelle, où le code neuf tourne sur l'ancien schéma. C'est précisément ce qu'on cherche à éviter.

## Conséquences

**Bonnes.** Rien à retenir, rien à déclencher : on pousse, ça migre. Un échec de migration ne
peut pas mettre une version cassée en ligne.

**Coûteuses.** La discipline « toujours compatible » repose sur les gens, pas sur l'outil.
Elle est écrite ici et rappelée dans la description de BRU-42, et c'est tout ce qui la protège.

**Surveillé.** Tant que **Preview et Production partagent la même base Neon**, un build de
preview migre la production. C'est sans conséquence aujourd'hui — les migrations sont additives
et la base est vide — mais ça doit être réglé avant qu'il y ait des données réelles.
Voir la case correspondante dans BRU-42.
