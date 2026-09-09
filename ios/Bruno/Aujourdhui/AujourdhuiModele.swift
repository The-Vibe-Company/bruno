import Foundation
import Observation
import WidgetKit

/// Ce qu'Aujourd'hui sait : mes Tâches Sur le feu qui sont dues, celles où j'aide, et sur quoi je suis.
@MainActor
@Observable
final class AujourdhuiModele {
    private(set) var moi: Moi?
    private(set) var membres: [Membre] = []
    private(set) var surLeFeu: [Tache] = []
    /// Fini ces sept derniers jours, du plus récent au plus ancien : ce qu'on peut rouvrir si le doigt a glissé.
    private(set) var faites: [Tache] = []
    private(set) var quiEstSurQuoi: [AffectationsMembre] = []
    private(set) var choix: [Affectation] = []
    private(set) var erreur: String?
    private(set) var chargeUneFois = false

    /// Mes Tâches Sur le feu, vivantes, par Statut — toutes, l'Engagement se lit sur la ligne. La liste vient triée par Rang.
    func miennes(_ statut: Statut) -> [Tache] {
        guard let moi else { return [] }
        return surLeFeu.filter { $0.assigneId == moi.id && $0.statut == statut }
    }
    var aideSur: [Tache] { guard let moi else { return [] }; return surLeFeu.filter { $0.aidantIds.contains(moi.id) } }
    var mesAffectations: [Sur] { quiEstSurQuoi.first { $0.membreId == moi?.id }?.affectations ?? [] }
    func membre(_ id: String?) -> Membre? { membres.first { $0.id == id } }

    func charger() async {
        do {
            async let moi: Moi = Api.partagee.obtenir("api/auth/moi")
            async let membres: [Membre] = Api.partagee.obtenir("api/membres")
            async let feu: [Tache] = Api.partagee.obtenir("api/taches?bucket=sur_le_feu&inclureTerminees=true")
            async let sur: [AffectationsMembre] = Api.partagee.obtenir("api/affectations/en-cours")
            async let choix: [Affectation] = Api.partagee.obtenir("api/affectations")
            self.moi = try await moi
            self.membres = try await membres
            let toutes = try await feu
            surLeFeu = toutes.filter { !$0.finie }
            let limite = Jours.decale(-7)
            let moiId = self.moi?.id
            faites = toutes.filter { $0.finie && $0.assigneId == moiId && ($0.termineLe ?? "") >= limite }.sorted { ($0.termineLe ?? "") > ($1.termineLe ?? "") }
            quiEstSurQuoi = try await sur
            self.choix = try await choix.filter(\.actif)
            erreur = nil
            partagerAuWidget()
        } catch {
            erreur = "Le serveur ne répond pas — ce qu'on voit peut dater."
        }
        chargeUneFois = true
    }

    /// Les chiffres du widget : mes Engagements du jour, et ce qu'il y a à trier — on les lui pousse à chaque chargement.
    private func partagerAuWidget() {
        Task {
            let aTrier: [Tache] = (try? await Api.partagee.obtenir("api/taches?bucket=a_trier")) ?? []
            let engagements = [Statut.enCours, .aFaire, .bloque].reduce(0) { $0 + miennes($1).count }
            let resume = Partage.Resume(engagementsAujourdhui: engagements, aTrier: aTrier.count, jour: Jours.aujourdhui())
            if Partage.lire() != resume { Partage.ecrire(resume); WidgetCenter.shared.reloadAllTimelines() }
        }
    }

    func terminer(_ t: Tache) async throws {
        try await Api.partagee.poster("api/taches/\(t.id)/terminer")
        surLeFeu.removeAll { $0.id == t.id }
        await charger()
    }

    /// Un « Terminé » de trop : on rouvre, rien d'autre ne bouge.
    func rouvrir(_ t: Tache) async throws {
        try await Api.partagee.poster("api/taches/\(t.id)/rouvrir")
        await charger()
    }

    private struct Prendre: Encodable, Sendable { let affectationId: String }

    /// « Aujourd'hui je suis sur… » — une ou plusieurs, à partir d'aujourd'hui ; décocher, c'est « je ne suis plus dessus ».
    func poser(affectationIds: Set<String>) async throws {
        let actuelles = mesAffectations
        for id in affectationIds where !actuelles.contains(where: { $0.affectationId == id }) {
            try await Api.partagee.poster("api/affectations/en-cours", Prendre(affectationId: id))
        }
        for sur in actuelles where !affectationIds.contains(sur.affectationId) {
            try await Api.partagee.poster("api/affectations/en-cours/\(sur.id)/fin")
        }
        await charger()
    }

    func quitter(_ sur: Sur) async throws {
        try await Api.partagee.poster("api/affectations/en-cours/\(sur.id)/fin")
        await charger()
    }
}
