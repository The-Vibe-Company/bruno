# E9 — Design

État au **7 septembre**, après la passe light mode. Voir [REVIEW-v2.md](../REVIEW-v2.md).

## ✅ BRU-35 — Écran Récurrences web · **livré**

Présent dans `Bruno Web v2 - Light`. Liste des 4 règles, formulaire complet : Titre, Assigné
marqué `obligatoire`, Fréquence, Nombre d'occurrences avec la mention `n/N automatique`, et les
Engagements échelonnés (1/3 lundi · 2/3 mercredi · 3/3 vendredi). Conforme aux règles 18 à 21.
**Débloque BRU-32.**

## BRU-36 — Écran Réglages web · **livré**

Présent dans `Bruno Web v2 - Light`. Créneaux + la section **Affectations**, qui est exactement
ce qu'elle doit être : **la liste de ce à quoi on peut travailler**, avec Désactiver / Réactiver
et « + Ajouter une Affectation ». Rien à changer.

Tranché le 7 septembre : les Réglages ne montrent **pas** qui est sur quoi — ça se voit sur le
Daily et sur le Board, et ça se change là où ça se voit (BRU-40).


## BRU-37 — Le formulaire du droit d'entrée Sur le feu · **toujours manquant · prioritaire**

Absent des quatre fichiers, clair comme sombre. Le bouton « Sur le feu » d'une carte À trier
continue de créer la Tâche en un tap, sans Assigné ni Engagement — il contourne l'invariant 2,
le seul verrou dur de Bruno. **Bloque BRU-13, sur le chemin critique.**

- [ ] Feuille modale iOS : Assigné et Engagement, pré-remplis « moi » + « aujourd'hui »
- [ ] Équivalent web, au drop dans le kanban **et** au clic sur le bouton
- [ ] L'état d'annulation

## BRU-34 — Widget écran d'accueil iOS · **toujours manquant**

Absent en clair comme en sombre. Meilleur levier du pilier 1. **Bloque BRU-10.**

- [ ] Le widget dans ses tailles, l'état d'enregistrement, la confirmation muette
- [ ] Dans les deux thèmes (BRU-38)

## ✅ BRU-39 — Régressions du Board light · **annulé, c'était voulu**

Les deux différences repérées entre le Board sombre et le Board clair ont été confirmées
comme des **décisions**, pas des oublis, le 7 septembre :

- **Les rangs numérotés sont supprimés partout.** La priorité, c'est le haut de la pile ; un
  chiffre en plus ne dit rien que la position ne dise déjà. Le mode clair avait raison, le
  mode sombre est à aligner.
- **`la précédente n'est pas faite` est abandonné.** Les deux occurrences se retrouvent côte
  à côte dans la liste, et ça suffit à le voir.

## BRU-40 — Le bandeau Affectation devient interactif

C'est le dernier trou du modèle. On voit son Affectation sur quatre écrans et on peut en sortir
(« Je ne suis plus dessus »), mais **rien ne permet d'en prendre une**.

Puisque les Réglages ne s'en occupent pas, ça se fait là où l'info s'affiche déjà.

- [ ] **L'état vide** du bandeau : quand on n'est sur rien, il propose de choisir
- [ ] **Le bandeau est cliquable** : un tap ouvre la liste des Affectations actives, on en
      choisit une ou plusieurs. La date de début est le jour même
- [ ] Sur **iOS « Aujourd'hui »** et sur le **bandeau du Board web**
- [ ] Gérer le cas de **plusieurs Affectations** simultanées, que la maquette iOS ne montre pas
- [ ] **Débloque BRU-28.**

## Corrections mineures, toujours ouvertes

- [ ] Réglages iOS : désactiver le dernier « Retirer » quand on tomberait sous trois Créneaux
- [ ] Renommer l'écran web « Terminé » en **« Fait »**
