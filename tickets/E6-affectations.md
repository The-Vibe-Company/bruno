# E6 — Affectations · **Invariant 6**

> Une Tâche a une fin, être sur une Affectation a une durée. On ne la coche jamais.
>
> **Vocabulaire tranché le 7 septembre** : le mot est `Affectation`, pas `Client` — `Interne`
> n'est pas un client. Un seul mot dans l'interface ; dans le schéma, deux tables.

## BRU-26 — La liste des Affectations

Table `affectation` : ce à quoi on peut travailler. MONKA, AFP, Coup de Pâtes, Interne, Bergamote.

- [x] Liste ouverte, ajout en une ligne depuis les Réglages web
- [x] `Interne` en fait partie — c'est pour ça que le mot n'est pas « Client »
- [x] On **désactive** ; on ne supprime que ce qui n'a **jamais servi** (BRU-43) : l'historique ne doit pas se trouer
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

## BRU-28 — Affichage des Affectations · **livré, web et iOS**

On voit son Affectation partout et on peut en sortir, mais rien ne permet d'en prendre une.
Les Réglages ne s'en occupent pas volontairement : ça se change là où ça se voit.

- [x] **iOS « Aujourd'hui »** : épinglées en tête, une ligne par Affectation, à sa couleur,
      libellées `Affectation · depuis le 4 sept. · MONKA`, avec le bouton « Je ne suis plus dessus ».
      Plusieurs Affectations : une ligne chacune, puis « + Ajouter une Affectation » ; vide :
      « Aucune Affectation » + « Choisir » → « Sur quoi es-tu ? » *(livré le 9 septembre)*
- [x] **Board web** : bandeau une ligne, `Antoine → MONKA · Stan → AFP, Interne · Victor → Coup de Pâtes`
- [x] **Daily** : les Affectations du jour, et celles de la veille dans le bloc Hier *(avec BRU-30)*
- [x] **Fait** : l'Affectation de la semaine au-dessus des Tâches de chacun *(avec BRU-31)*
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
Le bouton lui-même vit dans la notification iOS, qui attend l'app (BRU-25). Le Board n'affiche
rien : Antoine a retiré la ligne « toujours dessus ? » du bandeau le 9 septembre.*

## BRU-57 — Le bandeau se change en un clic · **livré le 14 septembre**

Antoine : « c'est pas beau, laisse juste le Annuler, pas besoin de confirmer ». Le bouton portait
une phrase entière — « Stan Girard n'est plus dessus » — qui passait à la ligne.

- [x] Cocher, c'est commencer aujourd'hui ; décocher, c'est ne plus être dessus. Rien à confirmer :
      la coche bouge tout de suite, le serveur suit, et si ça rate elle revient
- [x] Il ne reste qu'un « Fermer », discret, en bas à droite

## BRU-60 — Une Affectation ne se lit qu'une fois par période · **livré le 14 septembre**

Antoine, devant « Stan Girard · AFP · AFP » dans Fait : « ça a pas de sens qu'il y ait deux fois
AFP pour Stan ici, on s'en fout, mets-le qu'une fois ».

- [x] Quitter une Affectation puis la reprendre dans la même semaine ne la montre qu'une fois :
      ce qui compte, c'est sur quoi la personne était, pas en combien de passages
- [x] La période retenue va du premier début à la dernière fin — encore en cours si l'un des
      passages l'est. Vaut aussi pour le Daily, qui lit le même jour

## BRU-71 — Les Projets, au même titre que les Affectations · **livré le 15 septembre**

Antoine : « je veux au même titre que Affectations la même feature pour les Projets — exactement
la même feature, mais avec un nouveau type d'objet ; je veux que toutes les features
d'Affectations découlent sur Projets ».

- [x] **Un seul code pour les deux.** La mécanique vit dans `api/rattachements.ts`, paramétrée par
      un `genre` ; `affectations.ts` et `projets.ts` ne font que le fixer. Deux copies auraient
      divergé au premier correctif — « exactement la même », c'est le même code
- [x] Même table, colonne `genre` (migration 0007). La clé d'unicité la porte : un Projet peut
      s'appeler comme une Affectation
- [x] `/api/projets`, `/api/projets/{id}`, `/api/projets/en-cours`, `.../en-cours/{id}/fin`,
      `/api/projets/historique` — le miroir exact, documenté dans l'OpenAPI
- [x] **Réglages** : une liste Projets sous les Affectations, mêmes gestes (ajouter avec sa couleur,
      Désactiver, Supprimer si ça n'a jamais servi)
- [x] **Board, Daily, Weekly** : **un seul bandeau**, une ligne par personne, le nom écrit une
      fois, puis **deux colonnes** séparées d'un filet — les Affectations, les Projets. Chacune
      s'ouvre sur son propre sélecteur. L'Affectation porte le trait plein et le nom en gras, le
      Projet un trait fin et plus léger. *(Deux bandeaux superposés répétaient les mêmes noms pour
      rien ; tout mélanger dans une case ne laissait plus voir les deux axes.)*
- [x] **Fait** : les Projets de la semaine à côté des Affectations ; **Daily** : ceux du jour d'avant
- [x] 4 tests de plus : les deux listes ne se mélangent pas, et poser un identifiant d'Affectation
      sur un Projet est refusé

