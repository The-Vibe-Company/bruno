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

Pas d'équipe Apple pour l'instant : le simulateur suffit, on ne signe pas. Pour un iPhone réel,
poser `DEVELOPMENT_TEAM` dans `project.yml`.

- `App/` — l'entrée, la barre d'onglets, le micro au centre.
- `Capture/` — l'écran Capture (BRU-6), la file d'attente hors ligne (BRU-7), le micro et la transcription (BRU-8).
- `Reseau/` — la seule porte de sortie réseau.
- `Theme/` — les tokens des maquettes.
