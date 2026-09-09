import SwiftUI

/// Les écrans et, en bas, la barre : Aujourd'hui, le micro au centre, En attente. La Capture
/// s'ouvre de partout, par le bouton central — c'est le geste que tout le reste sert (BRU-6).
struct Racine: View {
    @State private var onglet: Onglet = .aujourdhui
    @State private var capture = false

    enum Onglet { case aujourdhui, enAttente }

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                switch onglet {
                case .aujourdhui: Bientot(titre: "Aujourd'hui", sous: "Les Affectations du jour, les Engagements, la Relance.")
                case .enAttente: EnAttenteVue()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            barre
        }
        .fullScreenCover(isPresented: $capture) { CaptureVue() }
    }

    private var barre: some View {
        HStack(alignment: .top) {
            bouton(.aujourdhui, icone: "sun.max", libelle: "Aujourd'hui")
            Spacer()
            Button { capture = true } label: {
                ZStack {
                    Circle().fill(Teinte.accent).frame(width: 60, height: 60)
                        .shadow(color: Teinte.accent.opacity(0.35), radius: 12, y: 8)
                    Image(systemName: "mic.fill").font(.system(size: 22, weight: .medium)).foregroundStyle(Teinte.surAccent)
                }
            }
            .buttonStyle(.plain)
            .offset(y: -26)
            .accessibilityLabel("Capturer")
            Spacer()
            bouton(.enAttente, icone: "tray", libelle: "En attente")
        }
        .padding(.horizontal, 36).padding(.top, 10)
        .frame(maxWidth: .infinity)
        .background(Teinte.fond.opacity(0.96).ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) { Rectangle().fill(Teinte.bord).frame(height: 1) }
    }

    private func bouton(_ cible: Onglet, icone: String, libelle: String) -> some View {
        Button { onglet = cible } label: {
            VStack(spacing: 5) {
                Image(systemName: icone).font(.system(size: 20))
                Text(libelle).font(.system(size: 11, weight: onglet == cible ? .medium : .regular))
            }
            .foregroundStyle(onglet == cible ? Teinte.accent : Teinte.texteSourd)
            .frame(width: 84)
        }
        .buttonStyle(.plain)
    }
}

/// Un écran qui n'existe pas encore — il dit ce qu'il sera, rien d'autre.
struct Bientot: View {
    let titre: String
    var sous: String = "Bientôt."
    var body: some View {
        ZStack {
            Teinte.fond.ignoresSafeArea()
            VStack(spacing: 6) {
                Text(titre).font(.system(size: 28, weight: .semibold)).foregroundStyle(Teinte.texte)
                Text(sous).font(.system(size: 15)).foregroundStyle(Teinte.texteSourd).multilineTextAlignment(.center)
            }
            .padding(.horizontal, 32)
        }
    }
}
