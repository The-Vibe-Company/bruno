# E0 — Fondations

## BRU-1 — Choisir la stack et initialiser le dépôt

Décision d'architecture à prendre avant tout le reste. Contraintes venant du PRD : API-first,
push iOS actionnable, widget écran d'accueil, distribution TestFlight, hors ligne à la capture.

- [ ] Stack web et backend arrêtée, avec les raisons écrites dans un ADR
- [ ] Stack iOS arrêtée (natif requis : widget + notifications actionnables)
- [ ] Dépôt git initialisé, web et iOS dans le même dépôt
- [ ] Environnements dev et prod, déploiement automatique

## BRU-2 — Schéma de données

Toutes les tables du modèle. **Une colonne `space_id` sur chaque table** — multi-tenant dans
le schéma uniquement, zéro UI (PRD §11).

- [x] `membre` avec `type` (`humain` | `agent`) — seuls les humains sont créés en V1
- [x] `tache` : titre, bucket, rang, notes, transcription_brute, assigne_id, engagement,
      statut, reports_count, etat_terminal, created_at
- [x] `tache_aidant` (plusieurs Aidants par Tâche)
- [x] `report` : tache_id, raison, ancien_engagement, nouvel_engagement, auteur, date
- [x] `affectation` avec `actif` (on désactive, on ne supprime jamais)
- [x] `affectation_membre` : membre_id, affectation_id, debut, fin nullable
- [x] `creneau` : membre_id, heure
- [x] `recurrence` : la règle, avec ses décalages
- [x] Contrainte en base : bucket `sur_le_feu` ⇒ `assigne_id` et `engagement` non nuls
      **(invariant 2, à faire respecter par la base, pas seulement par l'UI)**
- [x] Dix autres règles du PRD passées en `CHECK` : Statut réservé à Sur le feu, raison de
      Report obligatoire, Créneaux au quart d'heure, cohérence d'une Récurrence, période
      d'Affectation bien ordonnée
- [x] `pnpm check:invariants` rejoue les 19 cas contre une vraie base — voir [ADR 0002](../docs/adr/0002-drizzle.md)

## BRU-3 — API Tâches

L'app iOS en a besoin de toute façon, et c'est ce qui rendra les connecteurs d'agents triviaux
plus tard (PRD §11).

- [ ] Lister les Tâches par Bucket, avec les filtres Assigné et recherche texte
- [ ] Créer, éditer, changer de Bucket, changer de Statut, changer de Rang
- [ ] Terminer, Abandonner, Supprimer, Reporter
- [ ] Le changement vers `sur_le_feu` **rejette** la requête sans Assigné ni Engagement

## BRU-4 — Authentification

- [ ] Google OAuth, **restreint au domaine Google Workspace** de l'entreprise
- [ ] Fonctionne sur web et sur iOS
- [ ] Aucun écran d'inscription, aucun mot de passe, aucune réinitialisation
- [ ] Un email hors domaine est refusé proprement

## BRU-5 — Données de départ

- [ ] Les trois Membres créés à la main
- [ ] Les Clients de départ, dont `Interne`
- [ ] Un jeu de données de démonstration pour développer sans écran vide

## BRU-38 — Thème clair et sombre

Le design existe désormais dans les deux thèmes, sur les deux plateformes
(`Bruno Web v2` / `Bruno Web v2 - Light`, `Bruno iOS v2` / `Bruno iOS v2 - Light`).
À traiter **avant** de construire les écrans : c'est un jeu de tokens, pas une passe de
peinture à la fin.

- [ ] **Le thème suit le réglage système.** Aucun sélecteur nulle part — les maquettes des
      Réglages n'en montrent pas, et « thème configurable » reste hors scope. Un seul
      comportement, zéro état à tester
- [ ] **Un seul jeu de tokens**, deux valeurs par token. Jamais deux feuilles de style, jamais
      une couleur écrite en dur dans un composant
- [ ] **L'accent change entre les thèmes** — c'est le point à ne pas rater :
      `#F27313` en sombre, **`#E4640A` en clair**. L'orange de marque doit foncer sur fond
      clair pour rester lisible ; le reprendre tel quel casse le contraste
- [ ] Les couleurs sémantiques suivent la même règle, ce n'est **pas** un simple inversement :
      *En cours* passe de `oklch(.74 .13 155)` à `oklch(.58 .13 155)`, *Bloqué* de
      `oklch(.70 .16 22)` à `oklch(.58 .16 22)`
- [ ] Fonds et texte, pour référence : sombre `#0B0B0B` / `#161616` / `#262626` / `#EDEDED` /
      `#B8B8B8` — clair `#F7F5F0` / `#FFFFFF` / `#D9D5CC` / `#161512` / `#6B675F`
- [ ] **Web** : tokens CSS + `prefers-color-scheme`
- [ ] **iOS** : Color Assets avec variantes Any/Dark, SwiftUI les résout seul
- [ ] **Le widget et les notifications suivent aussi** — ce sont les deux surfaces qu'on oublie
