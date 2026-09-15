import SwiftUI

@main
struct BrunoApp: App {
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            Group {
                if Connexion.partagee.active { Racine() }
                else { ConnexionVue() }
            }
                .preferredColorScheme(.dark)
                // Ce qui attendait sur le disque repart dès l'ouverture, et à chaque retour au premier plan (BRU-7).
                .task(id: Connexion.partagee.active) {
                    if Connexion.partagee.active { await FileAttente.partagee.envoyer() }
                }
                .onChange(of: phase) { _, nouvelle in
                    if nouvelle == .active && Connexion.partagee.active { Task { await FileAttente.partagee.envoyer() } }
                }
        }
    }
}
