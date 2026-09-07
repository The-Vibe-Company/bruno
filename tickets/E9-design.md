# E9 — Design

État au **7 septembre**, après la passe light mode. Voir [REVIEW-v2.md](../REVIEW-v2.md).

## ✅ BRU-35 — Écran Récurrences web · **livré**

Présent dans `Bruno Web v2 - Light`. Liste des 4 règles, formulaire complet : Titre, Assigné
marqué `obligatoire`, Fréquence, Nombre d'occurrences avec la mention `n/N automatique`, et les
Engagements échelonnés (1/3 lundi · 2/3 mercredi · 3/3 vendredi). Conforme aux règles 18 à 21.
**Débloque BRU-32.**

## BRU-36 — Écran Réglages web · **à reprendre**

L'écran existe et les Créneaux sont bons. Mais il y a une **confusion de vocabulaire à
corriger**, et elle a une conséquence réelle.

La section est intitulée **« Affectations »** et contient MONKA, AFP, Coup de Pâtes, Interne,
Bergamote, avec *Désactiver* / *Réactiver* / *+ Ajouter une Affectation*. **Ce sont des
Clients, pas des Affectations.** Désactiver-sans-jamais-supprimer est exactement la règle des
Clients (BRU-26).

- [ ] Renommer la section en **« Clients »** — le contenu est déjà le bon
- [ ] **Ajouter une vraie section « Affectations »** : qui est sur quel Client depuis quand,
      en poser une (Membre + Client + date de début), en fermer une
- [ ] Sans ça, **il n'existe toujours aucun endroit pour poser une Affectation**, alors qu'elle
      s'affiche sur quatre écrans. **BRU-28 reste bloqué.**

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

## BRU-39 — Régressions du Board light · **à corriger**

Deux choses présentes en sombre ont disparu de `Bruno Web v2 - Light`, vérifiées ligne à ligne.

- [ ] **Les rangs numérotés dans « À faire » ont sauté.** En sombre : `1 Relancer MONKA ·
      2 Préparer le mail · 3 Cadrage atelier · 4 Post LinkedIn 2/3 · 5 Chiffrage refonte`.
      En clair, aucun numéro. C'est la seule expression de la priorité dans Bruno (BRU-16)
- [ ] **`la précédente n'est pas faite` a disparu** de la carte *Post LinkedIn 2/3*. C'est
      la règle 22, et le seul signal qu'une occurrence de Récurrence s'empile

## Corrections mineures, toujours ouvertes

- [ ] Réglages iOS : désactiver le dernier « Retirer » quand on tomberait sous trois Créneaux
- [ ] iOS « Aujourd'hui » : le cas de **plusieurs Affectations** simultanées
- [ ] Renommer l'écran web « Terminé » en **« Fait »**
