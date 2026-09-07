# E8 — Récurrence

## BRU-32 — Écran Récurrences web · **bloqué par BRU-35**

Configuration **depuis le web uniquement** *(règle 18)*.

- [ ] Liste des règles existantes, création et édition
- [ ] Une règle : titre, **Assigné obligatoire** *(règle 21, conséquence de l'invariant 2)*,
      fréquence, nombre d'occurrences, Engagements échelonnés
- [ ] Exemple à faire fonctionner tel quel : *le lundi, créer « Post LinkedIn » en 3 occurrences,
      Engagements lundi, mercredi, vendredi*

## BRU-33 — Le moteur de génération

- [ ] Une règle peut fabriquer **plusieurs Tâches d'un coup, avec des Engagements échelonnés**
- [ ] Numérotation `n/N` automatique : on écrit « Post LinkedIn », Bruno suffixe `1/3`, `2/3`, `3/3`
- [ ] Les Tâches fabriquées sont des **Tâches parfaitement ordinaires**. Une fois nées, elles
      n'ont **plus aucun lien** avec la règle : les Reporter, les Abandonner ou les éditer
      n'affecte ni la règle ni les occurrences futures *(règle 20)*
- [ ] Génération **au premier Créneau du jour concerné**, pour apparaître dans le Point du matin
- [ ] Si l'occurrence précédente n'est pas faite : **on génère quand même**, et la nouvelle Tâche
      affiche `la précédente n'est pas faite` *(règle 22)*. L'empilement est une information
- [ ] Les Tâches générées entrent Sur le feu — donc la règle doit satisfaire le droit d'entrée
      à la génération, Assigné et Engagement compris
