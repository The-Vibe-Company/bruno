# Bruno

La to-do partagée de l'entreprise. Un seul Espace, une seule liste, trois personnes.
Outil interne, jamais commercialisé.

Bruno tient sur deux principes, et tout le reste n'est que le minimum nécessaire pour
les servir :

1. **Capturer sans friction.** Une idée doit atterrir dans Bruno en quelques secondes,
   à la voix, depuis le mobile, sans jamais échouer.
2. **La to-do vient te voir.** On ne compte pas sur les Membres pour ouvrir Bruno.
   Bruno les relance.

## Language

### L'espace et les gens

**Espace**:
L'unique conteneur de toutes les Tâches de l'entreprise. Il n'y en a qu'un, il n'est pas
nommé dans l'UI, et il n'a pas de sous-division.
_Avoid_: Workspace, projet, équipe, board

**Membre**:
Une personne de l'entreprise ayant accès à l'Espace. Tous les Membres ont exactement les
mêmes droits : voir tout, éditer tout, supprimer tout. Un Membre a un type — `humain`
aujourd'hui, `agent` un jour — mais seuls les humains existent pour l'instant.
_Avoid_: Utilisateur, compte, admin, rôle

**Assigné**:
Le Membre unique responsable d'une Tâche. Zéro ou un, jamais plus. Une Tâche sans Assigné
est un état légitime dans À venir et dans Idées — jamais dans Sur le feu.
_Avoid_: Owner, responsable, propriétaire

**Aidant**:
Un Membre qui contribue à une Tâche sans en être responsable. Une Tâche peut en avoir
plusieurs. Les Aidants ne remplacent jamais l'Assigné et ne diluent pas sa responsabilité,
mais ils voient la Tâche chez eux, dans une liste distincte de celles dont ils répondent.
Aidant ou Assigné, n'importe qui peut passer une Tâche en Terminé.
_Avoid_: Co-assigné, collaborateur, participant, watcher

### L'objet central

**Tâche**:
L'unique objet métier du produit. Une chose à faire, portée par un titre. Tous ses autres
champs (Assigné, Aidants, Échéance) sont facultatifs.
_Avoid_: Item, ticket, todo, carte, issue

**Idée**:
Une Tâche sans Assigné ni Échéance, rangée dans le Bucket Idées. Ce n'est pas un objet
distinct : promouvoir une Idée en travail réel, c'est éditer une Tâche existante, jamais
en créer une nouvelle.
_Avoid_: Backlog item, brouillon, note

**Bucket**:
La section dans laquelle vit une Tâche, posée à la main par un Membre — jamais calculée.
Il en existe quatre et exactement quatre : **À trier**, **Sur le feu**, **À venir**, **Idées**.
Une Tâche est dans un et un seul Bucket.
_Avoid_: Colonne, catégorie, liste, statut

**À trier**:
Le Bucket où atterrit toute Capture, et le seul dans lequel une Tâche ne fait qu'attendre.
Elle y reste jusqu'à ce qu'un humain lui donne une destination. Son compteur est l'un des
deux signaux de santé de Bruno.
_Avoid_: Inbox, boîte de réception, non trié, brouillon

**Trier**:
Donner une destination à une Tâche qui est dans À trier, en choisissant un des trois autres
Buckets. Toujours un acte humain, jamais automatique. Trier vers Sur le feu déclenche le
droit d'entrée.
_Avoid_: Ranger, classer, dispatcher, traiter

**Sur le feu**:
Le Bucket des Tâches sur lesquelles l'équipe travaille maintenant ou dans les tout
prochains jours. Il n'existe pas de notion distincte d'« en cours » : sur le feu, c'est
en cours. Sur le feu a un droit d'entrée : **une Tâche ne peut y entrer sans un Assigné
et un Engagement.** C'est la seule règle de ce genre dans Bruno.
_Avoid_: En cours, urgent, now, sprint

