# PRD — Bruno

**La to-do de The Vibe Company.** Web + iOS. Outil interne, trois utilisateurs, jamais commercialisé.
Interface intégralement en français.

Ce document est destiné à Claude Design (conception des écrans) puis au développement.
Il se lit avec [CONTEXT.md](./CONTEXT.md), qui définit le vocabulaire — 27 termes. **Les termes en
capitale initiale dans ce document (Tâche, Bucket, Engagement, Report, Relance, Affectation…)
sont ceux du glossaire et ne doivent jamais être renommés dans les maquettes.**

---

## 1. Le problème

The Vibe Company est une agence de consulting de trois personnes. La to-do de l'entreprise vit
aujourd'hui dans Notion, qui va être abandonné. Trois douleurs, par ordre d'importance :

1. **Capturer une idée coûte trop cher.** Une idée qui surgit en réunion, en voiture ou dans la
   rue doit traverser : sortir le téléphone, ouvrir Notion, attendre, trouver la bonne base,
   créer une ligne, taper. Résultat : les idées ne sont pas capturées.
2. **Personne n'ouvre la to-do.** Elle existe, elle est à jour un lundi sur trois, et elle ne
   fait rien pour se rappeler à l'existence de qui que ce soit.
3. **Rien ne distingue ce qui brûle de ce qui peut attendre.** Tout est au même niveau.

Une quatrième douleur, plus petite mais quotidienne : **déclarer sur quel client on travaille**
oblige aujourd'hui à cocher une tâche « MONKA » chaque soir et à la recréer chaque matin.

## 2. Les deux piliers

Tout ce qui suit découle de deux principes. Toute décision de design doit pouvoir se justifier
par l'un des deux, ou être coupée.

> **Pilier 1 — Capturer sans friction.**
> Une idée doit atterrir dans Bruno en quelques secondes, à la voix, depuis le mobile,
> sans jamais échouer.

> **Pilier 2 — La to-do vient te voir.**
> On ne compte pas sur les Membres pour ouvrir Bruno. Bruno les relance.

## 3. Ce que Bruno n'est pas

**Bruno n'est pas l'outil du travail client détaillé.** Le travail de production pour un client
vit ailleurs, dans une to-do dédiée et plus fine, hors du périmètre de ce projet.
**Bruno est l'outil de la boîte** : la coordination, les engagements, ce qui brûle, les idées.

C'est ce qui autorise Bruno à rester petit. Chaque fois qu'une fonctionnalité est demandée,
la première question est : *est-ce du travail de boîte, ou du travail client ?*

Bruno n'est pas non plus un outil de suivi du temps, un gestionnaire de projet, ni un produit
destiné à être vendu. Il n'a pas d'onboarding, pas d'invitations, pas de page marketing.

## 4. Les utilisateurs

Trois associés de The Vibe Company. Tous les trois ont **exactement les mêmes droits** : voir
tout, éditer tout, supprimer tout. Il n'y a ni rôle, ni permission, ni hiérarchie, ni compte
d'administration.

Un Membre porte un type — `humain` ou `agent`. Seuls les humains existent en V1 ; le champ
n'est là que pour ne pas fermer la porte aux connecteurs d'agents IA prévus plus tard.

Volumétrie attendue : environ **dix Tâches actives par personne**, soit une trentaine au total.
Le produit doit rester agréable jusqu'à quelques centaines, sans jamais être conçu pour des
milliers.

**Moments d'usage :**

| Moment | Où | Ce qui se passe |
|---|---|---|
| Une idée surgit | iOS, n'importe quand | Capture vocale, 5 secondes, on n'y repense plus |
| Le Point du matin | iOS, notification | Ce à quoi je me suis engagé aujourd'hui |
| Le Daily | Web, à trois, projeté | La réunion d'équipe du matin |
| Dans la journée | iOS, notifications | Rappels, puis Bilan de fin de journée |
| Le tri | Web, une à deux fois par semaine | On range les Idées, on met des choses Sur le feu |

## 5. Le modèle de domaine

Le vocabulaire complet est dans `CONTEXT.md`. Voici la structure et les **invariants** —
les règles que le produit ne doit jamais violer.

