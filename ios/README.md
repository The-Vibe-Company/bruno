# Bruno — iOS

SwiftUI, iOS 18+, Swift 6. Le projet Xcode est **généré** par [XcodeGen](https://github.com/yonaskolb/XcodeGen)
à partir de `project.yml` — on ne commite pas le `.xcodeproj`.

```bash
brew install xcodegen
cd ios && xcodegen generate && open Bruno.xcodeproj
```

En `DEBUG`, l'app parle au serveur du Mac (`http://localhost:3001`, le simulateur partage son
`localhost`) et se connecte par `/api/auth/dev` — lancer le web avec `BRUNO_DEV_LOGIN=1`. En
production, l'URL vient de `BrunoApiUrl` dans l'Info.plist et la session de Google (BRU-4).

Pour compiler sans signature :

```bash
asc xcode build --project ios/Bruno.xcodeproj --scheme Bruno \
  --configuration Release --destination 'generic/platform=iOS' --no-code-signing
```

Commande exécutée depuis la racine du dépôt, après génération du projet.

## TestFlight avec asc

Le workflow `.github/workflows/ios.yml` compile la version Release sur les PR iOS.
Sur `main`, un changement dans `ios/`, le script de publication ou le workflow déclenche
ensuite une publication TestFlight. Un lancement manuel est aussi disponible sur `main`.
Les publications sont sérialisées et `asc` calcule le prochain numéro en tenant compte
des builds déjà envoyés et en cours de traitement. L'app et le widget partagent ce numéro.

### Configuration initiale du compte Apple

Compte prévu : `girard.stanislas@gmail.com`. La connexion interactive se fait avec :

```bash
asc web auth login --apple-id "girard.stanislas@gmail.com"
```

Le compte doit avoir accès au programme Apple Developer et à App Store Connect.
Configurer avec `asc` les deux identifiants `co.thevibecompany.bruno` et
`co.thevibecompany.bruno.widget`, puis associer à chacun l'App Group
`group.co.thevibecompany.bruno`. Créer la fiche Bruno et un groupe de testeurs internes
incluant le compte demandé. Créer une clé API d'équipe avec les droits nécessaires à
la signature et à l'envoi, ainsi qu'un certificat Apple Distribution avec sa clé privée.
La connexion web sert à la configuration initiale ; la CI utilise uniquement la clé API.

Configurer les paramètres suivants dans les Actions du dépôt :

| Type | Nom | Valeur |
| --- | --- | --- |
| Variable | `ASC_APP_ID` | Identifiant numérique de la fiche Bruno |
| Variable | `APPLE_TEAM_ID` | Identifiant de l'équipe Apple Developer |
| Variable | `TESTFLIGHT_GROUP_ID` | Identifiant du groupe interne |
| Secret | `ASC_KEY_ID` | Identifiant de la clé API |
| Secret | `ASC_ISSUER_ID` | Issuer de la clé API d'équipe |
| Secret | `ASC_PRIVATE_KEY_B64` | Contenu du fichier P8 encodé en base64 |
| Secret | `APPLE_CERTIFICATE_P12_B64` | Certificat et clé privée exportés en P12, encodés en base64 |
| Secret | `APPLE_CERTIFICATE_PASSWORD` | Mot de passe non vide du P12 |

Le runner importe le certificat dans un trousseau temporaire. Xcode récupère les profils
avec la clé API ; `asc` archive, exporte, envoie et attend le traitement Apple, puis affecte
le build au groupe interne. Les secrets temporaires sont supprimés même en cas d'échec.
Renouveler le certificat et les secrets avant expiration. Les testeurs externes et la
publication App Store demandent une configuration et une validation Apple distinctes.

### Publication locale

Avec le certificat installé dans le trousseau, définir `ASC_APP_ID`, `APPLE_TEAM_ID`,
`TESTFLIGHT_GROUP_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID` et `ASC_PRIVATE_KEY_PATH`
(chemin absolu du P8), puis lancer depuis la racine :

```bash
bash scripts/testflight.sh
```

Ne pas lancer une publication locale en parallèle de la CI : le numéro de build est
calculé au début de la publication. Les archives et le résultat JSON sont conservés dans
un dossier temporaire indiqué par le script. La version marketing se règle dans
`ios/project.yml`.

### Limite fonctionnelle actuelle

Le code Release contacte `https://bruno.thevibecompany.co`, mais le parcours de connexion
Google iOS reste à implémenter. Une installation TestFlight ne valide donc pas encore
l'accès authentifié aux données du serveur. L'icône initiale reprend le « b » orange
sur fond sombre de l'identité visuelle de l'app.

- `App/` — l'entrée, la barre d'onglets, le micro au centre.
- `Capture/` — l'écran Capture (BRU-6), la file d'attente hors ligne (BRU-7), le micro et la transcription (BRU-8).
- `Reseau/` — la seule porte de sortie réseau.
- `Theme/` — les tokens des maquettes.
