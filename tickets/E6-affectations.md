# E6 — Affectations et Clients · **Invariant 6**

> Une Tâche a une fin, une Affectation a une durée. On ne la coche jamais.

## BRU-26 — Les Clients

- [ ] Liste ouverte, ajout en une ligne depuis les Réglages web
- [ ] `Interne` fait partie de la liste — c'est le Client des journées non facturables
- [ ] On **désactive**, on ne supprime **jamais** : l'historique des Affectations ne doit pas
      se trouer
- [ ] Une couleur par Client, utilisée sur les bandeaux d'Affectation
- [ ] **Un Client ne se pose jamais sur une Tâche.** Aucun champ Client sur `tache`

## BRU-27 — Les Affectations

- [ ] Un Membre + un Client + une date de début, date de fin nullable
- [ ] **Plusieurs simultanées** sont normales, sans limite
- [ ] **Continues** : pas de jours sélectionnés, pas de demi-journées, pas de pourcentages
- [ ] **Aucune case à cocher, jamais** *(invariant 6)*. Unique action : « je ne suis plus dessus »,
      qui pose la date de fin au jour même
- [ ] L'historique est conservé — c'est lui qui répond à « hier j'étais sur MONKA »
- [ ] Ni Engagement, ni Statut, ni Rang, ni Report sur une Affectation

## BRU-28 — Affichage des Affectations · **bloqué par BRU-36**

Les Réglages web existent, mais leur section « Affectations » gère en réalité les **Clients**.
Il n'y a toujours nulle part où *poser* une Affectation.

- [ ] **iOS « Aujourd'hui »** : épinglées en tête, une ligne par Client, à la couleur du Client,
      libellées `MONKA · depuis le 3 sept.`, avec le bouton « Je ne suis plus dessus ».
      **Gérer le cas de plusieurs Affectations** — la maquette n'en montre qu'une
- [ ] **Board web** : bandeau une ligne, `Antoine → MONKA · Stan → AFP, Interne · Victor → Coup de Pâtes`
- [ ] **Daily** : les Affectations du jour, et celles de la veille dans le bloc Hier
- [ ] **Fait** : l'Affectation de la semaine au-dessus des Tâches de chacun
- [ ] **Réglages web** : l'endroit où on en **pose** une. Il n'existe nulle part aujourd'hui

## BRU-29 — La relance des Affectations qui traînent

- [ ] Une Affectation ouverte depuis **plus de 14 jours** ajoute une ligne discrète au Point
      du matin : « toujours sur MONKA ? », avec un bouton pour la fermer *(règle 25)*
- [ ] C'est la seule protection contre une donnée qui devient fausse au bout d'un trimestre
