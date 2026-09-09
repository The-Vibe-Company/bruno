import SwiftUI

/// « Sur quoi es-tu ? » — une ou plusieurs Affectations actives, à partir d'aujourd'hui (BRU-28 / BRU-40).
struct AffectationFeuille: View {
    let choix: [Affectation]
    let dessus: Set<String>
    let onConfirmer: (Set<String>) async throws -> Void
    @Environment(\.dismiss) private var fermer
    @State private var coches: Set<String>
    @State private var occupe = false
    @State private var erreur: String?

    init(choix: [Affectation], dessus: Set<String>, onConfirmer: @escaping (Set<String>) async throws -> Void) {
        self.choix = choix; self.dessus = dessus; self.onConfirmer = onConfirmer
        _coches = State(initialValue: dessus)
    }

    private var libelle: String {
        let prises = coches.subtracting(dessus), quittees = dessus.subtracting(coches)
        return prises.isEmpty && !quittees.isEmpty ? "Je ne suis plus dessus" : "Commencer aujourd’hui"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Capsule().fill(Color(hex: 0x3A3A3A)).frame(width: 40, height: 4).frame(maxWidth: .infinity)
            VStack(alignment: .leading, spacing: 4) {
                Text("Sur quoi es-tu ?").font(.system(size: 22, weight: .semibold)).foregroundStyle(Teinte.texte)
                Text("Une ou plusieurs · à partir d’aujourd’hui").font(.system(size: 14)).foregroundStyle(Teinte.texteSourd)
            }
            VStack(spacing: 0) {
                ForEach(Array(choix.enumerated()), id: \.element.id) { i, a in
                    let coche = coches.contains(a.id)
                    Button { if coche { coches.remove(a.id) } else { coches.insert(a.id) } } label: {
                        HStack(spacing: 14) {
                            RoundedRectangle(cornerRadius: 1).fill(Color(hexChaine: a.couleur)).frame(width: 4, height: 20)
                            Text(a.nom).font(.system(size: 16)).foregroundStyle(Teinte.texte)
                            Spacer()
                            ZStack {
                                Circle().fill(coche ? Teinte.accent : .clear).frame(width: 24, height: 24)
                                Circle().stroke(Color(hex: 0x4A4A4A), lineWidth: 1.5).frame(width: 24, height: 24).opacity(coche ? 0 : 1)
                                if coche { Image(systemName: "checkmark").font(.system(size: 12, weight: .bold)).foregroundStyle(Teinte.surAccent) }
                            }
                        }
                        .padding(.horizontal, 14).frame(minHeight: 54)
                        .contentShape(Rectangle())
                        .overlay(alignment: .bottom) { if i < choix.count - 1 { Rectangle().fill(Color(hex: 0x262626)).frame(height: 1) } }
                    }
                    .buttonStyle(.plain)
                }
                if choix.isEmpty { Text("Aucune Affectation active — ajoutez-en une dans les Réglages du web.").font(.system(size: 14)).foregroundStyle(Teinte.texteSourd).padding(14) }
            }
            .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bord))
            if let erreur { Text(erreur).font(.system(size: 13.5)).foregroundStyle(Teinte.bloque) }
            VStack(spacing: 8) {
                Button {
                    occupe = true
                    Task { do { try await onConfirmer(coches); fermer() } catch { erreur = error.localizedDescription }; occupe = false }
                } label: {
                    Text(libelle).font(.system(size: 16, weight: .medium)).foregroundStyle(Teinte.surAccent)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .background(Teinte.accent, in: RoundedRectangle(cornerRadius: 12))
                }
                .disabled(occupe || coches == dessus).opacity(occupe || coches == dessus ? 0.5 : 1)
                Button("Annuler") { fermer() }.font(.system(size: 16)).foregroundStyle(Teinte.texteSourd).frame(maxWidth: .infinity, minHeight: 44)
            }
        }
        .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 8)
        .presentationDetents([.height(CGFloat(280 + 54 * max(choix.count, 1)))])
        .presentationDragIndicator(.hidden)
        .presentationBackground(Color(hex: 0x141414))
    }
}
