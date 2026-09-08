# E6 — Affectations · **Invariant 6**

> Une Tâche a une fin, être sur une Affectation a une durée. On ne la coche jamais.
>
> **Vocabulaire tranché le 7 septembre** : le mot est `Affectation`, pas `Client` — `Interne`
> n'est pas un client. Un seul mot dans l'interface ; dans le schéma, deux tables.

## BRU-26 — La liste des Affectations

Table `affectation` : ce à quoi on peut travailler. MONKA, AFP, Coup de Pâtes, Interne, Bergamote.

- [x] Liste ouverte, ajout en une ligne depuis les Réglages web
- [x] `Interne` en fait partie — c'est pour ça que le mot n'est pas « Client »
- [x] On **désactive**, on ne supprime **jamais** : l'historique ne doit pas se trouer
- [x] Une couleur par Affectation, utilisée sur les bandeaux
- [x] **Une Affectation ne se pose jamais sur une Tâche.** Aucune colonne de ce genre sur `tache`

## BRU-27 — Qui est sur quoi

Table `affectation_membre` : la période pendant laquelle quelqu'un est sur une Affectation.
Ce second mot n'apparaît **jamais** dans l'interface — elle dit simplement « Affectation : MONKA ».

- [x] Un Membre + une Affectation + une date de début, date de fin nullable
- [x] **Plusieurs simultanées** sont normales, sans limite
- [x] **Continues** : pas de jours sélectionnés, pas de demi-journées, pas de pourcentages
- [x] **Aucune case à cocher, jamais** *(invariant 6)*. Unique action : « je ne suis plus dessus »,
      qui pose la date de fin au jour même
- [x] L'historique est conservé — c'est lui qui répond à « hier j'étais sur MONKA »
- [x] Ni Engagement, ni Statut, ni Rang, ni Report sur une Affectation

## BRU-28 — Affichage des Affectations · **web livré, iOS en attente de l'app**

On voit son Affectation partout et on peut en sortir, mais rien ne permet d'en prendre une.
Les Réglages ne s'en occupent pas volontairement : ça se change là où ça se voit.

- [ ] **iOS « Aujourd'hui »** : épinglées en tête, une ligne par Client, à la couleur du Client,
      libellées `MONKA · depuis le 3 sept.`, avec le bouton « Je ne suis plus dessus ».
      **Gérer le cas de plusieurs Affectations** — la maquette n'en montre qu'une
- [x] **Board web** : bandeau une ligne, `Antoine → MONKA · Stan → AFP, Interne · Victor → Coup de Pâtes`
- [x] **Daily** : les Affectations du jour, et celles de la veille dans le bloc Hier *(avec BRU-30)*
- [ ] **Fait** : l'Affectation de la semaine au-dessus des Tâches de chacun *(avec BRU-31)*
- [x] **Prendre une Affectation** se fait en cliquant le bandeau, sur iOS comme sur le web —
      pas dans les Réglages, qui ne gèrent que la liste (BRU-40). *Web : fait. Ma case s'ouvre sur
      « Sur quoi es-tu aujourd'hui ? », une ou plusieurs, à partir d'aujourd'hui ; décocher, c'est
      « je ne suis plus dessus ». Les autres cases se lisent, ne se cliquent pas.*
- [x] L'état vide s'appelle **« Aucune Affectation »** partout — tranché ici, pas au design

## BRU-29 — La relance des Affectations qui traînent

- [x] Une Affectation ouverte depuis **plus de 14 jours** ajoute une ligne discrète au Point
      du matin : « toujours sur MONKA ? », avec un bouton pour la fermer *(règle 25)*
- [x] C'est la seule protection contre une donnée qui devient fausse au bout d'un trimestre

*Fait : le Point du matin porte `aFermer` — les périodes qui traînent, avec leur nom — pour que
le client mette un bouton « je ne suis plus dessus » (`POST /api/affectations/en-cours/{id}/fin`).
Le bouton lui-même vit dans la notification iOS, qui attend l'app (BRU-25). En attendant, le
Board montre la même ligne discrète sur ma case : `MONKA · toujours dessus ? · depuis le 20 août`.*
