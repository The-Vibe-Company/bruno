import Foundation

/// Les quatre Buckets — la place d'une Tâche (CONTEXT.md).
enum Bucket: String, Codable, Sendable, CaseIterable {
    case aTrier = "a_trier", surLeFeu = "sur_le_feu", aVenir = "a_venir", idees
    var libelle: String {
        switch self { case .aTrier: "À trier"; case .surLeFeu: "Sur le feu"; case .aVenir: "À venir"; case .idees: "Idées" }
    }
}

enum Statut: String, Codable, Sendable { case aFaire = "a_faire", enCours = "en_cours", bloque }

/// Une Tâche telle que le serveur la rend. Les jours sont des chaînes `AAAA-MM-JJ` — jamais des dates locales.
struct Tache: Codable, Identifiable, Sendable, Hashable {
    let id: String
    var titre: String
    var notes: String?
    let transcriptionBrute: String?
    var bucket: Bucket
    var statut: Statut?
    var assigneId: String?
    var aidantIds: [String]
    var engagement: String?
    var reportsCount: Int
    var raisonBlocage: String?
    let creeParId: String?
    let createdAt: String
}

struct Membre: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let nom: String
    var initiale: String { String(nom.trimmingCharacters(in: .whitespaces).prefix(1)).uppercased() }
}

struct Moi: Codable, Sendable {
    let id: String
    let nom: String
    let email: String
}

/// Une Affectation — ce à quoi on peut travailler. La couleur est une donnée, stockée en base.
struct Affectation: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let nom: String
    let couleur: String
    let actif: Bool
}

/// Une ligne de « qui est sur quoi » : l'`id` est celui de la période — c'est lui qu'on ferme.
struct Sur: Codable, Identifiable, Sendable, Hashable {
    let id: String
    let affectationId: String
    let nom: String
    let couleur: String
    let depuis: String
    let jusqu: String?
}

struct AffectationsMembre: Codable, Identifiable, Sendable {
    let membreId: String
    let nom: String
    let affectations: [Sur]
    var id: String { membreId }
}
