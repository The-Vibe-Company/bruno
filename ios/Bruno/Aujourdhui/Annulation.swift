import SwiftUI

/// Le dernier Terminé / Abandonné, le temps de se raviser : six secondes, un bouton.
struct Fin: Equatable {
    let tache: Tache
    let libelle: String
}

struct Annulation: View {
    let fin: Fin
    let onAnnuler: () -> Void
    var body: some View {
        HStack(spacing: 12) {
            Text("« \(fin.tache.titre) » \(fin.libelle)").font(.system(size: 14)).foregroundStyle(Teinte.texte).lineLimit(1)
            Spacer(minLength: 0)
            Button("Annuler", action: onAnnuler).font(.system(size: 14, weight: .medium)).foregroundStyle(Teinte.accent)
        }
        .padding(.horizontal, 16).frame(height: 48)
        .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bordFort))
        .shadow(color: .black.opacity(0.4), radius: 16, y: 8)
        .padding(.horizontal, 20)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}

/// Garde une fin à l'écran six secondes, puis l'oublie — sauf si on l'a annulée entre-temps.
@MainActor
@Observable
final class Ravisement {
    private(set) var fin: Fin?
    func poser(_ f: Fin) {
        fin = f
        Task {
            try? await Task.sleep(for: .seconds(6))
            if fin == f { fin = nil }
        }
    }
    func oublier() { fin = nil }
}