### L'objet central

Une **Tâche** est le seul objet métier. Elle porte : un titre, un Bucket, un Rang, des Notes,
zéro ou un Assigné, zéro à plusieurs Aidants, zéro ou un Engagement, un Statut (uniquement
Sur le feu), un compteur de Reports.

Il n'existe **pas d'objet « Idée »** : une Idée est une Tâche sans Assigné ni Engagement, rangée
dans le Bucket Idées. Promouvoir une Idée, c'est éditer une Tâche, jamais en créer une nouvelle.

### Les quatre Buckets

**À trier** · **Sur le feu** · **À venir** · **Idées**. Une Tâche est dans un et un seul Bucket.

**À trier** est la boîte de réception : toute Capture y atterrit, et une Tâche n'y fait qu'attendre
qu'un humain lui donne une destination. **Trier**, c'est choisir un des trois autres Buckets — un
acte humain, jamais automatique. Trier vers Sur le feu déclenche le droit d'entrée.

**Idées** n'est donc pas une boîte de réception : c'est une réserve choisie. Une Tâche n'y arrive
que parce qu'un humain l'y a rangée.

> **Invariant 1 — Le Bucket est toujours posé par un humain.** Il n'est jamais déduit d'une date,
> d'un assigné ou de quoi que ce soit d'autre. Rien ne déplace une Tâche automatiquement.

> **Invariant 2 — Droit d'entrée Sur le feu.** Une Tâche ne peut pas entrer dans Sur le feu sans
> un **Assigné** et un **Engagement**. C'est la seule règle de ce genre dans Bruno.

> **Invariant 3 — Le tri est un acte humain.** Toute Capture atterrit dans À trier et y reste
> jusqu'à ce qu'un Membre choisisse sa destination. Rien n'en sort tout seul.

### Le Statut

Uniquement dans Sur le feu : **À faire** · **En cours** · **Bloqué**. Une Tâche dans À venir ou
Idées n'a pas de Statut. Terminé n'est pas un Statut — c'est un état terminal.

### Le Rang

La position dans la liste **est** la priorité. Il n'existe aucune échelle, aucun niveau, aucun
drapeau « urgent ». Le rang s'affiche comme un **numéro visible uniquement dans la colonne
À faire** de Sur le feu — la seule liste où « quoi ensuite » veut dire quelque chose. Partout
ailleurs, c'est un ordre sans chiffre.

### Les personnes sur une Tâche

Un **Assigné** unique — celui qui répond de la Tâche. Zéro ou un, jamais plus. Des **Aidants**,
autant qu'on veut, qui contribuent sans en répondre. Un Aidant voit la Tâche chez lui, dans une
liste distincte. **N'importe qui peut passer n'importe quelle Tâche en Terminé** : il n'y a aucun
verrou d'édition entre trois personnes qui se parlent tous les jours.

### Le temps

Un seul champ de date : l'**Engagement** — *le jour où je m'engage à le faire*. Ce n'est pas une
deadline imposée de l'extérieur, et le mot « échéance » ne doit apparaître nulle part dans l'UI.

> **Invariant 4 — L'Engagement ne bouge que par un Report explicite et motivé.** Jamais
> silencieusement, jamais automatiquement.

Il vaut **le jour même par défaut** quand une Tâche entre Sur le feu. Une Tâche À venir en porte
un aussi. Quand la date d'une Tâche À venir arrive, Bruno **le propose** au Point du matin ; il
ne déplace jamais la Tâche lui-même (invariant 1).

### Les fins

Trois issues, toutes posées à la main :

- **Terminé** — c'est fait. La Tâche quitte le board immédiatement.
- **Abandonné** — on a décidé de ne pas le faire. C'est une décision, elle a de la valeur, elle
  reste consultable. Visible partout, à côté de « Fait ».
- **Supprimé** — ça n'aurait jamais dû exister : un doublon, une Capture ratée, une transcription
  incompréhensible. Aucune trace. Planqué dans un menu secondaire, avec confirmation.

> **Invariant 5 — Aucun état terminal n'est jamais déduit.** Bruno ne coche rien à ta place.

