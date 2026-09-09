import Foundation
import Observation

/// Ce que l'écran En attente sait : les Tâches des trois Buckets d'attente, les Membres, moi.
@MainActor
@Observable
final class EnAttenteModele {
    private(set) var taches: [Tache] = []
    private(set) var membres: [Membre] = []
    private(set) var moi: Moi?
    private(set) var erreur: String?
    private(set) var chargeUneFois = false

    func taches(_ bucket: Bucket) -> [Tache] { taches.filter { $0.bucket == bucket } }
    func membre(_ id: String?) -> Membre? { membres.first { $0.id == id } }

    func charger() async {
        do {
            async let aTrier: [Tache] = Api.partagee.obtenir("api/taches?bucket=a_trier")
            async let aVenir: [Tache] = Api.partagee.obtenir("api/taches?bucket=a_venir")
            async let idees: [Tache] = Api.partagee.obtenir("api/taches?bucket=idees")
            async let membres: [Membre] = Api.partagee.obtenir("api/membres")
            async let moi: Moi = Api.partagee.obtenir("api/auth/moi")
            taches = try await aTrier + aVenir + idees
            self.membres = try await membres
            self.moi = try await moi
            erreur = nil
        } catch {
            erreur = "Le serveur ne répond pas — ce qu'on voit peut dater. (\(error.localizedDescription))"
        }
        chargeUneFois = true
    }

    private struct VersSurLeFeu: Encodable, Sendable { let bucket = "sur_le_feu"; let assigneId: String; let engagement: String }
    private struct VersAVenir: Encodable, Sendable { let bucket = "a_venir"; let engagement: String? }
    private struct VersIdees: Encodable, Sendable { let bucket = "idees" }

    /// Passer Sur le feu — le droit d'entrée, Assigné et Engagement, toujours (invariant 2).
    func passerSurLeFeu(_ t: Tache, assigneId: String, engagement: String) async throws {
        try await Api.partagee.poster("api/taches/\(t.id)/bucket", VersSurLeFeu(assigneId: assigneId, engagement: engagement))
        await charger()
    }

    func passerAVenir(_ t: Tache, engagement: String?) async throws {
        try await Api.partagee.poster("api/taches/\(t.id)/bucket", VersAVenir(engagement: engagement))
        await charger()
    }

    func passerEnIdees(_ t: Tache) async throws {
        try await Api.partagee.poster("api/taches/\(t.id)/bucket", VersIdees())
        await charger()
    }

    /// Supprimer efface pour de bon : réservé à ce qui n'aurait jamais dû exister.
    func supprimer(_ t: Tache) async throws {
        try await Api.partagee.supprimer("api/taches/\(t.id)")
        taches.removeAll { $0.id == t.id }
    }
}
