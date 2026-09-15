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
- [x] Weekly : le menu ne garde que la semaine en cours et celles qui portent des Sujets
- [x] Le contour du clavier prend l'accent de Bruno : celui du navigateur est bleu, il jurait partout

## BRU-67 — Les gestes du Board s'affichent avant le serveur · **livré le 14 septembre**

Antoine : « je trouve encore le site lent ». Mesuré : la fonction tourne à **iad1 (Washington)**,
à côté de la base ; depuis Paris chaque requête traverse l'Atlantique. Un statique servi au bord
répond en **55 ms**, une page dynamique en **165 à 240 ms**. Un geste en coûtait deux (l'appel,
puis le rendu) : ~340 ms avant que l'écran bouge.

- [x] Changer d'Assigné, d'Aidants, de titre, de Notes : l'écran bouge tout de suite, le serveur
      suit. Si la requête échoue, la retouche s'annule et le message s'affiche
- [x] Terminé et Abandonné : la carte s'en va aussitôt, le toast avec ; « Annuler » la ramène net
- [x] Les Tâches de même Rang (il y en a dans les données de départ) ne sautent plus d'un rendu à
      l'autre : l'ordre se départage par date de création

**Reste, hors code :** pour descendre vraiment, il faut la base **en Europe** et les fonctions à
`cdg1`. C'est une migration de la base de production — la décision est à Antoine.

## BRU-68 — Changer d'onglet n'attend plus rien · **livré le 15 septembre**

Antoine, pour la troisième fois : « le site est très lent quand on change d'onglet ».

- [x] Les six pages du rail sont **préchargées en entier** (`prefetch`), pas seulement leur
      squelette : Next ne précharge une page dynamique que si on le lui demande
- [x] Le **cache du navigateur** garde une page visitée cinq minutes (`staleTimes`) — par défaut
      Next ne garde rien d'une page dynamique, donc chaque retour repayait l'aller-retour
- [x] Une modification appelle `router.refresh()`, qui vide ce cache : on ne lit jamais longtemps
      des données mortes
- [x] Mesuré sur une build de production : le Board s'affiche **150 ms** après le clic, le Daily
      **200 ms** — sans requête au serveur

**À savoir :** Next ne précharge **jamais** en mode développement. Sur `localhost:3001`, changer
d'onglet restera lent ; c'est sur `bruno.thevibecompany.co` que ça se juge.

## BRU-69 — Trois mouvements, pas plus · **livré le 15 septembre**

Antoine : « il n'y a pas beaucoup d'effets, genre un peu mignons, ça s'ouvre — quand les fenêtres
se ferment à droite, les panneaux, des petits trucs qui fluidifient le site ».

- [x] **Le panneau de droite** (la fiche d'une Tâche) entre par la droite et repart par la droite
- [x] **Les fenêtres** — droit d'entrée, Report, Pour quand, Blocage, les confirmations — grandissent
      d'un rien en apparaissant, et le voile se fond
- [x] **Les menus** (Statut, Assigné, Affectations) grandissent depuis le bouton qui les ouvre
- [x] Le **« Annuler »** après un Terminé monte au lieu d'apparaître
- [x] Court : 160 ms à l'aller, 130 ms au retour. Au-delà, on attend l'interface au lieu de s'en servir
- [x] `prefers-reduced-motion` : qui a demandé moins de mouvement n'en a aucun