**À venir**:
Le Bucket des Tâches qu'on s'est engagé à faire, mais pas tout de suite.
_Avoid_: Planifié, next, backlog, plus tard

**Idées**:
Le Bucket des Tâches qu'on veut garder sans s'y engager. Ce n'est **pas** une boîte de
réception : une Tâche n'y arrive que parce qu'un humain l'y a rangée. C'est une réserve
choisie, pas un fourre-tout.
_Avoid_: Inbox, someday, icebox, backlog

**Notes**:
Le seul champ libre d'une Tâche. Il n'y a ni commentaires, ni sous-tâches, ni pièces
jointes. La transcription brute d'une Capture vocale y est toujours conservée.
_Avoid_: Description, commentaire, détails

**Rang**:
La position d'une Tâche dans sa liste, et la seule expression de sa priorité. Le rang 1
est ce qu'on fait en premier. Il se change en remontant la Tâche, et il n'existe aucune
échelle de priorité en dehors de lui, et **aucun numéro affiché** : la priorité, c'est la
position dans la pile, et tout le monde sait lire une pile.
_Avoid_: Priorité, P0/P1, importance, poids, urgent

**Statut**:
La position d'une Tâche dans l'avancement du travail : **À faire**, **En cours**, **Bloqué**.
Le Statut n'existe que dans Sur le feu — une Idée ou une Tâche À venir n'en a pas. Terminé
n'est pas un Statut : c'est un état terminal, et la Tâche quitte le board.
_Avoid_: État, avancement, colonne, workflow, stage Bloqué porte toujours une raison — ce qu'on attend, et de qui — lisible sur la carte.

**Terminé**:
État terminal d'une Tâche qui a été faite. Posé à la main par un Membre, jamais déduit.
La Tâche quitte immédiatement le board.
_Avoid_: Done, fermé, complété, archivé

**Abandonné**:
État terminal d'une Tâche qu'on a décidé de ne pas faire. Distinct de Terminé — tuer une
idée proprement est un acte qui a sa valeur, et une Tâche Abandonnée reste consultable.
_Avoid_: Annulé, rejeté, wontfix

**Supprimer**:
Effacer définitivement une Tâche qui n'aurait jamais dû exister : un doublon, une Capture
ratée, une transcription incompréhensible. Rien à voir avec Abandonné, qui enregistre une
décision. Supprimer n'enregistre rien : la Tâche n'a jamais eu lieu.
_Avoid_: Archiver, corbeille, effacer

### Les affectations

**Affectation**:
Ce à quoi un Membre travaille : un client comme MONKA ou Coup de Pâtes, ou un sujet interne.
Le mot est volontairement plus large que « client » — `Interne` en est une. La liste se gère
dans les Réglages ; on **désactive** une Affectation, on ne la supprime jamais, pour ne pas
trouer l'historique. Une Affectation ne se pose jamais sur une Tâche.
_Avoid_: Client, compte, dossier, mission, projet

**Être sur une Affectation**:
Un Membre est sur une ou plusieurs Affectations, à partir d'une date, jusqu'à ce qu'il en
sorte. Ce n'est pas une Tâche : une Tâche a une fin, être sur une Affectation a une durée.
On ne la termine pas chaque soir pour la recréer le lendemain, et **on ne la coche jamais** :
l'unique action est « je ne suis plus dessus ». L'interface n'a jamais besoin d'un second
mot — elle dit simplement « Affectation : MONKA ».
_Avoid_: Focus, mission, allocation, timesheet, tâche récurrente

### Le temps et la relance

**Engagement**:
Le jour où un Membre s'engage à faire une Tâche. Ce n'est pas une deadline imposée de
l'extérieur : c'est une promesse qu'on se fait, et qu'on ne peut renégocier que par un
Report explicite. Il vaut le jour même par défaut quand une Tâche entre Sur le feu.
_Avoid_: Échéance, deadline, due date, date limite

