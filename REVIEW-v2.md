# Revue du design v2 — à renvoyer à Claude Design

> **Mis à jour le 7 septembre, après la passe light mode.** L'état à jour des maquettes —
> ce qui est livré, ce qui manque, ce qui a régressé — vit désormais dans
> [tickets/E9-design.md](./tickets/E9-design.md). Ce document garde la revue de fond du v2 ;
> E9 est la liste opérationnelle à envoyer.
>
> Depuis cette revue : **Récurrences livré** (point 4 partiellement résolu) · **Réglages web
> livré mais sa section « Affectations » gère en fait les Clients** (point 4 toujours ouvert) ·
> **le droit d'entrée (point 1) et le widget (point 3) restent manquants** · **deux régressions
> nouvelles sur le Board light** (rangs numérotés, `la précédente n'est pas faite`).

Relecture de `Bruno iOS v2.dc.html` et `Bruno Web v2.dc.html` contre le [PRD](./PRD.md).
`support.js` est le runtime du canvas, sans contenu produit.

## Ce qui est juste — ne pas y toucher en v3

- **Feuille de Report** : raison obligatoire avec les trois choix rapides *pas eu le temps /
  bloqué par quelqu'un / plus prioritaire*, saisie libre, « demain » pré-sélectionné,
  « Abandonner cette Tâche » en troisième option. Conforme aux règles 8 à 10.
- **Relance sur écran verrouillé** : groupée, actionnable (Terminé / Reporter), ton du Bilan correct.
- **Créneaux dans les Réglages iOS** : Point du matin et Bilan sans « Retirer », Rappels retirables,
  « + Ajouter un Créneau ». La règle de position est bien rendue.
- **Transcription brute** conservée sous les Notes, séparée par un filet.
- **Aucune occurrence d'« échéance »**, aucune pastille rouge de retard, `reporté 3×` en orange.
- **Rangs numérotés uniquement dans À faire** ; aucun numéro dans En cours ni Bloqué.
- **Aucun champ Client sur une Tâche.** **Affectation sans case à cocher.**
- État `hors ligne · 2 en attente d'envoi` visible dans la Capture.
- `la précédente n'est pas faite` sur une occurrence de Récurrence (règle 22).

## Corrections attendues en v3

### 1. Le formulaire du droit d'entrée Sur le feu — manquant, et contourné

**Invariant 2** : pas d'entrée Sur le feu sans Assigné **et** Engagement. Le mini-formulaire
à deux champs n'est designé **ni sur iOS, ni sur le web**.

Pire : sur les deux plateformes, la carte À trier porte un bouton **« Sur le feu » en un tap**
qui ne demande rien. Il doit **ouvrir le formulaire**, pré-rempli « moi » + « aujourd'hui »,
validable en un tap — jamais créer la Tâche directement.

À designer : la feuille modale iOS, et son équivalent web (au drop dans le kanban et au clic
sur le bouton).

### 2. « À trier » devient officiellement le quatrième Bucket — acté

Le design en a fait une zone de plein droit, sur les deux plateformes. **C'est accepté et le PRD
a été mis à jour.** Idées n'est plus une boîte de réception : c'est une réserve choisie.
Rien à corriger — juste à assumer partout dans le vocabulaire.

### 3. Le widget écran d'accueil — manquant

C'est le meilleur levier du pilier 1 (supprimer les trois secondes d'ouverture d'app) et il
n'est pas designé. Un tap → capture vocale directe, sans passer par l'app.

### 4. Deux écrans web manquants

L'en-tête annonce « Board, Daily, Terminé, Récurrences, Réglages » mais seuls **Board, Daily
et Terminé** existent.

- **Récurrences** : liste des règles + création (titre, Assigné obligatoire, fréquence, nombre
  d'occurrences, Engagements échelonnés). La récurrence est dans le scope V1.
- **Réglages web** : Créneaux, **liste des Clients**, **gestion des Affectations**. Conséquence
  actuelle : il n'existe aucun endroit pour **poser** une Affectation, alors qu'elle s'affiche partout.

### 5. Renommer l'écran « Terminé » en « Fait »

Il contient les Tâches Terminées **et** Abandonnées, alors que `Terminé` désigne un état précis
du glossaire. Collision de vocabulaire.

### 6. Points mineurs

- Les Réglages iOS n'empêchent pas de retirer les deux Rappels, ce qui ferait tomber sous le
  minimum de trois Créneaux. Prévoir l'état désactivé.
- Une seule Affectation est montrée sur iOS ; le web en montre plusieurs (Stan → AFP, Interne).
  Designer le cas multiple sur mobile.

## Décisions de design validées

- Le **Daily** fonctionne par filtre de personne, pas par colonne par personne. **Accepté** —
  le PRD a été mis à jour.
- Le **tri se fait aussi sur mobile**. **Accepté** — l'interdiction porte uniquement sur la
  réorganisation du Rang au pouce.
- Sur « Aujourd'hui », l'ordre **En cours → À faire → Bloqué** est meilleur que celui du PRD.
  **Accepté.**
