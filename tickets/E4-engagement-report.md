# E4 — Engagement et Report · **Invariants 4, 5**

## BRU-20 — Le champ Engagement · **livré**

- [x] Un **seul** champ de date sur une Tâche — `tache.engagement`, et rien d'autre (BRU-2)
- [x] Le mot **« échéance »**, « deadline » ou « date limite » n'apparaît **nulle part** — un test
      parcourt tout le code, commentaires compris, et bannit aussi « en retard » / « overdue »
- [x] **Aucune pastille rouge « en retard »** : une date passée s'affiche comme une date
      (`4 sept.`), testé
- [x] Vaut **le jour même par défaut** quand une Tâche entre Sur le feu — la modale du droit
      d'entrée (BRU-13). L'API, elle, exige la date explicitement : c'est au client de la montrer
- [x] Une Tâche `À venir` en porte un aussi — passer À venir demande « Pour quand ? » (demain ·
      lundi · autre date), avec « sans date » pour ce qu'on ne sait pas encore placer. Vérifié
      dans le navigateur et en base. *Petit écart à la maquette : cette invite n'y figure pas ;
      à montrer à Claude Design pour la forme*
- [x] Quand la date d'une Tâche À venir arrive, rien ne bouge tout seul *(invariant 1)* — test
      « aucun job n'écrit une Tâche » (BRU-11). La proposition au Point du matin : BRU-24
- [x] **Un trou fermé dans l'invariant 4** : `PATCH` laissait changer l'Engagement d'une Tâche
      Sur le feu sans Report. Désormais refusé (`422 · seulement par un Report`) ; ailleurs
      qu'Sur le feu, on planifie librement. Testé

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
