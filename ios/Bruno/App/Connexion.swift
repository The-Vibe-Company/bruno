import AuthenticationServices
import CryptoKit
import Observation
import Security
import SwiftUI

/// Le navigateur obtient un code Google ; seul cet iPhone possède sa preuve PKCE.
@MainActor @Observable
final class Connexion: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let partagee = Connexion()
    private(set) var jeton = try? Trousseau.lire()
    private(set) var occupe = false
    private(set) var erreur: String?
    @ObservationIgnored private var navigation: ASWebAuthenticationSession?
    @ObservationIgnored private var fenetre: UIWindow?

    var active: Bool {
        #if DEBUG
        true
        #else
        jeton != nil
        #endif
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        fenetre!
    }

    func connecter() {
        guard !occupe else { return }
        erreur = nil
        fenetre = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .filter { $0.activationState == .foregroundActive }.flatMap(\.windows).first(where: \.isKeyWindow)
        guard fenetre != nil else { erreur = "La fenêtre de connexion n'est pas disponible."; return }
        do {
            let verifier = try aleatoire()
            let state = try aleatoire()
            let challenge = base64URL(Data(SHA256.hash(data: Data(verifier.utf8))))
            var url = URLComponents(url: Api.partagee.base.appending(path: "api/auth/google"), resolvingAgainstBaseURL: false)!
            url.queryItems = [URLQueryItem(name: "platform", value: "ios"), URLQueryItem(name: "state", value: state), URLQueryItem(name: "code_challenge", value: challenge)]
            let session = ASWebAuthenticationSession(url: url.url!, callbackURLScheme: "bruno") { [weak self] retour, erreur in
                Task { @MainActor in
                    guard let self else { return }
                    defer { self.occupe = false; self.navigation = nil; self.fenetre = nil }
                    if let erreur {
                        if (erreur as? ASWebAuthenticationSessionError)?.code != .canceledLogin {
                            self.erreur = "La connexion n'a pas abouti. Réessaie."
                        }
                        return
                    }
                    guard let retour, retour.scheme == "bruno", retour.host == "auth",
                          let composants = URLComponents(url: retour, resolvingAgainstBaseURL: false),
                          composants.queryItems?.first(where: { $0.name == "state" })?.value == state else {
                        self.erreur = "Retour de connexion invalide. Réessaie."; return
                    }
                    guard let code = composants.queryItems?.first(where: { $0.name == "code" })?.value,
                          !code.isEmpty,
                          composants.queryItems?.contains(where: { $0.name == "error" }) != true else {
                        self.erreur = "Connexion Google annulée ou refusée."; return
                    }
                    do { try await self.echanger(code: code, verifier: verifier) }
                    catch { self.erreur = error.localizedDescription }
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = true
            navigation = session
            occupe = true
            if !session.start() { occupe = false; navigation = nil; erreur = "Impossible d'ouvrir la connexion Google." }
        } catch { erreur = error.localizedDescription }
    }

    func expirer() {
        jeton = nil
        try? Trousseau.effacer()
    }

    private func echanger(code: String, verifier: String) async throws {
        var requete = URLRequest(url: Api.partagee.base.appending(path: "api/auth/ios"))
        requete.httpMethod = "POST"
        requete.timeoutInterval = 30
        requete.setValue("application/json", forHTTPHeaderField: "content-type")
        requete.httpBody = try JSONSerialization.data(withJSONObject: ["code": code, "codeVerifier": verifier])
        let (donnees, reponse) = try await URLSession.shared.data(for: requete)
        guard let http = reponse as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            struct Refus: Decodable { let message: String? }
            throw Api.Erreur(statut: (reponse as? HTTPURLResponse)?.statusCode ?? 0,
                message: (try? JSONDecoder().decode(Refus.self, from: donnees))?.message ?? "Connexion impossible. Réessaie.")
        }
        struct Resultat: Decodable { let jeton: String }
        let resultat = try JSONDecoder().decode(Resultat.self, from: donnees)
        guard !resultat.jeton.isEmpty else { throw Api.Erreur(statut: 0, message: "Session manquante.") }
        try Trousseau.enregistrer(resultat.jeton)
        jeton = resultat.jeton
    }

    private func aleatoire() throws -> String {
        var octets = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, octets.count, &octets) == errSecSuccess else {
            throw Api.Erreur(statut: 0, message: "Impossible de préparer la connexion sécurisée.")
        }
        return base64URL(Data(octets))
    }

    private func base64URL(_ data: Data) -> String {
        data.base64EncodedString().replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
}

private enum Trousseau {
    private static var requete: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "co.thevibecompany.bruno.session",
         kSecAttrAccount as String: "bruno"]
    }

    static func lire() throws -> String? {
        var query = requete
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var resultat: CFTypeRef?
        let statut = SecItemCopyMatching(query as CFDictionary, &resultat)
        if statut == errSecItemNotFound { return nil }
        try verifier(statut)
        return (resultat as? Data).flatMap { String(data: $0, encoding: .utf8) }
    }

    static func enregistrer(_ jeton: String) throws {
        let valeurs: [String: Any] = [kSecValueData as String: Data(jeton.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        let statut = SecItemUpdate(requete as CFDictionary, valeurs as CFDictionary)
        if statut == errSecItemNotFound {
            try verifier(SecItemAdd(requete.merging(valeurs) { _, nouveau in nouveau } as CFDictionary, nil))
        } else { try verifier(statut) }
    }

    static func effacer() throws {
        let statut = SecItemDelete(requete as CFDictionary)
        if statut != errSecItemNotFound { try verifier(statut) }
    }

    private static func verifier(_ statut: OSStatus) throws {
        guard statut == errSecSuccess else { throw Api.Erreur(statut: Int(statut), message: "Impossible d'accéder à la session sécurisée sur cet iPhone.") }
    }
}

struct ConnexionVue: View {
    private var connexion: Connexion { .partagee }
    var body: some View {
        ZStack {
            Teinte.fondPage.ignoresSafeArea()
            VStack(spacing: 24) {
                Text("bruno").font(.system(size: 56, weight: .bold)).foregroundStyle(Teinte.accent)
                Text("Tes idées, tes engagements, au même endroit.")
                    .font(.title3).foregroundStyle(Teinte.texte).multilineTextAlignment(.center)
                Button { connexion.connecter() } label: {
                    HStack {
                        if connexion.occupe { ProgressView().tint(Teinte.surAccent) }
                        Text(connexion.occupe ? "Connexion…" : "Se connecter avec Google").fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity, minHeight: 54)
                }
                .buttonStyle(.plain).foregroundStyle(Teinte.surAccent)
                .background(Teinte.accent, in: RoundedRectangle(cornerRadius: 14))
                .disabled(connexion.occupe)
                Text("Utilise ton compte The Vibe Company.").font(.footnote).foregroundStyle(Teinte.texteSourd)
                if let erreur = connexion.erreur {
                    Text(erreur).foregroundStyle(Teinte.bloque).multilineTextAlignment(.center).accessibilityLabel(erreur)
                }
            }.padding(32)
        }
    }
}
