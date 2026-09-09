import Foundation

/// Ce que l'app et le widget se disent — par le groupe d'apps, en quelques nombres.
enum Partage {
    static let groupe = "group.co.thevibecompany.bruno"
    static let schema = "bruno"
    static let lienCapture = URL(string: "bruno://capture")!

    struct Resume: Codable, Sendable, Equatable {
        var engagementsAujourdhui: Int
        var aTrier: Int
        var jour: String
    }

    static var defauts: UserDefaults { UserDefaults(suiteName: groupe) ?? .standard }

    static func lire() -> Resume? {
        guard let d = defauts.data(forKey: "resume") else { return nil }
        return try? JSONDecoder().decode(Resume.self, from: d)
    }

    static func ecrire(_ r: Resume) {
        if let d = try? JSONEncoder().encode(r) { defauts.set(d, forKey: "resume") }
    }
}
