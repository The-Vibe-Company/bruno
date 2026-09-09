import Foundation

/// Le serveur de Bruno. En développement, le Mac — le simulateur partage son `localhost` — et la
/// connexion dev, qui pose un cookie ; en production, Vercel. Une seule porte de sortie réseau.
@MainActor
final class Api {
    static let partagee = Api()

    let base: URL
    private let session: URLSession
    private var connecte = false

    struct Erreur: Error, LocalizedError, Sendable {
        let statut: Int
        let message: String
        var errorDescription: String? { message }
        /// Une erreur du serveur qui ne changera pas si l'on réessaie : la requête est fautive.
        var definitive: Bool { (400..<500).contains(statut) && ![401, 408, 429].contains(statut) }
    }

    private struct Refus: Decodable { let message: String? }

    init() {
        #if DEBUG
        base = URL(string: "http://localhost:3001")!
        #else
        base = URL(string: (Bundle.main.infoDictionary?["BrunoApiUrl"] as? String) ?? "https://bruno-the-vibe-company.vercel.app")!
        #endif
        let conf = URLSessionConfiguration.default
        conf.httpCookieStorage = .shared
        conf.httpShouldSetCookies = true
        conf.timeoutIntervalForRequest = 15
        conf.waitsForConnectivity = false
        session = URLSession(configuration: conf)
    }

    /// Une session, une fois. En dev, `/api/auth/dev` pose le cookie — jamais en production.
    private func connecter() async throws {
        if connecte { return }
        #if DEBUG
        let (_, reponse) = try await session.data(from: base.appending(path: "api/auth/dev"))
        let statut = (reponse as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<400).contains(statut) else { throw Erreur(statut: statut, message: "Connexion dev refusée (\(statut))") }
        #endif
        connecte = true
    }

    func poster(_ chemin: String, _ corps: some Encodable & Sendable) async throws {
        try await connecter()
        var requete = URLRequest(url: base.appending(path: chemin))
        requete.httpMethod = "POST"
        requete.setValue("application/json", forHTTPHeaderField: "content-type")
        requete.httpBody = try JSONEncoder().encode(corps)
        let (donnees, reponse) = try await session.data(for: requete)
        let statut = (reponse as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(statut) else {
            if statut == 401 { connecte = false }
            let message = (try? JSONDecoder().decode(Refus.self, from: donnees))?.message ?? "Erreur \(statut)"
            throw Erreur(statut: statut, message: message)
        }
    }
}
