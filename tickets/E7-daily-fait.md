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

- [x] Groupé par semaine, la semaine courante marquée « en cours »
- [x] Compteurs par semaine : `9 terminées · 3 abandonnées`
- [x] Filtre par Membre
- [x] Pour chaque semaine et chaque personne : son **Affectation de la semaine**, puis ses
      Tâches Terminées et Abandonnées
- [x] **Pas de compteur de jours par Client, pas de cumul mensuel.** C'est explicitement hors
      scope — la donnée est stockée, l'écran viendra si le besoin devient réel

## BRU-58 — Le Daily ne dit plus « Hier » pour vendredi · **livré le 14 septembre**

Antoine, un lundi : « On est lundi 14… » sous un bloc intitulé « Hier · vendredi 11 septembre ».

- [x] La colonne prend le nom du jour qu'elle montre : « Hier » quand c'en est un, sinon
      « Vendredi 11 septembre ». Le Daily se lit à voix haute : le titre ne doit pas mentir
- [x] « Affectations de la veille » devient « Affectations ce jour-là » quand ce n'est pas la veille

## BRU-59 — Où vont les Tâches terminées, en clair · **livré le 14 septembre**

Antoine : « il manque un truc hyper clair : où vont les Tâches terminées du jour et de la veille ».
Une Tâche cochée disparaissait, avec pour seul recours un « Annuler » de six secondes.

- [x] Une quatrième section **Fait** en bas du panneau, ouverte par défaut : les Tâches terminées
      ou abandonnées depuis le dernier jour ouvré, avec le jour, l'Assigné et **Rouvrir**
- [x] « Tout voir » mène à Fait, où l'historique complet vit
- [x] Le rail replié montre la pastille Fait et son compte

## BRU-61 — La fiche d'une Tâche faite · **livré le 14 septembre**

Antoine : « j'aimerais pouvoir cliquer sur une tâche faite pour voir les notes, les Aidants, le
nombre de Reports et tout ».

- [x] Un clic sur une Tâche finie ouvre la même fiche : Notes, Assigné, Aidants, Engagement,
      Reports — depuis la section Fait du Board comme depuis la page Fait
- [x] L'en-tête dit « Terminé · 8 sept. » ou « Abandonné · … » ; le pied n'offre que **Rouvrir**
- [x] Ni Statut ni Report sur une Tâche finie : ils n'ont plus de sens
- [x] Les Aidants suivent la Tâche jusqu'au bout — `terminees()` les rend désormais

## BRU-62 — Le Weekly · **livré le 14 septembre**

Antoine : « je veux aussi un autre onglet en dessous de Daily qui s'appelle Weekly, et qui
rappelle les Affectations de chacun. Ça permet à chacun d'ajouter les sujets dont il veut parler.
Il peut mettre les skills qu'il a codé (le lien skillpack des skills). »

- [x] Un onglet **Weekly** sous Daily, avec le bandeau des Affectations en tête
- [x] Trois encarts repliables — *Skills of the week*, *Projects of the week*, *Wins of the week*
      *(deuxième version : la première, une colonne par personne, ne convenait pas)*
- [x] Des **Sujets** : pour qui, puis quoi. Entrée pour poser, la pastille se reclique pour changer
      de personne, ✕ pour retirer. N'importe qui écrit sur la liste de n'importe qui
- [x] **Un lien collé devient cliquable** : c'est comme ça qu'on montre un skill
- [x] Une semaine, une page blanche : rien ne se traîne d'une semaine à l'autre
- [x] Table `sujet` (migration 0005), `GET/POST /api/sujets`, `DELETE /api/sujets/{id}`, 6 tests

## BRU-63 — Fait : les colonnes s'alignent · **livré le 14 septembre**

Antoine : « les Tâches d'Antoine, comme il y a eu 2 Affectations, commencent plus bas que celles
de Victor qui n'en a pas eu ».

- [x] Les trois colonnes partagent leurs lignes (grille en `subgrid`) : le nom, les Affectations,
      les Tâches commencent à la même hauteur quel qu'en soit le nombre
- [x] Les Affectations se posent sur une ligne qui passe à la ligne, plus l'une sous l'autre
- [x] Chaque Tâche porte la pastille du Board — pleine si Terminé, pointillée si Abandonné — au
      lieu du mot en bout de ligne ; « Rien de fini » quand il n'y a rien

