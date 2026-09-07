# E3 — Sur le feu

## BRU-15 — Kanban à trois Statuts

- [ ] `À faire` · `En cours` · `Bloqué`. Le Statut **n'existe que dans Sur le feu**
- [ ] Glisser entre colonnes change le Statut
- [ ] `Terminé` **n'est pas une quatrième colonne** — c'est une action, et la Tâche quitte le board

## BRU-16 — Le Rang

- [ ] La position dans la liste **est** la priorité. Aucune échelle, aucun niveau,
      **aucun drapeau « urgent »**
- [ ] Le numéro n'est affiché **que dans la colonne À faire** de Sur le feu
- [ ] Rang propre à chaque liste — le rang 1 d'À faire n'a rien à voir avec celui d'À venir
- [ ] Réordonnancement par glisser, **web uniquement**

## BRU-17 — Les trois fins

- [ ] **Terminé** — action principale, la Tâche quitte le board immédiatement
- [ ] **Abandonné** — visible à côté de Terminé, la Tâche reste consultable dans Fait
- [ ] **Supprimé** — dans un menu secondaire, avec confirmation, sans aucune trace
- [ ] **N'importe quel Membre peut terminer n'importe quelle Tâche** — aucun verrou d'édition
- [ ] Aucun état terminal n'est jamais déduit *(invariant 5)*

## BRU-18 — Écran « Aujourd'hui » iOS

Maquette : `Bruno iOS v2` → écran « Aujourd'hui ».

- [ ] En-tête : date, « Aujourd'hui », avatar
- [ ] Bandeau **Affectations** épinglé (voir BRU-28)
- [ ] Mes Tâches Sur le feu dont l'Engagement est aujourd'hui ou avant, groupées par Statut,
      dans l'ordre **En cours → À faire → Bloqué**
- [ ] Section distincte **« J'aide sur »** pour les Tâches dont je suis Aidant
- [ ] `reporté N×` en orange sous le titre quand N > 0
- [ ] Un cercle à cocher par Tâche ; celui d'une Tâche Bloqué est en pointillés

## BRU-19 — Détail d'une Tâche iOS

Maquette : `Bruno iOS v2` → écran « Détail d'une Tâche ».

- [ ] Titre, puis `Statut · reporté N×`
- [ ] Champs : Assigné, Aidants, Engagement, Statut, Reports (lecture seule)
- [ ] Notes, avec la **transcription brute en italique** sous un filet
- [ ] Actions : `Terminé` en primaire, `Reporter` et `Abandonner` côte à côte
- [ ] `Supprimer` dans le menu `···`
