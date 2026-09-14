# E9 — Design · **terminé**

État au **7 septembre**, après la v3. **Plus aucun ticket de développement n'attend une maquette.**
Les quatre fichiers sont à parité : `Bruno Web v2`, `Bruno Web v2 - Light`, `Bruno iOS v2`,
`Bruno iOS v2 - Light`.

## ✅ BRU-37 — Le formulaire du droit d'entrée Sur le feu · **livré**

Présent sur les **quatre** fichiers. Deux champs et deux seulement : `Assigné` pré-rempli
« A Antoine · moi », `Engagement` pré-rempli « lundi 7 septembre · aujourd'hui ». Boutons
`Passer Sur le feu` et `Annuler`. Le web ajoute un état d'annulation explicite —
*« Passage annulé — Refaire le pitch deck reste à trier »* avec `Réessayer`.

L'invariant 2 est enfin matérialisé à l'écran. **Débloque BRU-13.**

## ✅ BRU-41 — Le détail d'une Tâche sur le web, et sa feuille de Report · **livré**

Panneau latéral, sans quitter le Board. En-tête `Sur le feu · À faire` et `Supprimer` en
secondaire. Titre, `À faire · reporté 3×`, puis Assigné, Aidants, Engagement, Statut, Reports.
Les Notes avec la transcription brute en italique. Actions `Terminé` · `Reporter` · `Abandonner`.

La feuille de Report web reprend fidèlement l'iOS : `Pourquoi ?` avec les trois choix rapides et
la saisie libre, `demain` pré-sélectionné, `Abandonner cette Tâche` sous le bouton principal.

## ✅ BRU-34 — Widget d'écran d'accueil iOS · **livré**

Deux tailles sur l'écran d'accueil — la petite `Bruno · Capturer`, la moyenne
`Capturer une idée · 3 engagements aujourd'hui · 1 à trier`. Et les **trois états** :
*Repos*, *Enregistrement* (appui maintenu, « J'écoute », chrono, « Relâcher pour envoyer »),
*Envoyé* (2 s puis retour au repos). **Débloque BRU-10.**

## ✅ BRU-40 — Le bandeau Affectation devient interactif · **livré**

État vide, sélecteur et cas multiple, sur les quatre fichiers. Le sélecteur dit explicitement
**« Une ou plusieurs · à partir d'aujourd'hui »**, ce qui lève l'ambiguïté qu'on avait laissée.
L'écran « plusieurs en même temps » montre MONKA et Interne côte à côte, chacun avec
« Je ne suis plus dessus », plus « + Ajouter une Affectation ».

Bergamote, désactivée, n'apparaît pas dans le sélecteur : la règle de désactivation tient
jusque dans les maquettes. **Débloque BRU-28.**

## ✅ Les trois décisions du 7 septembre sont répercutées

- Les **rangs numérotés** ont disparu du Board sombre.
- **`la précédente n'est pas faite`** est absent des quatre fichiers.
- L'écran web s'appelle désormais **« Fait »**.

## Un détail à trancher au développement, pas au design

Le libellé de l'état vide différait entre les plateformes : le web disait **« Aucune Affectation »**,
l'iOS **« Sur rien aujourd'hui »**. **Tranché avec BRU-28 : « Aucune Affectation » partout.**

## BRU-65 — Le rail se nomme au survol · **livré le 14 septembre**

Antoine : « on hover des icônes à gauche je veux une tooltip avec le titre de la section ».

- [x] Chaque entrée du rail dit son nom au survol, à côté de l'icône — Board, Daily, Weekly,
      Fait, Récurrences, Réglages, et Mon compte
- [x] Elle apparaît après un court délai (le temps de distinguer un survol d'un passage de
      souris) et disparaît net

## BRU-66 — La navigation ne fait plus attendre · **livré le 14 septembre**

Antoine : « je trouve le site assez lent, les clics et tout, ça manque de fluidité ».

- [x] Le rail passe dans un **layout** : il ne se re-rend plus à chaque page. Le cadre reste,
      seule la page change
- [x] Un **`loading.tsx`** : un clic montre la page suivante tout de suite, au lieu d'attendre le
      serveur sans rien afficher. C'est aussi ce qui permet à Next de préparer les pages à l'avance
- [x] `sessionCourante()` est mise en cache le temps d'un rendu : une requête de base au lieu de
      deux par page
- [x] Weekly : la liste des semaines s'arrête aux quatre dernières, plus celles qui ont servi —
      elle ne descend plus jusqu'en juin

