# E8 — Récurrence

## BRU-32 — Écran Récurrences web

La maquette existe désormais (BRU-35 livré) — plus de blocage.

Configuration **depuis le web uniquement** *(règle 18)*.

- [x] Liste des règles existantes, création et édition
- [x] Une règle : titre, **Assigné obligatoire** *(règle 21, conséquence de l'invariant 2)*,
      fréquence, nombre d'occurrences, Engagements échelonnés
- [x] Exemple à faire fonctionner tel quel : *le lundi, créer « Post LinkedIn » en 3 occurrences,
      Engagements lundi, mercredi, vendredi*

## BRU-33 — Le moteur de génération

- [x] Une règle peut fabriquer **plusieurs Tâches d'un coup, avec des Engagements échelonnés**
- [x] Numérotation `n/N` automatique : on écrit « Post LinkedIn », Bruno suffixe `1/3`, `2/3`, `3/3`
- [x] Les Tâches fabriquées sont des **Tâches parfaitement ordinaires**. Une fois nées, elles
      n'ont **plus aucun lien** avec la règle : les Reporter, les Abandonner ou les éditer
      n'affecte ni la règle ni les occurrences futures *(règle 20)*
- [x] Génération **au premier Créneau du jour concerné**, pour apparaître dans le Point du matin
- [x] Si l'occurrence précédente n'est pas faite : **on génère quand même**, et **on ne signale
      rien** *(règle 22)*. Les deux Tâches se retrouvent côte à côte dans la liste, ça suffit
- [x] Les Tâches générées entrent Sur le feu — donc la règle doit satisfaire le droit d'entrée
      à la génération, Assigné et Engagement compris
