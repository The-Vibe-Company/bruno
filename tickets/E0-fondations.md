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

## BRU-42 — La base de production et le déploiement

Le schéma existe et tourne en local (BRU-2). **Rien n'est déployé, et la base de production
n'existe pas.** Ce ticket la crée et branche le pipeline — à faire tôt, pour ne pas découvrir
les problèmes d'intégration à la fin.

- [x] Créer la base **Neon** via le Marketplace Vercel, sur l'équipe The Vibe Company
- [x] Lier `The-Vibe-Company/bruno` au projet Vercel, dossier racine `web/`
- [x] `DATABASE_URL` en Production **et** en Preview — Neon pose aussi `POSTGRES_URL` et
      `POSTGRES_URL_NON_POOLING` ; `src/db/url.ts` choisit la bonne selon l'usage
- [x] **Preview et Production partagent la même base Neon — décidé, pas subi.** Tranché le
      8 septembre : à trois personnes sur un outil interne, une base par preview est un
      confort qui ne vaut pas sa complexité. Conséquence assumée : un build de preview migre
      la production, et une PR peut toucher les vraies données. À revoir le jour où perdre
      le contenu de Bruno serait pénible
- [x] **Décider comment les migrations s'appliquent au déploiement, et l'écrire dans un ADR.**
      → [ADR 0003](../docs/adr/0003-migrations.md) : au build, avant `next build`, par la
      connexion directe. Contrepartie : toute migration doit rester compatible avec la version
      en ligne, et un changement destructeur se fait en deux déploiements.
      Les trois options ont chacune un vrai défaut :
      au *build* (`drizzle-kit migrate` dans la commande de build) c'est simple, mais un build
      interrompu laisse la base à moitié migrée et deux déploiements simultanés se marchent
      dessus ; en *étape manuelle* c'est sûr, mais on oublie ; via une *route protégée*
      déclenchée après déploiement, c'est correct mais il faut la protéger sérieusement
- [x] Vérifier au déploiement qu'un cron `*/15 * * * *` est accepté. **Fait, et enregistré
      actif** sur `/api/cron/relances` : la condition ouverte de l'ADR 0001 est un fait
- [x] Un premier déploiement en production réussi — `bruno-the-vibe-company.vercel.app`,
      derrière Deployment Protection, ce qui est le bon réglage pour un outil interne

## BRU-3 — API Tâches

L'app iOS en a besoin de toute façon, et c'est ce qui rendra les connecteurs d'agents triviaux
plus tard (PRD §11).

- [x] Lister les Tâches par Bucket, avec les filtres Assigné et recherche texte
- [x] Créer, éditer, changer de Bucket, changer de Statut, changer de Rang
- [x] Terminer, Abandonner, Supprimer, Reporter
- [x] Le changement vers `sur_le_feu` **rejette** la requête sans Assigné ni Engagement —
      refusé deux fois : par le contrat Zod avant d'atteindre la base, et par la contrainte
      Postgres qui reste le dernier rempart
- [x] Le contrat **OpenAPI est dérivé des schémas de validation** eux-mêmes, servi sur
      `/api/openapi.json`. Un test compare les chemins déclarés aux routes présentes sur le
      disque : ajouter une route sans la mettre au contrat casse la CI
- [x] 22 tests contre un vrai Postgres, rejoués en CI
- [x] L'authentification provisoire a été remplacée par la vraie session Google (BRU-4)

## BRU-4 — Authentification

- [x] Google OAuth, **restreint au domaine Google Workspace** de l'entreprise. Deux verrous :
      l'écran de consentement en mode « Interne » côté Google, **et** une revérification du
      jeton signé côté serveur — on ne fait pas reposer l'accès sur un réglage de console
- [x] Fonctionne sur web et sur iOS. Un seul format de session, deux transports : cookie
      `HttpOnly` pour le web, `Authorization: Bearer` pour iOS. L'API ne connaît qu'un chemin
- [x] Aucun écran d'inscription, aucun mot de passe, aucune réinitialisation — quelqu'un du
      domaine qui se connecte pour la première fois devient un Membre
- [x] Un email hors domaine est refusé proprement : redirection avec `?connexion=hors_domaine`
      sur le web, `403 hors_domaine` sur iOS
- [x] Un Membre désactivé perd l'accès **immédiatement**, sans attendre l'expiration de sa session
- [x] 18 tests d'authentification, signés avec une paire de clés locale : le refus hors domaine
      est prouvé sans dépendre de Google
- [ ] ⏳ **Identifiants Google à créer** — voir `.env.example`. Le code est prêt, il manque
      `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `SESSION_SECRET`

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
