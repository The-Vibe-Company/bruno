import SwiftUI

/// Pourquoi c'est Bloqué — quelques raisons toutes prêtes, ou ses mots. Les mêmes que sur le web.
struct BlocageFeuille: View {
    let tache: Tache
    let onConfirmer: (String) async throws -> Void
    @Environment(\.dismiss) private var fermer
    @State private var raison: String
    @State private var occupe = false
    @State private var erreur: String?

    static let raisons = ["En attente de réponse", "En attente de validation", "En attente d’un livrable", "Il manque une info", "Dépend d’une autre Tâche"]

    init(tache: Tache, onConfirmer: @escaping (String) async throws -> Void) {
        self.tache = tache; self.onConfirmer = onConfirmer
        _raison = State(initialValue: tache.raisonBlocage ?? "")
    }

    private var pret: Bool { !raison.trimmingCharacters(in: .whitespaces).isEmpty && !occupe }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Capsule().fill(Color(hex: 0x3A3A3A)).frame(width: 40, height: 4).frame(maxWidth: .infinity)
            VStack(alignment: .leading, spacing: 4) {
                Text("Pourquoi c’est bloqué ?").font(.system(size: 22, weight: .semibold)).foregroundStyle(Teinte.texte)
                Text(tache.titre).font(.system(size: 14)).foregroundStyle(Teinte.texteSourd).lineLimit(2)
            }
            FlowLayout(espace: 7) {
                ForEach(Self.raisons, id: \.self) { r in
                    let actif = raison.trimmingCharacters(in: .whitespaces) == r
                    Button { raison = actif ? "" : r } label: {
                        Text(r).font(.system(size: 14)).foregroundStyle(actif ? Teinte.texte : Color(hex: 0xD8D8D8))
                            .padding(.horizontal, 12).frame(height: 38)
                            .background(actif ? Teinte.bloque.opacity(0.14) : .clear, in: RoundedRectangle(cornerRadius: 10))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(actif ? Teinte.bloque : Teinte.bordFort))
                    }
                    .buttonStyle(.plain)
                }
            }
            TextField("ou dis-le avec tes mots", text: $raison).font(.system(size: 15.5)).foregroundStyle(Teinte.texte)
                .padding(.horizontal, 14).frame(minHeight: 48)
                .background(Color(hex: 0x0F0F0F), in: RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bordFort))
            if let erreur { Text(erreur).font(.system(size: 13.5)).foregroundStyle(Teinte.bloque) }
            VStack(spacing: 8) {
                Button {
                    occupe = true
                    Task { do { try await onConfirmer(raison.trimmingCharacters(in: .whitespaces)); fermer() } catch { erreur = error.localizedDescription }; occupe = false }
                } label: {
                    Text(tache.statut == .bloque ? "Enregistrer" : "Bloquer").font(.system(size: 16, weight: .medium)).foregroundStyle(Teinte.surAccent)
                        .frame(maxWidth: .infinity, minHeight: 52).background(Teinte.bloque, in: RoundedRectangle(cornerRadius: 12))
                }
                .disabled(!pret).opacity(pret ? 1 : 0.5)
                Button("Annuler") { fermer() }.font(.system(size: 16)).foregroundStyle(Teinte.texteSourd).frame(maxWidth: .infinity, minHeight: 44)
            }
        }
        .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 8)
        .presentationDetents([.height(470)])
        .presentationDragIndicator(.hidden)
        .presentationBackground(Color(hex: 0x141414))
    }
}

/// L'Engagement d'une Tâche qui n'est pas Sur le feu : une date, ou pas encore. (Sur le feu, c'est le Report.)
struct EngagementFeuille: View {
    let tache: Tache
    let onConfirmer: (String?) async throws -> Void
    @Environment(\.dismiss) private var fermer
    @State private var date: Date
    @State private var occupe = false
    @State private var erreur: String?

    init(tache: Tache, onConfirmer: @escaping (String?) async throws -> Void) {
        self.tache = tache; self.onConfirmer = onConfirmer
        _date = State(initialValue: tache.engagement.flatMap(Jours.date) ?? .now)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Capsule().fill(Color(hex: 0x3A3A3A)).frame(width: 40, height: 4).frame(maxWidth: .infinity)
            VStack(alignment: .leading, spacing: 4) {
                Text("Engagement").font(.system(size: 22, weight: .semibold)).foregroundStyle(Teinte.texte)
                Text(tache.titre).font(.system(size: 14)).foregroundStyle(Teinte.texteSourd).lineLimit(2)
            }
            DatePicker("Engagement", selection: $date, in: Date.now..., displayedComponents: .date)
                .datePickerStyle(.graphical).labelsHidden().tint(Teinte.accent)
                .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
            if let erreur { Text(erreur).font(.system(size: 13.5)).foregroundStyle(Teinte.bloque) }
            VStack(spacing: 8) {
                Button { valider(Jours.jour(date)) } label: {
                    Text("S’engager pour \(Jours.libelle(Jours.jour(date)))").font(.system(size: 16, weight: .medium)).foregroundStyle(Teinte.surAccent)
                        .frame(maxWidth: .infinity, minHeight: 52).background(Teinte.accent, in: RoundedRectangle(cornerRadius: 12))
                }
                .disabled(occupe)
                if tache.engagement != nil {
                    Button { valider(nil) } label: {
                        Text("Sans date").font(.system(size: 16)).foregroundStyle(Teinte.texte)
                            .frame(maxWidth: .infinity, minHeight: 48).overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bordFort))
                    }
                    .disabled(occupe)
                }
                Button("Annuler") { fermer() }.font(.system(size: 16)).foregroundStyle(Teinte.texteSourd).frame(maxWidth: .infinity, minHeight: 40)
            }
        }
        .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 8)
        .presentationDetents([.large])
        .presentationDragIndicator(.hidden)
        .presentationBackground(Color(hex: 0x141414))
    }

    private func valider(_ jour: String?) {
        occupe = true
        Task { do { try await onConfirmer(jour); fermer() } catch { erreur = error.localizedDescription }; occupe = false }
    }
}

/// Des pastilles qui passent à la ligne quand la place manque.
struct FlowLayout: Layout {
    var espace: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let largeur = proposal.width ?? 0
        var x: CGFloat = 0, y: CGFloat = 0, hauteurLigne: CGFloat = 0
        for v in subviews {
            let t = v.sizeThatFits(.unspecified)
            if x + t.width > largeur, x > 0 { x = 0; y += hauteurLigne + espace; hauteurLigne = 0 }
            x += t.width + espace; hauteurLigne = max(hauteurLigne, t.height)
        }
        return CGSize(width: largeur, height: y + hauteurLigne)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, hauteurLigne: CGFloat = 0
        for v in subviews {
            let t = v.sizeThatFits(.unspecified)
            if x + t.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += hauteurLigne + espace; hauteurLigne = 0 }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(t))
            x += t.width + espace; hauteurLigne = max(hauteurLigne, t.height)
        }
    }
}
