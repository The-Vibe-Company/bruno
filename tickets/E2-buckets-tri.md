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

## BRU-12 — Écran « En attente » iOS

Maquette : `Bruno iOS v2` → écran « En attente ».

- [ ] Trois sections : `À trier` (dépliée par défaut, avec son compteur en orange),
      `À venir` et `Idées` (repliées, avec leur compteur)
- [ ] Chaque carte À trier montre le titre nettoyé, l'avatar de l'auteur, et la **transcription
      brute en italique** dessous
- [ ] Trois boutons de destination sur la carte : `Sur le feu` · `À venir` · `Idées`,
      plus une croix pour supprimer
- [ ] **Pas de réorganisation du Rang au doigt** — le tri oui, le réordonnancement non

## BRU-13 — Le formulaire du droit d'entrée · **invariant 2** · **bloqué par BRU-37**

Le seul verrou dur de Bruno. À implémenter sur **les deux plateformes**.

- [ ] Deux champs et deux seulement : **Assigné** et **Engagement**
- [ ] Pré-remplis avec « moi » et « aujourd'hui », validables en un tap
- [ ] **Il n'existe aucun chemin vers Sur le feu qui ne passe pas par ce formulaire** — ni le
      bouton « Sur le feu » d'une carte À trier, ni le drop dans le kanban web, ni l'API
- [ ] Ni blocage sec (agaçant) ni valeur par défaut silencieuse (on s'engage sans le savoir) :
      on voit toujours à quoi on s'engage
- [ ] **Test** : tenter la transition par l'API sans Assigné → rejet

## BRU-14 — Panneau latéral du Board web

Maquette : `Bruno Web v2` → écran « Board », colonne de droite.

- [ ] `À trier` dépliée avec ses cartes complètes (transcription brute + trois boutons),
      `À venir` et `Idées` repliées
- [ ] Glisser une carte depuis le panneau vers le kanban change le Bucket et **déclenche
      BRU-13**
- [ ] Bandeau supérieur : les Affectations en cours de chacun (voir BRU-28)
- [ ] Recherche texte et filtre par Assigné. **Rien d'autre** — pas de tags, pas de vues sauvegardées
