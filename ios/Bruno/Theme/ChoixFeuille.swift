import SwiftUI

/// Un choix : une pastille (initiale ou couleur), un libellé.
struct Choix: Identifiable, Hashable {
    let id: String
    let libelle: String
    var initiale: String? = nil
    var couleur: Color? = nil
}

/**
 Le sélecteur de Bruno, le même partout à la place des menus natifs : une feuille en bas, un
 titre, une pastille devant chaque choix, une coche sur le courant. Un tap choisit et referme.
 */
struct ChoixFeuille: View {
    let titre: String
    let choix: [Choix]
    let courant: String?
    let onChoisir: (String) -> Void
    @Environment(\.dismiss) private var fermer

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Capsule().fill(Color(hex: 0x3A3A3A)).frame(width: 40, height: 4).frame(maxWidth: .infinity)
            Text(titre).font(.system(size: 20, weight: .semibold)).foregroundStyle(Teinte.texte)
            VStack(spacing: 0) {
                ForEach(Array(choix.enumerated()), id: \.element.id) { i, c in
                    let actif = c.id == courant
                    Button { fermer(); if !actif { onChoisir(c.id) } } label: {
                        HStack(spacing: 12) {
                            if let initiale = c.initiale { Initiale(nom: initiale, taille: 24) }
                            else if let couleur = c.couleur { Circle().fill(couleur).frame(width: 9, height: 9).frame(width: 24) }
                            Text(c.libelle).font(.system(size: 16)).foregroundStyle(Teinte.texte)
                            Spacer()
                            if actif { Image(systemName: "checkmark").font(.system(size: 14, weight: .semibold)).foregroundStyle(Teinte.accent) }
                        }
                        .padding(.horizontal, 14).frame(minHeight: 52)
                        .contentShape(Rectangle())
                        .overlay(alignment: .bottom) { if i < choix.count - 1 { Rectangle().fill(Color(hex: 0x262626)).frame(height: 1) } }
                    }
                    .buttonStyle(.plain)
                }
            }
            .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bord))
            Button("Annuler") { fermer() }.font(.system(size: 16)).foregroundStyle(Teinte.texteSourd).frame(maxWidth: .infinity, minHeight: 44)
        }
        .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 8)
        .presentationDetents([.height(CGFloat(150 + 52 * max(choix.count, 1)))])
        .presentationDragIndicator(.hidden)
        .presentationBackground(Color(hex: 0x141414))
    }
}
