import Foundation
import Network
import Observation

/// Une Capture, telle qu'elle attend sur le disque. `audio` est le nom du fichier son, à côté.
struct Capture: Codable, Identifiable, Sendable {
    let id: UUID
    let titre: String
    let transcriptionBrute: String?
    let audio: String?
    let creeLe: Date
    var essais: Int
}

/// Ce que le serveur reçoit — le titre, et la transcription brute qui ne s'écrase jamais (règle 3).
private struct CorpsCapture: Encodable, Sendable {
    let titre: String
    let transcriptionBrute: String?
}

/**
 La file des Captures à envoyer — BRU-7, le ticket le plus important du produit.

 Tout est écrit sur le disque **avant** le moindre appel réseau ; la file survit à un kill de l'app
 et à un redémarrage ; au retour du réseau, tout repart, avec un recul progressif. Un échec réseau
 est un état, jamais une alerte.
 */
@MainActor
@Observable
final class FileAttente {
    static let partagee = FileAttente()

    private(set) var captures: [Capture] = []
    private(set) var enLigne = true
    private var envoiEnCours = false

    let dossier: URL
    private let fichier: URL
    private let moniteur = NWPathMonitor()

    init() {
        let support = (try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)) ?? URL.temporaryDirectory
        dossier = support.appending(path: "Bruno", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: dossier, withIntermediateDirectories: true)
        fichier = dossier.appending(path: "captures.json")
        charger()
        moniteur.pathUpdateHandler = { [weak self] chemin in
            let satisfait = chemin.status == .satisfied
            Task { @MainActor in
                guard let self else { return }
                self.enLigne = satisfait
                if satisfait { await self.envoyer() }
            }
        }
        moniteur.start(queue: DispatchQueue(label: "co.thevibecompany.bruno.reseau"))
    }

    var enAttente: Int { captures.count }

    /// Poser une Capture : sur le disque d'abord, puis on tente l'envoi. Elle apparaît dans À trier de toute façon.
    func ajouter(titre: String, transcription: String?, audio: URL?) {
        let capture = Capture(id: UUID(), titre: titre, transcriptionBrute: transcription, audio: audio?.lastPathComponent, creeLe: .now, essais: 0)
        captures.append(capture)
        sauver()
        Task { await envoyer() }
    }

    /// Envoyer ce qui attend, dans l'ordre, une Capture à la fois. Un refus définitif du serveur sort la Capture de la file ; tout le reste réessaie.
    func envoyer() async {
        guard !envoiEnCours, enLigne else { return }
        envoiEnCours = true
        defer { envoiEnCours = false }
        while let capture = captures.first {
            do {
                try await Api.partagee.poster("api/taches", CorpsCapture(titre: capture.titre, transcriptionBrute: capture.transcriptionBrute))
                retirer(capture)
            } catch let erreur as Api.Erreur where erreur.definitive {
                retirer(capture)
            } catch {
                captures[0].essais += 1
                sauver()
                let recul = min(60.0, pow(2.0, Double(captures[0].essais)))
                try? await Task.sleep(for: .seconds(recul))
                if !enLigne { return }
            }
        }
    }

    private func retirer(_ capture: Capture) {
        captures.removeAll { $0.id == capture.id }
        sauver()
        if let audio = capture.audio { try? FileManager.default.removeItem(at: dossier.appending(path: audio)) }
    }

    private func charger() {
        guard let donnees = try? Data(contentsOf: fichier) else { return }
        captures = (try? JSONDecoder().decode([Capture].self, from: donnees)) ?? []
    }

    private func sauver() {
        guard let donnees = try? JSONEncoder().encode(captures) else { return }
        try? donnees.write(to: fichier, options: .atomic)
    }
}
