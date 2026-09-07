# E4 — Engagement et Report · **Invariants 4, 5**

## BRU-20 — Le champ Engagement

- [ ] Un **seul** champ de date sur une Tâche
- [ ] Le mot **« échéance »**, « deadline » ou « date limite » n'apparaît **nulle part** dans
      l'interface, ni dans le code
- [ ] **Aucune pastille rouge « en retard »** : Bruno n'a pas de retard, il a des Reports assumés
- [ ] Vaut **le jour même par défaut** quand une Tâche entre Sur le feu
- [ ] Une Tâche `À venir` en porte un aussi
- [ ] Quand la date d'une Tâche À venir arrive, le Point du matin **le propose** — rien ne
      bouge tout seul *(invariant 1)*

## BRU-21 — La feuille de Report

Maquette : `Bruno iOS v2` → écran « Feuille de Report ». Elle est conforme, la suivre telle quelle.

- [ ] **Raison obligatoire** : trois choix rapides (*pas eu le temps* / *bloqué par quelqu'un* /
      *plus prioritaire*) ou saisie libre. Sans raison, on ne peut pas valider
- [ ] Nouvel Engagement : `demain` pré-sélectionné, `lundi prochain`, `autre date`
- [ ] Bouton primaire `Reporter à demain`, et **`Abandonner cette Tâche` juste en dessous**
- [ ] En-tête rappelant `déjà reporté N×`
- [ ] L'Engagement ne change **que** par ce chemin *(invariant 4)* — aucune autre écriture
      sur le champ, API comprise

## BRU-22 — Le compteur de Reports

- [ ] `reporté N×` visible **de tous**, sur la carte et sur le détail
- [ ] Badge visuel au-delà de **3 Reports**, sur le board et dans le bandeau du Daily
- [ ] **Aucun blocage automatique** — c'est un signal, pas une punition
- [ ] Chaque Report est historisé avec sa raison et son auteur
