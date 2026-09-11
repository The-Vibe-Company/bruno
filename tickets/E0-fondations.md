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
- [x] **11 septembre : `https://bruno.thevibecompany.co`** (CNAME chez Cloudflare, compte de Stan).
      Au passage, une vraie faute trouvée : le projet Vercel n'avait **pas de dossier racine**, donc
      chaque déploiement Git construisait la racine du repo — vide — en 163 ms, et la prod était un
      404 depuis la liaison du repo, caché derrière la connexion Vercel. Réglé : dossier racine `web`,
      framework Next.js, et le `package-lock.json` vide de la racine retiré. Leçon : un build Vercel
      qui « réussit » en moins d'une seconde n'a rien construit

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
- [x] Identifiants Google créés et posés sur Vercel (Production + Preview) et en local
- [x] **Parcours vérifié de bout en bout dans Chrome**, avec le vrai écran de consentement
      Google : retour sur `/` sans erreur, `/api/auth/moi` reconnaît le Membre. Au passage, un
      vrai piège corrigé : le cookie d'état OAuth en `SameSite=Lax` ne revenait pas après le
      POST de consentement de Google → `SameSite=None; Secure`, validité 15 min, et un
      diagnostic serveur si ça se reproduit

## BRU-5 — Données de départ

- [x] L'Espace (identifiant fixe) et les Membres — `pnpm db:seed`, idempotent, **posé en
      production**. Seul Antoine est pré-créé : on ne connaît pas les adresses des deux autres,
      et la connexion Google crée un Membre à la première venue de quiconque du domaine — une
      adresse devinée ferait un doublon. Pour les pré-créer : `SEED_MEMBRES="Stan:…,Victor:…"`
- [x] Les Affectations de départ : MONKA, AFP, Coup de Pâtes, Interne, et Bergamote désactivée
- [x] Des Créneaux par défaut (09:15 · 14:00 · 17:30) pour tout Membre qui n'en a aucun —
      sans jamais remettre ceux qu'un Membre a retirés
- [x] Un jeu de démonstration (les 19 Tâches des maquettes, 4 Affectations en cours) —
      `pnpm db:seed:demo`, **refusé hors de localhost**, et prouvé refusé sur Neon
- [x] 3 tests : relancer ne change rien, les Créneaux retirés le restent, la démo se relance
      sans doublon

## BRU-38 — Thème clair et sombre

Le design existe désormais dans les deux thèmes, sur les deux plateformes
(`Bruno Web v2` / `Bruno Web v2 - Light`, `Bruno iOS v2` / `Bruno iOS v2 - Light`).
À traiter **avant** de construire les écrans : c'est un jeu de tokens, pas une passe de
peinture à la fin.

- [x] **Le thème suit le réglage système.** Aucun sélecteur nulle part — les maquettes des
      Réglages n'en montrent pas, et « thème configurable » reste hors scope. Un seul
      comportement, zéro état à tester
- [x] **Un seul jeu de tokens**, deux valeurs par token. Jamais deux feuilles de style, jamais
      une couleur écrite en dur dans un composant
- [x] **L'accent change entre les thèmes** — c'est le point à ne pas rater :
      `#F27313` en sombre, **`#E4640A` en clair**. L'orange de marque doit foncer sur fond
      clair pour rester lisible ; le reprendre tel quel casse le contraste
- [x] Les couleurs sémantiques suivent la même règle, ce n'est **pas** un simple inversement :
      *En cours* passe de `oklch(.74 .13 155)` à `oklch(.58 .13 155)`, *Bloqué* de
      `oklch(.70 .16 22)` à `oklch(.58 .16 22)`
- [x] Fonds et texte, pour référence : sombre `#0B0B0B` / `#161616` / `#262626` / `#EDEDED` /
      `#B8B8B8` — clair `#F7F5F0` / `#FFFFFF` / `#D9D5CC` / `#161512` / `#6B675F`
- [x] **Web** : tokens CSS + `prefers-color-scheme` — `globals.css`, exposés à Tailwind
      (`bg-surface`, `text-accent`…). Deux tests gardent le thème honnête : chaque token existe
      dans les deux thèmes, et aucune couleur n'est écrite en dur hors du fichier de tokens
- [x] **iOS** : les mêmes tokens dans `Theme.swift`, deux valeurs par token, livrés avec BRU-6
- [x] **Le widget suit** (BRU-10) — ⏳ les notifications avec BRU-25
- [x] *9 septembre* : Réglages › Apparence choisit Système / Clair / Sombre en vignettes (cookie `bruno_theme`, BRU-43 puis BRU-53)

## BRU-53 — Un sélecteur maison partout, l'icône Réglages, l'Apparence en vignettes · **livré le 9 septembre**

- [x] Plus de `<select>` natif : le même sélecteur (Radix Popover) pour le Statut, l'Assigné, les
      Aidants, le droit d'entrée, la Récurrence — sur iOS, la même feuille `ChoixFeuille`
- [x] L'entrée Réglages du rail a une icône qui se comprend (curseurs)
- [x] Apparence : trois vignettes qui montrent le thème, pas trois mots

## BRU-54 — La photo de profil, depuis le web ou l'iPhone · **livré le 9 septembre**

- [x] `membre.avatar` : une image de 160 px en data URL (migration 0004) — assez pour un rond ;
      `GET/PATCH /api/auth/moi`
- [x] Web : Réglages › Compte — ajouter, changer, retirer, l'image réduite dans le navigateur
- [x] iOS : l'avatar en haut d'Aujourd'hui ouvre le Profil — photo depuis la pellicule, ou retirer
- [x] La photo remplace l'initiale partout : cartes, bandeau, filtre, fiche, sélecteurs, Daily, Fait, rail

