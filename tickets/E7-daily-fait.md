# E7 — Daily et Fait

## BRU-30 — Écran Daily

Maquette : `Bruno Web v2` → écran « Daily ». C'est l'interface de la réunion du matin :
lecture seule, projetable, une seule page.

- [x] Bandeau d'alerte en tête : nombre de Tâches dans **À trier** et nombre de Tâches
      **reportées 3 fois ou plus**. Ce sont les deux seuls signaux de santé de Bruno
- [x] Filtre `Tous` + une pastille par Membre, pour dérouler la réunion personne par personne
- [x] Les **Affectations du jour** de chacun
- [x] Bloc **Hier** : Tâches Terminées et Abandonnées, plus les Affectations de la veille
- [x] Les Tâches **Sur le feu aujourd'hui** groupées par Statut, avatar de l'Assigné sur
      chaque ligne
- [x] **Aucune donnée nouvelle** : le Daily n'agrège que ce qui existe déjà

## BRU-31 — Écran Fait

Maquette : `Bruno Web v2` → écran « Terminé ». **À renommer « Fait »** : il contient les Tâches
Terminées *et* Abandonnées, alors que `Terminé` désigne un état précis du glossaire.

- [ ] Groupé par semaine, la semaine courante marquée « en cours »
- [ ] Compteurs par semaine : `9 terminées · 3 abandonnées`
- [ ] Filtre par Membre
- [ ] Pour chaque semaine et chaque personne : son **Affectation de la semaine**, puis ses
      Tâches Terminées et Abandonnées
- [ ] **Pas de compteur de jours par Client, pas de cumul mensuel.** C'est explicitement hors
      scope — la donnée est stockée, l'écran viendra si le besoin devient réel
