# Grille de relecture design — Bruno

À passer sur chaque itération de design avant ticketisation. Chaque ligne sort d'un invariant
ou d'une règle du [PRD](./PRD.md). Un « non » n'est pas un détail esthétique : c'est le modèle
qui fuit.

## Le vocabulaire

- [ ] Le mot **« échéance »**, « deadline » ou « date limite » n'apparaît **nulle part**. On dit
      **Engagement** (affiché « Prévu le »).
- [ ] Aucune pastille rouge « en retard ». Bruno n'a pas de retard : il a des **Reports assumés**.
- [ ] Les termes du glossaire sont utilisés tels quels : Sur le feu · À venir · Idées · À faire ·
      En cours · Bloqué · Assigné · Aidant · Affectation · Report · Relance.
- [ ] Tout est en français, y compris les micro-copies de boutons et de notifications.

## Les invariants

- [ ] **Inv. 1** — Rien ne déplace une Tâche automatiquement. Aucune vue « calculée » à partir
      d'une date.
- [ ] **Inv. 2** — Le **droit d'entrée Sur le feu** est matérialisé : un mini-formulaire à deux
      champs (Assigné, Engagement), **pré-remplis** « moi » + « aujourd'hui », validable en un tap.
      Ni blocage sec, ni défaut silencieux.
- [ ] **Inv. 3** — Pas de 4e bucket, pas d'inbox séparée. **Idées est la boîte de réception**,
      avec son compteur `À trier`.
- [ ] **Inv. 4** — L'Engagement ne change que par un Report. Aucun autre chemin dans l'UI.
- [ ] **Inv. 5** — Rien n'est coché automatiquement.
- [ ] **Inv. 6** — Une **Affectation n'a pas de case à cocher**. Son unique action est
      « je ne suis plus dessus ». C'est exactement la douleur Notion qu'on tue.

## Le modèle

- [ ] Aucune échelle de priorité, aucun P0/P1, **aucun flag « urgent »**. Le Rang seul.
- [ ] Le **numéro de rang** n'est affiché **que dans la colonne À faire** de Sur le feu.
- [ ] **Terminé n'est pas une 4e colonne** du kanban — c'est une action, la Tâche quitte le board.
- [ ] **Abandonner** est visible à côté de Fait. **Supprimer** est planqué dans un menu secondaire.
- [ ] **Aucun champ Client sur une Tâche.** Le Client ne vit que sur l'Affectation.
- [ ] Un seul Assigné. Les **Aidants** apparaissent dans une liste distincte (« J'aide sur »).
- [ ] Le compteur `Reporté N×` est visible, et badge au-delà de 3.

## Le Report

- [ ] La **raison est obligatoire** — saisie libre ou choix rapide. Pas de snooze en un tap.
- [ ] Nouvelle date **demain par défaut**, modifiable en un tap.
- [ ] **« Abandonner » est proposé** comme troisième option dans la feuille de Report.

## Les Relances

- [ ] La notification est **groupée**, jamais une par Tâche.
- [ ] Elle est **actionnable sans ouvrir l'app** : « Fait » et « Reporter » en appui long.
- [ ] Les Réglages ne contiennent **que des heures** (min. 3) — aucun réglage de « type ».

## La Capture

- [ ] La Capture n'atterrit **jamais Sur le feu**. Toujours dans Idées, marquée `À trier`.
- [ ] Pas d'écran de confirmation bloquant après la capture vocale.
- [ ] La **transcription brute** est visible dans les Notes, sous le titre nettoyé.
- [ ] Un état hors ligne / file d'attente est prévu visuellement.

## Le scope

- [ ] Les **8 écrans iOS** du PRD sont là : Widget · Capture · Aujourd'hui · Buckets · Détail ·
      Feuille de Report · Réglages · Notifications actionnables.
- [ ] Les **5 écrans web** sont là : Board · Daily · Fait · Récurrences · Réglages.
- [ ] **Pas de drag de rang sur mobile.**
- [ ] Aucun écran en trop. Tout écran absent du PRD est du scope creep à discuter avant de coder.
