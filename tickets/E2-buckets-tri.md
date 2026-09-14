# E2 — Buckets et tri · **Invariants 1, 2, 3**

## BRU-11 — Les quatre Buckets · **livré**

- [x] `À trier` · `Sur le feu` · `À venir` · `Idées`. Une Tâche est dans **un et un seul** Bucket
      — l'énumération Postgres et la colonne `tache.bucket` (BRU-2)
- [x] Le Bucket est **toujours posé par un humain** *(invariant 1)* — un test parcourt le code
      et refuse toute écriture de Bucket hors de `deplacer()` ; un autre vérifie que le cron des
      Relances ne touche à aucune Tâche
- [x] Toute Capture atterrit dans `À trier` *(invariant 3)* — le contrat `CreerTache` exclut
      `sur_le_feu` même si on le demande, testé
- [x] Sortir de `Sur le feu` **conserve** Assigné et Engagement *(règle 7)* — testé dans BRU-3

## BRU-12 — Écran « En attente » iOS · **livré le 9 septembre**

Maquette : `Bruno iOS v2` → écran « En attente ».

- [x] Trois sections : `À trier` (dépliée par défaut, avec son compteur en orange),
      `À venir` et `Idées` (repliées, avec leur compteur)
- [x] Chaque carte À trier montre le titre nettoyé, l'avatar de l'auteur, et la **transcription
      brute en italique** dessous
- [x] Trois boutons de destination sur la carte : `Sur le feu` · `À venir` · `Idées`,
      plus une croix pour supprimer
- [x] **Pas de réorganisation du Rang au doigt** — le tri oui, le réordonnancement non

*Une carte s'ouvre d'un tap et montre ses trois destinations et la croix. Les Captures encore sur
le disque (BRU-7) apparaissent en tête d'À trier, en pointillé : « en attente d'envoi ».*

## BRU-13 — Le formulaire du droit d'entrée · **invariant 2** · **web et iOS livrés**

Le seul verrou dur de Bruno. Côté web, livré avec BRU-14 (maquette v3) ; côté iOS, avec BRU-12.

- [x] Deux champs et deux seulement : **Assigné** et **Engagement** — la modale « Passer Sur le feu »
- [x] Pré-remplis avec « moi » et « aujourd'hui », validables en un tap
- [x] **Il n'existe aucun chemin vers Sur le feu qui ne passe pas par ce formulaire** — le bouton
      « Sur le feu » d'une carte À trier l'ouvre, le dépôt d'une carte du panneau dans le kanban
      l'ouvre (avec le Statut de la colonne visée), et l'API refuse sans Assigné ni Engagement
- [x] Ni blocage sec ni valeur par défaut silencieuse : on voit toujours à quoi on s'engage
- [x] **Test** : tenter la transition par l'API sans Assigné → rejet (BRU-3), et en base (BRU-2)
- [x] La feuille iOS — livrée avec BRU-12 le 9 septembre

## BRU-14 — Panneau latéral du Board web · **livré**

Maquette : `Bruno Web v2` → écran « Board », colonne de droite.

- [x] `À trier` dépliée avec ses cartes complètes (transcription brute + trois boutons + croix),
      `À venir` et `Idées` repliées avec leur compteur, dépliables
- [x] Glisser une carte depuis le panneau vers le kanban change le Bucket et **déclenche
      BRU-13** — avec le Statut de la colonne visée. Vérifié avec de vrais événements pointeur,
      et en base. Au passage, la stratégie de collision est passée à `pointerWithin` (repli
      `closestCorners`) : la première élisait une carte de la colonne voisine plus haute
- [x] Bandeau supérieur : les Affectations en cours de chacun, barre à la couleur de
      l'Affectation (lecture seule — poser et fermer viennent avec BRU-28/40)
- [x] Recherche texte et filtre par Assigné, portés par l'URL. **Rien d'autre**
- [x] Tout ce qui se clique montre une main : règle globale dans les tokens (le preflight de
      Tailwind v4 met `cursor: default` sur les boutons) — audit : 31 éléments, 0 fautif

## BRU-56 — La fiche s'ouvre aussi hors Sur le feu · **livré le 14 septembre**

Antoine : « quand je clique sur une Idée, je veux avoir la possibilité d'ajouter des notes pour
avoir plus de contexte ». Le clic ne faisait rien : la fiche ne savait montrer qu'une Tâche
Sur le feu.

- [x] Un clic sur une Tâche du panneau — À trier, À venir, Idées — ouvre la même fiche : titre,
      Assigné, Aidants, **Notes**, et les fins
- [x] Hors Sur le feu, pas de Statut ni de Report ; **l'Engagement se pose et se retire librement**
      (invariant 4 : le Report ne verrouille que Sur le feu)
- [x] Une Tâche qui porte des notes le montre dans la liste, par une petite icône
- [x] Corrigé au passage : Échap fermait la fiche et **perdait la note tapée** — ce qui n'est pas
      encore parti au serveur s'enregistre à la fermeture, quelle qu'elle soit

