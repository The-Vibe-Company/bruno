# E3 — Sur le feu

## BRU-15 — Kanban à trois Statuts · **livré**

- [x] `À faire` · `En cours` · `Bloqué`. Le Statut **n'existe que dans Sur le feu** — contrainte
      Postgres (BRU-2), et le kanban est la page d'accueil du web
- [x] Glisser entre colonnes change le Statut — dnd-kit, la décision est une fonction pure
      (`board/deplacement.ts`) couverte par 6 tests, puis `POST /statut` ; vérifié dans le
      navigateur et en base
- [x] `Terminé` **n'est pas une quatrième colonne** — le cercle de la carte termine, la Tâche
      quitte le board au rafraîchissement

## BRU-16 — Le Rang · **livré avec BRU-15** (même geste de glisser)

- [x] La position dans la liste **est** la priorité. Aucune échelle, aucun niveau,
      **aucun drapeau « urgent »**
- [x] **Aucun numéro affiché nulle part.** Ce qu'on fait en premier est en haut de la pile ;
      un chiffre en plus ne dit rien que la position ne dise déjà
- [x] Rang propre à chaque liste — le rang 1 d'À faire n'a rien à voir avec celui d'À venir
- [x] Réordonnancement par glisser, **web uniquement** — se placer entre deux voisines,
      le serveur calcule le Rang en `numeric` : une carte glissée entre 6 et 7 vaut 6.5, vérifié
      en base

## BRU-17 — Les trois fins · **livré**

Le détail d'une Tâche s'ouvre en panneau latéral au clic sur une carte (maquette web v3),
sans quitter le Board. Les trois fins y vivent, chacune à sa place.

- [x] **Terminé** — action principale (le cercle de la carte, et le bouton primaire du panneau),
      la Tâche quitte le board immédiatement
- [x] **Abandonné** — visible à côté de Terminé dans le panneau, la Tâche reste consultable
      dans Fait (BRU-31)
- [x] **Supprimé** — dans l'en-tête du panneau, discret, derrière une **confirmation** qui
      rappelle la différence avec Abandonner. Vérifié : plus aucune ligne en base
- [x] **N'importe quel Membre peut terminer n'importe quelle Tâche** — testé dans BRU-3 (un
      Aidant termine)
- [x] Aucun état terminal n'est jamais déduit *(invariant 5)* — contrainte Postgres, et une
      seconde fin est refusée (`409 déjà une fin`), vérifié dans le navigateur
- [ ] ⚠️ **À décider (produit)** : Terminé se fait d'un clic sur le cercle, **sans confirmation
      ni annulation**. En testant, des clics parasites ont terminé deux Tâches. Deux pistes
      compatibles avec le PRD : une bannière « Terminé · Annuler » quelques secondes, ou ne
      terminer que depuis le panneau. Pas tranché ici — ce n'est pas au code de le décider

## BRU-18 — Écran « Aujourd'hui » iOS · **livré le 9 septembre**

Maquette : `Bruno iOS v2` → écran « Aujourd'hui ».

- [x] En-tête : date, « Aujourd'hui », avatar
- [x] Bandeau **Affectations** épinglé (voir BRU-28)
- [x] Mes Tâches Sur le feu dont l'Engagement est aujourd'hui ou avant, groupées par Statut,
      dans l'ordre **En cours → À faire → Bloqué**
- [x] Section distincte **« J'aide sur »** pour les Tâches dont je suis Aidant
- [x] `reporté N×` en orange sous le titre quand N > 0
- [x] Un cercle à cocher par Tâche ; celui d'une Tâche Bloqué est en pointillés

## BRU-19 — Détail d'une Tâche iOS · **livré le 9 septembre**

Maquette : `Bruno iOS v2` → écran « Détail d'une Tâche ».

- [x] Titre, puis `Statut · reporté N×`
- [x] Champs : Assigné, Aidants, Engagement, Statut, Reports — *et depuis le 9 septembre, le titre,
      l'Assigné, les Aidants et les Notes se modifient sur place (BRU-48), le Statut aussi — Bloqué avec
      sa raison — et l'Engagement : par le Report Sur le feu, librement ailleurs (BRU-49)*
- [x] Notes, avec la **transcription brute en italique** sous un filet
- [x] Actions : `Terminé` en primaire, `Reporter` et `Abandonner` côte à côte
- [x] `Supprimer` dans le menu `···`

## BRU-44 — Bloqué avec une raison · **livré le 9 septembre**

- [x] Bloquer exige une raison (raisons toutes prêtes, ou ses mots) ; elle se lit sur la carte, se
      change depuis le détail, s'efface en sortant de Bloqué, et le Point du matin la nomme
- [x] Le Board et le Daily sont plus denses : typo, bandeau, colonnes, cartes, panneau

## BRU-45 — Cartes épurées, Assigné en un clic, détail modifiable · **livré le 9 septembre**

- [x] Plus de poignée sur les cartes ; l'avatar de l'Assigné grandit et se clique pour changer d'Assigné
- [x] Même hauteur pour toutes les cartes : la raison du blocage tient sur la ligne du bas
- [x] Le détail se modifie : titre, Assigné, Aidants, Notes — l'Engagement Sur le feu reste au Report
- [x] Le Daily garde le code couleur ; ⌘-clic sur le filtre par Membre garde seulement celui-là

## BRU-46 — Aperçu du glisser entre colonnes, bandeau sur une ligne · **livré le 9 septembre**

- [x] Vers une autre colonne, la carte entre pendant le glisser, à la hauteur où elle atterrira
- [x] Le bandeau Affectations tient sur une ligne, avec depuis quand en petit (j · sem. · mois)

## BRU-47 — Rouvrir une Tâche finie par erreur · **livré le 9 septembre**

Un doigt qui glisse sur « Terminé » n'efface rien.

- [x] `POST /api/taches/{id}/rouvrir` : la fin s'efface, Bucket, Statut et Engagement sont restés
- [x] iOS : « Annuler » pendant six secondes après Terminé / Abandonner ; section « Fait récemment »
      sur Aujourd'hui (mes Tâches finies ces sept derniers jours) avec « Rouvrir »
- [x] Web : le même « Annuler » de six secondes sur le Board