### Les Affectations

Une **Affectation** = un Membre travaille pour un **Client**, à partir d'une date, jusqu'à ce
qu'il en sorte.

> **Invariant 6 — Une Affectation n'est pas une Tâche.** Une Tâche a une fin, une Affectation a
> une durée. **On ne la coche jamais.** Elle n'a ni Engagement, ni Statut, ni Rang, ni Report.

On la pose une fois, elle tient. C'est précisément ce qui supprime le passer-en-fait-et-recréer.
Plusieurs Affectations simultanées sont normales, sans limite. Elles sont **continues** — pas de
jours sélectionnés, pas de demi-journées, pas de pourcentages.

Un **Client** ne se pose **jamais** sur une Tâche, uniquement sur une Affectation. La liste des
Clients est ouverte, modifiable dans les Réglages, et on ne supprime jamais un Client (on le
désactive, pour ne pas trouer l'historique). `Interne` en fait partie : c'est le Client des
journées non facturables.

## 6. Les règles métier

**Capture**

1. Une Capture ne peut **jamais** échouer. La Tâche est créée immédiatement à partir de la
   transcription brute ; l'Enrichissement arrive après, éventuellement bien après.
2. Une Capture **n'atterrit jamais Sur le feu** — le droit d'entrée (invariant 2) est un acte
   humain conscient. Si l'utilisateur dit « c'est urgent », la Tâche remonte en tête d'À trier,
   et le Point du matin la lui remet sous le nez.
3. La **transcription brute est toujours conservée** dans les Notes, sous le titre nettoyé.
4. L'Enrichissement ne devine **jamais** ce qui n'a pas été dit.
5. Une Tâche quitte À trier uniquement quand un humain lui choisit un Bucket. Le tri se fait
   depuis le web **et** depuis iOS — c'est le geste le plus fréquent du produit.

**Passage Sur le feu**

6. Un mini-formulaire à deux champs s'ouvre — Assigné et Engagement — **pré-remplis** avec
   « moi » et « aujourd'hui », validable en un tap. Ni blocage sec, ni valeur par défaut
   silencieuse : on voit toujours à quoi on s'engage. **Il n'existe aucun chemin vers Sur le feu
   qui ne passe pas par ce formulaire** — y compris le bouton « Sur le feu » d'une carte À trier,
   sur les deux plateformes.
7. En sortie de Sur le feu, **on conserve tout** : Assigné et Engagement restent, aucune question
   n'est posée.

**Report**

8. La **raison est obligatoire**. Une phrase courte ou un choix rapide (*pas eu le temps* /
   *bloqué par quelqu'un* / *plus prioritaire*). Sans raison, ce serait un bouton snooze, et un
   snooze est un trou noir.
9. Nouvelle date : **demain par défaut**, modifiable en un tap.
10. L'écran de Report propose toujours **« Abandonner »** comme troisième option. La moitié des
    Tâches reportées cinq fois ne devraient pas exister.
11. Le compteur `Reporté N×` est **visible de tous**. Pas de notification, mais pas de secret :
    entre trois associés, c'est de la transparence, pas de la surveillance.
12. Au-delà de **3 Reports**, badge visuel sur le board. Aucun blocage automatique.

**Relances**

13. Une Relance est **toujours groupée** : jamais une notification par Tâche. C'est la décision
    qui détermine si le système survit.
14. Une Relance est **actionnable sans ouvrir Bruno** : appui long → « Fait » et « Reporter ».
    « Fait » ne demande rien ; « Reporter » ouvre une mini-feuille pour la raison.
15. **Pas de Relance le samedi ni le dimanche.** Un Engagement du week-end glisse au lundi
    **sans compter comme un Report**.
16. Les Tâches **Bloqué** sont exclues des Rappels et du Bilan ; elles n'apparaissent qu'au
    Point du matin.
17. Il n'y a **pas de mode vacances**. À trois, on se le dit.

**Récurrence**

18. Les règles se configurent **depuis le web uniquement**.
19. Une règle peut fabriquer **plusieurs Tâches d'un coup, avec des Engagements échelonnés**.
    Exemple : *le lundi, créer « Post LinkedIn 1/3, 2/3, 3/3 » avec Engagements lundi, mercredi,
    vendredi*. La numérotation `n/N` est automatique.
20. Les Tâches fabriquées sont des **Tâches parfaitement ordinaires**. Une fois nées, elles n'ont
    **plus aucun lien** avec la règle : les Reporter, les Abandonner ou les éditer n'affecte ni la
    règle ni les occurrences futures. C'est ce qui évite l'enfer classique de la récurrence.
21. Une règle porte un **Assigné obligatoire** (conséquence de l'invariant 2).
22. Si l'occurrence précédente n'est pas faite, **on génère quand même**, et la nouvelle Tâche
    affiche un discret *« la précédente n'est pas faite »*. L'empilement est une information.
23. La génération a lieu **au premier Créneau du jour concerné**, pour apparaître dans le Point
    du matin.

**Affectations**

24. On ne coche jamais une Affectation. Son unique action est **« je ne suis plus dessus »**,
    qui la ferme à la date du jour.
25. Une Affectation ouverte depuis **plus de 14 jours** ajoute une ligne discrète au Point du
    matin : *« toujours sur MONKA ? »*, avec un bouton pour la fermer.

## 7. Les Relances en détail

Chaque Membre pose **ses propres heures**, librement, au quart d'heure près, avec un
**minimum de trois**. Il n'y a **rien d'autre à configurer que des heures** : le rôle de chaque
Relance découle de sa position dans la journée.

| Position | Nature | Obligatoire | Contenu | Ton |
|---|---|---|---|---|
| La première | **Point du matin** | oui | Mon Affectation du jour · mes Tâches engagées aujourd'hui · les Tâches À venir dont l'Engagement arrive (proposition de passage) · mes Bloqué · les Affectations qui traînent (>14 j) | Neutre — *« 3 trucs prévus aujourd'hui »* |
| Celles du milieu | **Rappels** | au moins un, autant qu'on veut | Ce qui reste ouvert aujourd'hui | Factuel — *« 2 encore ouverts »* |
| La dernière | **Bilan** | oui | Ce que je devais finir et qui ne l'est pas | Direct — *« tu devais finir Relancer client X »* |

Canal : **push iOS uniquement**. Pas de Slack, pas d'email.
Déplacer une heure ne change rien à configurer : la dernière relance de la journée reste le Bilan,
où qu'on la mette.

## 8. Les parcours clés

**Capturer.** Antoine sort d'une réunion. Il appuie sur le widget de son écran d'accueil, dit
*« faudrait qu'on relance MONKA sur le devis »*, range son téléphone. Total : cinq secondes,
sans jamais ouvrir l'app. La Tâche existe déjà, avec la transcription brute. Deux secondes plus
tard, l'Enrichissement propose le titre *« Relancer MONKA sur le devis »* et le dépose dans
À trier. Si le réseau est absent, tout ceci arrive plus tard, sans que rien ne
soit perdu.

**Trier.** Lundi matin, sur le web. La colonne À trier affiche `7`. Antoine glisse trois
d'entre elles vers le kanban Sur le feu — à chaque fois, le mini-formulaire lui demande qui et
quand, pré-rempli. Il en abandonne deux d'un clic. Les deux dernières descendent dans À venir avec
un Engagement au mois prochain.

**Être relancé.** 9h15, notification : *« Aujourd'hui : MONKA. 3 tâches engagées. »* À 14h :
*« 2 encore ouvertes. »* À 17h30 : *« Tu devais finir Préparer le mail Coup de Pâtes. »* Antoine
appuie longuement sur la notification et choisit « Reporter ». Une mini-feuille s'ouvre : raison
*« bloqué par la relecture »*, nouvelle date demain, validé. Il n'a pas ouvert Bruno.

**Le Daily.** 9h30, les trois autour d'un écran. Une colonne par personne : l'Affectation du jour,
ce qui est Sur le feu, ce qui est Bloqué, et ce qui a été fait hier. En haut, deux chiffres :
`7 à trier` et `2 reportées 3 fois ou plus`. La réunion se déroule dans cet écran.

**S'affecter.** Antoine commence chez MONKA. Il pose l'Affectation une fois. Elle apparaît chaque
matin en tête de sa liste et dans sa colonne du Daily. Il ne fait plus rien pendant trois semaines.
Le jour où il en sort, un bouton : « je ne suis plus dessus ».

## 9. Les écrans — Web

Le web est le lieu du **tri, du pilotage et de la configuration**.

**1. Board** — l'écran principal.
Bandeau une ligne en haut : les Affectations en cours de chacun (`Antoine → MONKA, AFP`).
En dessous, sur ~70 % de la largeur : **Sur le feu** en kanban à trois colonnes —
**À faire** (rangs numérotés) · **En cours** · **Bloqué**. Sur les ~30 % restants, une colonne
latérale contenant **À trier** (déplié, chaque carte portant sa transcription brute et ses trois
boutons de destination), puis **À venir** et **Idées** repliés.
Glisser entre colonnes change le Statut. Glisser depuis la latérale vers le kanban change le
Bucket et déclenche le mini-formulaire du droit d'entrée. Glisser dans une liste change le Rang.
Recherche texte et filtre par Assigné. Rien d'autre — pas de tags, pas de vues sauvegardées.

**2. Daily** — l'interface de la réunion du matin. Lecture seule, projetable.
Bandeau en haut : nombre de Tâches dans **À trier** et nombre de Tâches **reportées 3 fois ou
plus** — les deux seuls signaux d'alerte de Bruno. Puis les **Affectations du jour** de chacun, le
bloc **Hier** (Tâches Terminées et Abandonnées, plus les Affectations de la veille), et enfin les
Tâches **Sur le feu aujourd'hui** groupées par Statut, chaque ligne portant l'avatar de son Assigné.
Un filtre en tête (`Tous` · une pastille par Membre) permet de dérouler la réunion personne par
personne.

**3. Fait** — l'historique. L'écran s'appelle **Fait**, jamais « Terminé » : il contient les Tâches
Terminées *et* Abandonnées, et « Terminé » désigne un état précis du glossaire. Groupé par semaine, filtrable par Membre. Pour chaque semaine et
chaque personne : son Affectation de la semaine, puis ses Tâches **Terminées** et **Abandonnées**.
C'est tout ce que « suivi » veut dire. Pas de compteur de jours, pas de cumul mensuel.

**4. Récurrences** — la liste des règles et leur édition. Une règle : un titre, un Assigné, une
fréquence, un nombre d'occurrences, et les Engagements échelonnés.

**5. Réglages** — les heures de Relance (minimum trois), la liste des Clients (ajout en une ligne,
désactivation, jamais de suppression), **la gestion des Affectations** (en poser une, la fermer),
la déconnexion. **Rien d'autre.**

## 10. Les écrans — iOS

L'iOS est le lieu de la **capture** et de **la journée en cours**. Ce n'est pas un board.

**1. Widget écran d'accueil** — un tap lance la capture vocale, sans passer par l'app.

**2. Capture** — un gros bouton micro, et un champ texte juste en dessous. La saisie texte n'est
pas optionnelle : réunions, transports, open space. Fonctionne hors ligne, avec file d'attente
locale et envoi dès le retour du réseau.

**3. Aujourd'hui** — l'écran d'accueil.
En tête, **épinglées** : les Affectations en cours, une ligne par Client, à la couleur du Client,
**sans case à cocher**, libellées `MONKA · depuis le 3 sept.`, avec pour unique action
« je ne suis plus dessus ». En dessous : mes Tâches **Sur le feu** dont l'Engagement est
aujourd'hui ou avant, groupées par Statut. Puis une section distincte **« J'aide sur »**.

**4. En attente** — les Buckets **À trier**, **À venir** et **Idées**. À trier est déplié par défaut,
chaque carte portant sa transcription brute et ses trois boutons de destination ; « Sur le feu »
ouvre le formulaire du droit d'entrée. À venir et Idées sont repliés. Édition **à l'unité** :
changer un Assigné, passer en Terminé, Reporter. **Pas de réorganisation du Rang sur mobile** —
réordonner au pouce, personne ne le fera.
**5. Détail d'une Tâche** — titre, Notes (avec la transcription brute), Assigné, Aidants,
Engagement, Statut, compteur de Reports, et les actions Fait / Abandonner / Reporter.

**6. Feuille de Report** — raison obligatoire (saisie libre ou choix rapide), nouvelle date
(demain par défaut), et « Abandonner » en troisième option.

**7. Réglages** — les heures de Relance, la déconnexion.

**8. Notifications actionnables** — appui long : « Fait » et « Reporter ». C'est la différence
entre un système de relance et du spam.

## 11. Contraintes techniques

- **Authentification** : Google OAuth, restreint au domaine Google Workspace de l'entreprise.
  Aucun écran d'inscription, aucun mot de passe, aucune réinitialisation.
- **Distribution iOS** : **TestFlight**. Pas de passage par l'App Store, donc pas de Sign in with
  Apple, pas de politique de confidentialité, pas de délai de review. Prévoir un build tous les
  90 jours.
- **Hors ligne** : la Capture fonctionne hors ligne — non négociable (pilier 1). La consultation
  hors ligne affiche le dernier état en cache. **L'édition hors ligne n'est pas supportée** : la
  résolution de conflits sur des Rangs est un gouffre pour un cas rare.
- **Temps réel** : rafraîchissement automatique toutes les ~10 secondes. Pas de websocket
  sophistiqué, pas de curseurs collaboratifs. Suffisant à trois.
- **API-first** : l'API de lecture/écriture des Tâches est construite dès la V1 — l'app iOS en a
  besoin de toute façon, et c'est ce qui rendra les connecteurs d'agents IA triviaux plus tard.
- **Multi-tenant dans le schéma uniquement** : une colonne `space_id` partout, et **zéro UI**
  d'invitation, d'onboarding ou de gestion d'espace. Une demi-journée de coût, la porte reste
  ouverte, et on ne paie aucun prix produit.
- **Thème** : clair et sombre, **suivant le réglage système**, sur les deux plateformes. Un
  seul jeu de tokens, deux valeurs par token. L'accent change entre les thèmes — `#F27313` en
  sombre, `#E4640A` en clair : l'orange de marque doit foncer sur fond clair pour rester
  lisible. **Aucun sélecteur de thème nulle part** : le système décide, il n'y a pas d'état à
  régler ni à tester.
- **Langue** : français partout, y compris les termes du glossaire.

## 12. Hors scope V1

Sous-tâches · checklists · projets · tags libres · **Client sur une Tâche** · commentaires ·
pièces jointes · time tracking · cumul de jours par client · dépendances entre Tâches · vue
calendrier · Gantt · intégrations Slack / Google Calendar / email · rôles et permissions · mode
vacances · historique d'activité par Tâche · raccourci Siri · share sheet · connecteurs d'agents
IA · multi-espace · invitations · export · **sélecteur de thème**.

**Décisions à revisiter plus tard, dans cet ordre :** les connecteurs d'agents IA (le champ
`Membre.type` et l'API existent déjà pour ça) · le cumul de jours par Client si la facturation au
temps passé devient un besoin réel (les périodes d'Affectation sont déjà stockées, c'est un
après-midi de travail) · la proposition automatique de passage Sur le feu quand un Engagement
arrive.

## 13. Critères de succès

1. **Le temps entre « j'ai une idée » et « c'est dans Bruno » est inférieur à dix secondes**,
   sans avoir déverrouillé l'app.
2. **Aucune idée n'est perdue** : plus personne ne dit « on en avait parlé, c'est où déjà ? ».
3. **Les Relances ne sont pas désactivées au bout d'un mois.** C'est le vrai test du pilier 2 :
   si elles deviennent du bruit, elles seront coupées et Bruno mourra doucement.
4. **Le Daily est ouvert chaque matin** et remplace le tour de table à l'oral.
5. **Notion est abandonné en moins de deux semaines** après la mise en service.
6. **Le nombre de Tâches reportées trois fois ou plus reste bas.** S'il grimpe, ce n'est pas un
   problème d'outil : c'est que l'équipe s'engage sur trop de choses, et Bruno l'aura rendu visible.
