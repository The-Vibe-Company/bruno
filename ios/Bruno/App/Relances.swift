import SwiftUI
import UserNotifications

/**
 Les Relances sur l'iPhone (BRU-25).

 Apple donne un **jeton** qui désigne cette app sur cet appareil. Il change sans prévenir —
 réinstallation, restauration, parfois une mise à jour — donc on le renvoie à chaque lancement
 plutôt que de croire qu'il vaut pour toujours. Le serveur remplace sur le jeton : ça n'empile pas.

 On ne demande l'autorisation qu'une fois connecté : une permission réclamée sur l'écran de
 connexion se fait refuser, et iOS ne la propose plus.
 */
@MainActor
final class Relances: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().setNotificationCategories([Self.categorie])
        return true
    }

    /// « Terminé » sans ouvrir l'app, « Reporter » en l'ouvrant : c'est là qu'on choisit la raison.
    private static let categorie = UNNotificationCategory(
        identifier: "RELANCE",
        actions: [
            UNNotificationAction(identifier: "TERMINER", title: "Terminé", options: []),
            UNNotificationAction(identifier: "REPORTER", title: "Reporter", options: [.foreground]),
        ],
        intentIdentifiers: [],
        options: [])

    /// Demander, puis s'inscrire. Un refus n'est pas une erreur : on n'insiste pas.
    /// Sans état : l'instance qui reçoit le jeton est celle que SwiftUI garde, pas celle-ci.
    static func demander() async {
        let centre = UNUserNotificationCenter.current()
        guard let accorde = try? await centre.requestAuthorization(options: [.alert, .sound, .badge]), accorde else { return }
        UIApplication.shared.registerForRemoteNotifications()
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken jetonBrut: Data) {
        let jeton = jetonBrut.map { String(format: "%02x", $0) }.joined()
        Task {
            struct Corps: Encodable, Sendable { let jeton: String; let appareil: String }
            try? await Api.partagee.poster("api/push/iphone", Corps(jeton: jeton, appareil: UIDevice.current.name))
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[relances] inscription refusée : \(error.localizedDescription)")
    }

    /// Bruno ouvert, la Relance s'affiche quand même : c'est l'heure, et c'est le propos.
    /// `nonisolated` : iOS appelle le délégué d'où il veut, ces deux méthodes ne touchent à rien de partagé.
    nonisolated func userNotificationCenter(_ centre: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .list]
    }

    /// La première Tâche nommée par la Relance : c'est elle que « Terminé » ferme.
    nonisolated func userNotificationCenter(_ centre: UNUserNotificationCenter, didReceive reponse: UNNotificationResponse) async {
        let infos = reponse.notification.request.content.userInfo
        guard let id = (infos["tacheIds"] as? [String])?.first else { return }
        switch reponse.actionIdentifier {
        case "TERMINER": try? await Api.partagee.poster("api/taches/\(id)/terminer")
        default: break
        }
    }
}