**Report**:
L'acte de repousser l'Engagement d'une Tâche. Toujours explicite, toujours motivé par une
raison écrite, jamais silencieux. Le nombre de Reports d'une Tâche est visible de tous —
c'est le seul indicateur de santé de Bruno.
_Avoid_: Snooze, reporter à plus tard, décaler, ajourner

**Relance**:
Une notification poussée à un Membre, à heure fixe, listant ce à quoi il s'est engagé
aujourd'hui et qui n'est pas encore fait. C'est le mécanisme par lequel Bruno vient voir
les gens au lieu d'attendre qu'ils viennent le voir. Une Relance est toujours groupée :
jamais une notification par Tâche. Elle est actionnable sans ouvrir Bruno. Il en existe
trois natures, déduites de leur position dans la journée : le **Point du matin**, les
**Rappels**, le **Bilan**. Les Tâches Bloqué sont exclues des Rappels et du Bilan. Il n'y
a pas de Relance le samedi ni le dimanche, et un Engagement du week-end glisse au lundi
sans compter comme un Report.
_Avoid_: Rappel, notification, alerte, digest

**Récurrence**:
Une règle, configurée depuis le web, qui fabrique des Tâches à date fixe — éventuellement
plusieurs d'un coup, avec des Engagements échelonnés. Les Tâches qu'elle fabrique sont des
Tâches parfaitement ordinaires : une fois nées, elles n'ont plus aucun lien avec la règle.
_Avoid_: Répétition, template, série, cron

**Créneau**:
Une heure à laquelle un Membre veut être relancé. Chacun pose les siennes librement, au
quart d'heure près, avec un minimum de trois : la première de la journée porte le Point du
matin, la dernière porte le Bilan, celles du milieu portent les Rappels — au moins un,
autant qu'on veut. Il n'y a rien d'autre à configurer que des heures.
_Avoid_: Horaire, slot, plage, plage horaire

### Le rituel

**Daily**:
La réunion d'équipe du matin, et l'écran partagé qui lui sert d'interface. Une colonne par
Membre : son Affectation du jour, ce qu'il a Sur le feu aujourd'hui, ce qui est Bloqué, et
**ce qu'il a fait hier** — Tâches terminées et Affectation de la veille. Il est en lecture
seule et n'introduit aucune donnée qui n'existe déjà ailleurs.
_Avoid_: Standup, réunion, dashboard, tableau de bord

**Weekly**:
La réunion de la semaine, et son écran. Comme le Daily, il rappelle l'Affectation de chacun —
mais il porte une chose à lui : trois encarts repliables, *Skills of the week*, *Projects of the
week*, *Wins of the week*, remplis de **Sujets**. Une semaine, une page blanche : rien ne se
traîne d'une semaine à l'autre.
_Avoid_: Rétro, rétrospective, bilan hebdo, points divers

**Sujet**:
Une ligne dans un encart du Weekly : un texte, la personne dont il relève, et sa **Rubrique**
(skills, projects, wins). N'importe qui écrit sur la liste de n'importe qui — c'est une réunion,
pas un dossier personnel. Un lien collé dedans devient cliquable : c'est comme ça qu'on montre
un skill. Un Sujet n'est pas une Tâche : rien à terminer, rien à reporter.
_Avoid_: Point, item, ticket, ordre du jour, todo de réunion

### La capture

**Capture**:
L'acte de créer une Tâche. Principalement vocale et depuis le mobile. Contrainte dure :
une Capture ne peut jamais échouer — la Tâche est créée immédiatement à partir de la
transcription brute, et l'enrichissement arrive après, éventuellement bien après. Elle
atterrit toujours dans À trier, jamais ailleurs.
_Avoid_: Ajout, création, quick add, saisie

**Enrichissement**:
La passe LLM qui, après une Capture, propose un titre propre et pré-remplit les champs
explicitement énoncés à l'oral (Assigné, Engagement). Il ne devine jamais ce qui n'a
pas été dit. Toujours soumis à confirmation d'un Membre.
_Avoid_: Parsing, IA, magie, auto-fill
