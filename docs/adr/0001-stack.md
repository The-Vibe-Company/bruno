# 1. Stack technique de Bruno

**Statut** : accepté — sous réserve du plan Vercel (voir « Condition »)
**Date** : 2026-09-07
**Ticket** : BRU-1 / THE-577

## Contexte

Bruno est un outil interne pour trois personnes : un board web et une app iOS.
Le [PRD](../../PRD.md) impose quatre contraintes qui éliminent la plupart des raccourcis
habituels :

1. **Un widget d'écran d'accueil et des notifications actionnables.** Les deux sont des
   surfaces système iOS. Elles excluent React Native et tout wrapper web.
2. **La Capture doit fonctionner hors ligne**, avec une file d'attente qui survit à un kill
   de l'app (BRU-7).
3. **Des Relances poussées à heure fixe**, au quart d'heure près, par Membre (BRU-24).
   C'est le pilier 2 : sans elles, le produit meurt.
4. **API-first**, parce que l'app iOS en dépend et que les connecteurs d'agents IA viendront
   s'y brancher plus tard.

Aucune habitude de stack préexistante chez The Vibe Company, sauf Neon et Supabase côté base.

## Décision

Deux bases de code, **un seul contrat**.

```
bruno/
├── web/     Next.js App Router — le board, le Daily, le Fait, ET les routes API
├── ios/     Swift / SwiftUI — capture, widget, notifications
├── docs/    PRD, CONTEXT, ADR
└── tickets/
```

| Couche | Choix |
|---|---|
| iOS | Swift + SwiftUI · WidgetKit · UserNotifications |
| Web + API | Next.js App Router, déployé sur Vercel |
| Base | Postgres — **Neon** via le Marketplace Vercel |
| Contrat d'API | **OpenAPI**, d'où sont générés le client Swift (`swift-openapi-generator`) et les types TypeScript |
| Auth | Google Sign-In natif iOS → vérification de l'ID token côté serveur → session maison |
| Push | **APNs en direct**, sans intermédiaire |
| Planification | **Vercel Cron** toutes les 15 minutes (`*/15 * * * *`) |
| Composants web | **shadcn/ui** sur Tailwind, **dnd-kit** pour le glisser-déposer |
| Composants iOS | SwiftUI nu, aucune bibliothèque UI tierce |

L'API n'est pas une troisième base de code : ce sont les route handlers que le web utilise
déjà, et que l'app iOS consomme.

## Condition

**Cette décision suppose un plan Vercel Pro.** Les limites de Vercel Cron sont :

| Plan | Intervalle minimum | Précision |
|---|---|---|
| Hobby | une fois par jour | ±59 min |
| Pro / Enterprise | une fois par minute | à la minute |

Sur Hobby, un cron `*/15 * * * *` **fait échouer le déploiement**. Le pilier 2 serait
impossible, et il faudrait un ordonnanceur persistant ailleurs (petite VM, Railway,
Cloud Scheduler) — ce qui ajouterait une troisième chose à déployer et à surveiller.

**À vérifier avant la première ligne de code du moteur de Relance.**

## Alternatives écartées

**React Native ou Expo, une seule base de code.** Écarté : le widget d'écran d'accueil et les
notifications actionnables sont précisément ce qui porte les deux piliers. Les rendre plus
difficiles pour économiser une base de code, c'est sacrifier le produit pour économiser du
travail.

**Une API séparée (Go, Node, Python) en plus du web.** Écarté : à trois utilisateurs, c'est un
troisième déploiement, un troisième CI, un troisième endroit où lire les logs — pour zéro
bénéfice. Les route handlers Next.js font le même travail.

**Supabase plutôt que Neon.** Écarté : ses deux atouts sont son auth (faite maison ici) et son
temps réel (le PRD tranche pour un rafraîchissement toutes les 10 s). Il ne resterait que
Postgres, autant le prendre nu et intégré au Marketplace Vercel. À reconsidérer si le besoin
de temps réel devient réel.

**Clerk ou Auth0 pour l'auth.** Écarté : trois utilisateurs, un seul domaine Workspace, aucune
inscription, aucun mot de passe, aucune réinitialisation, aucun rôle. Aucun des problèmes que
ces services résolvent n'existe ici. Coût de l'alternative : la gestion du refresh de session
côté iOS, qui est la partie pénible du « maison ».

**Une bibliothèque de composants thémée (MUI, Mantine, Chakra).** Écarté : le design est très
typé et une bibliothèque au langage visuel fort se battrait contre lui. shadcn/ui n'est pas une
dépendance — les composants sont copiés dans le dépôt — donc on garde le comportement et
l'accessibilité de Radix tout en possédant l'apparence.

**Tout écrire à la main côté web.** Écarté : on réécrirait mal un menu déroulant et un
sélecteur de date.

**`react-beautiful-dnd`.** Écarté : abandonné en amont. `dnd-kit` le remplace.

## Conséquences

**Bonnes.** Un seul déploiement web qui sert le board et l'API. L'app iOS reste native, donc le
widget, les notifications actionnables et la file hors ligne sont faciles au lieu d'être des
combats. Le contrat OpenAPI fait échouer la compilation Xcode quand le backend renomme un
champ — c'est ce qui empêche deux bases de code de diverger silencieusement.

**Coûteuses.** Deux langages, donc deux compétences à tenir. Le fichier OpenAPI est un artefact
de plus à maintenir, et il ne sert à rien s'il n'est pas la source de vérité — s'il devient de
la documentation écrite après coup, on perd tout son intérêt. La session maison exige d'écrire
correctement le refresh côté iOS.

**Surveillé.** Le rafraîchissement toutes les 10 s est volontairement pauvre. Si le tri à trois
en simultané le lundi matin devient pénible, c'est le premier endroit à revoir — et Supabase
redeviendrait pertinent.
