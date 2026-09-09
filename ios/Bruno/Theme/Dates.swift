import Foundation

/// Comment on nomme un jour — les mêmes mots que le web. Une date passée est une date, Bruno ne juge pas.
enum Jours {
    nonisolated(unsafe) private static let cal: Calendar = { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "Europe/Paris")!; c.locale = Locale(identifier: "fr_FR"); return c }()
    nonisolated(unsafe) private static let iso: DateFormatter = { let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = TimeZone(identifier: "Europe/Paris"); f.locale = Locale(identifier: "fr_FR"); return f }()

    static func aujourdhui() -> String { iso.string(from: .now) }
    static func date(_ jour: String) -> Date? { iso.date(from: jour) }
    static func jour(_ date: Date) -> String { iso.string(from: date) }

    /// « aujourd'hui », « demain », « hier », « 12 sept. »
    static func libelle(_ jour: String) -> String {
        guard let d = date(jour), let ref = date(aujourdhui()) else { return jour }
        let delta = cal.dateComponents([.day], from: ref, to: d).day ?? 0
        switch delta {
        case 0: return "aujourd'hui"
        case 1: return "demain"
        case -1: return "hier"
        default:
            let f = DateFormatter(); f.locale = Locale(identifier: "fr_FR"); f.timeZone = cal.timeZone; f.dateFormat = "d MMM"
            return f.string(from: d)
        }
    }

    /// « depuis aujourd'hui », « depuis hier », « depuis le 4 sept. »
    static func depuis(_ jour: String) -> String {
        let l = libelle(jour)
        return ["aujourd'hui", "hier", "demain"].contains(l) ? "depuis \(l)" : "depuis le \(l)"
    }

    /// « lundi 7 septembre »
    static func long(_ jour: String) -> String {
        guard let d = date(jour) else { return jour }
        let f = DateFormatter(); f.locale = Locale(identifier: "fr_FR"); f.timeZone = cal.timeZone; f.dateFormat = "EEEE d MMMM"
        return f.string(from: d)
    }

    /// « hier 18:42 », « 14:05 » aujourd'hui, « 3 sept. 09:12 » sinon — pour une Capture sans transcription.
    static func moment(_ iso8601: String) -> String {
        let avecFractions = ISO8601DateFormatter(); avecFractions.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let d = avecFractions.date(from: iso8601) ?? ISO8601DateFormatter().date(from: iso8601) else { return "" }
        let heure = DateFormatter(); heure.locale = Locale(identifier: "fr_FR"); heure.timeZone = cal.timeZone; heure.dateFormat = "HH:mm"
        let j = libelle(jour(d))
        return j == "aujourd'hui" ? heure.string(from: d) : "\(j) \(heure.string(from: d))"
    }
}
