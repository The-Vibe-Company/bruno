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
    /// Le jour pour lequel on s'engage. `nil` : la Capture reste À trier, comme avant.
    var engagement: String?
    /// L'identifiant rendu par le serveur, une fois la Tâche créée : le deuxième appel s'y accroche
    /// si le réseau lâche entre les deux, et on ne recrée jamais la même Tâche.
    var idServeur: String?
}

/// Ce que le serveur reçoit — le titre, et la transcription brute qui ne s'écrase jamais (règle 3).
private struct CorpsCapture: Encodable, Sendable {
    let titre: String
    let transcriptionBrute: String?
}

/// Ce qu'il rend : de quoi enchaîner sur le droit d'entrée.
private struct TacheCreee: Decodable, Sendable { let id: String }

/// Le droit d'entrée, vu du téléphone : une date, et rien d'autre — l'Assigné, c'est moi.
private struct CorpsEntree: Encodable, Sendable {
    let bucket = "sur_le_feu"
    let engagement: String
    let statut = "a_faire"
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

    /**
     Poser une Capture : sur le disque d'abord, puis on tente l'envoi.

     Avec un `engagement`, elle entre **Sur le feu** pour ce jour-là, à mon nom — c'est ce qu'on
     veut neuf fois sur dix quand on capture en marchant. Sans, elle attend dans À trier.
     */
    func ajouter(titre: String, transcription: String?, audio: URL?, engagement: String? = nil) {
        let capture = Capture(id: UUID(), titre: titre, transcriptionBrute: transcription, audio: audio?.lastPathComponent, creeLe: .now, essais: 0, engagement: engagement)
        captures.append(capture)
        sauver()
        Task { await envoyer() }
    }

    /// Envoyer ce qui attend, dans l'ordre, une Capture à la fois. Un refus définitif du serveur sort la Capture de la file ; tout le reste réessaie.
    func envoyer() async {
        guard !envoiEnCours, enLigne, Connexion.partagee.active else { return }
        envoiEnCours = true
        defer { envoiEnCours = false }
        while let capture = captures.first {
            do {
                // Deux temps, et un seul essai pour le premier : l'identifiant gardé empêche le doublon.
                let id: String
                if let dejaCreee = capture.idServeur {
                    id = dejaCreee
                } else {
                    let creee: TacheCreee = try await Api.partagee.envoyer("api/taches", CorpsCapture(titre: capture.titre, transcriptionBrute: capture.transcriptionBrute))
                    id = creee.id
                    captures[0].idServeur = id
                    sauver()
                }
                if let engagement = capture.engagement {
                    try await Api.partagee.poster("api/taches/\(id)/bucket", CorpsEntree(engagement: engagement))
                }
                retirer(capture)
            } catch let erreur as Api.Erreur where erreur.statut == 401 {
                // Garder la capture : la connexion relancera la file quand la session reviendra.
                return
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
