import SwiftUI

/// Les tokens des maquettes, en sombre. Le clair viendra avec le réglage d'apparence.
enum Teinte {
    static let fondPage = Color(hex: 0x060606)
    static let fond = Color(hex: 0x0B0B0B)
    static let surface = Color(hex: 0x161616)
    static let bord = Color(hex: 0x2A2A2A)
    static let bordFort = Color(hex: 0x333333)
    static let texte = Color(hex: 0xEDEDED)
    static let texteSourd = Color(hex: 0xB8B8B8)
    static let texteFaible = Color(hex: 0x8A8A8A)
    static let texteTresFaible = Color(hex: 0x4A4A4A)
    static let accent = Color(hex: 0xF27313)
    static let surAccent = Color(hex: 0x0B0B0B)
    static let bloque = Color(red: 0.93, green: 0.42, blue: 0.38)
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}
