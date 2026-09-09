import SwiftUI

@main
struct BrunoApp: App {
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            Racine()
                .preferredColorScheme(.dark)
                // Ce qui attendait sur le disque repart dès l'ouverture, et à chaque retour au premier plan (BRU-7).
                .task { await FileAttente.partagee.envoyer() }
                .onChange(of: phase) { _, nouvelle in
                    if nouvelle == .active { Task { await FileAttente.partagee.envoyer() } }
                }
        }
    }
}
