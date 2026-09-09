import SwiftUI

/**
 Reporter — le seul chemin qui déplace un Engagement Sur le feu, et il exige une raison (règle 8).
 « Demain » est pré-sélectionné (règle 9), et Abandonner est proposé juste en dessous (règle 10).
 */
struct ReportFeuille: View {
    let tache: Tache
    let onReporter: (String, String) async throws -> Void
    let onAbandonner: () async throws -> Void
    @Environment(\.dismiss) private var fermer
    @State private var raison = ""
    @State private var quand = Jours.demain()
    @State private var autreDate: Date = Calendar.current.date(byAdding: .day, value: 3, to: .now) ?? .now
    @State private var occupe = false
    @State private var erreur: String?

    private static let raisons = ["pas eu le temps", "bloqué par quelqu’un", "plus prioritaire"]
    private var pret: Bool { !raison.trimmingCharacters(in: .whitespaces).isEmpty && !occupe }
    private var estAutre: Bool { quand != Jours.demain() && quand != Jours.lundiProchain() }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Capsule().fill(Color(hex: 0x3A3A3A)).frame(width: 40, height: 4).frame(maxWidth: .infinity)
            VStack(alignment: .leading, spacing: 4) {
                Text("Reporter").font(.system(size: 22, weight: .semibold)).foregroundStyle(Teinte.texte)
                Text(tache.reportsCount > 0 ? "\(tache.titre) · déjà reporté \(tache.reportsCount)×" : tache.titre).font(.system(size: 14)).foregroundStyle(Teinte.texteSourd).lineLimit(2)
            }
            VStack(alignment: .leading, spacing: 10) {
                Text("Pourquoi ?").font(.system(size: 14)).foregroundStyle(Teinte.texteSourd)
                HStack(spacing: 7) {
                    ForEach(Self.raisons, id: \.self) { r in
                        let actif = raison.trimmingCharacters(in: .whitespaces) == r
                        Button { raison = actif ? "" : r } label: {
                            Text(r).font(.system(size: 14)).foregroundStyle(actif ? Teinte.texte : Color(hex: 0xD8D8D8))
                                .padding(.horizontal, 12).frame(minHeight: 42)
                                .background(actif ? Teinte.accent.opacity(0.14) : .clear, in: RoundedRectangle(cornerRadius: 10))
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(actif ? Teinte.accent : Teinte.bordFort))
                        }
                        .buttonStyle(.plain)
                    }
                }
                TextField("ou dis-le avec tes mots", text: $raison).font(.system(size: 15.5)).foregroundStyle(Teinte.texte)
                    .padding(.horizontal, 14).frame(minHeight: 48)
                    .background(Color(hex: 0x0F0F0F), in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bordFort))
            }
            VStack(alignment: .leading, spacing: 10) {
                Text("Nouvel Engagement").font(.system(size: 14)).foregroundStyle(Teinte.texteSourd)
                HStack(spacing: 7) {
                    choixDate("demain", sous: Jours.court(Jours.demain()), valeur: Jours.demain())
                    choixDate("lundi", sous: Jours.libelle(Jours.lundiProchain()), valeur: Jours.lundiProchain())
                    ZStack {
                        VStack(spacing: 2) {
                            Text("autre").font(.system(size: 15.5, weight: .medium)).foregroundStyle(Teinte.texte)
                            Text(estAutre ? Jours.libelle(quand) : "date").font(.system(size: 12.5)).foregroundStyle(Teinte.texteSourd)
                        }
                        .frame(maxWidth: .infinity, minHeight: 54)
                        .background(estAutre ? Teinte.accent.opacity(0.14) : .clear, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(estAutre ? Teinte.accent : Teinte.bordFort))
                        DatePicker("Autre date", selection: $autreDate, in: Date.now..., displayedComponents: .date).labelsHidden().blendMode(.destinationOver)
                            .onChange(of: autreDate) { _, d in quand = Jours.jour(d) }
                    }
                }
            }
            if let erreur { Text(erreur).font(.system(size: 13.5)).foregroundStyle(Teinte.bloque) }
            VStack(spacing: 8) {
                Button {
                    occupe = true
                    Task { do { try await onReporter(raison.trimmingCharacters(in: .whitespaces), quand); fermer() } catch { erreur = error.localizedDescription }; occupe = false }
                } label: {
                    Text(Jours.libelleReport(quand)).font(.system(size: 16, weight: .medium)).foregroundStyle(Teinte.surAccent)
                        .frame(maxWidth: .infinity, minHeight: 52).background(Teinte.accent, in: RoundedRectangle(cornerRadius: 12))
                }
                .disabled(!pret).opacity(pret ? 1 : 0.5)
                Button {
                    occupe = true
                    Task { do { try await onAbandonner(); fermer() } catch { erreur = error.localizedDescription }; occupe = false }
                } label: {
                    Text("Abandonner cette Tâche").font(.system(size: 16)).foregroundStyle(Teinte.texte)
                        .frame(maxWidth: .infinity, minHeight: 48).overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bordFort))
                }
                .disabled(occupe)
            }
        }
        .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 8)
        .presentationDetents([.height(560)])
        .presentationDragIndicator(.hidden)
        .presentationBackground(Color(hex: 0x141414))
    }

    private func choixDate(_ libelle: String, sous: String, valeur: String) -> some View {
        let actif = quand == valeur
        return Button { quand = valeur } label: {
            VStack(spacing: 2) {
                Text(libelle).font(.system(size: 15.5, weight: .medium)).foregroundStyle(Teinte.texte)
                Text(sous).font(.system(size: 12.5)).foregroundStyle(Teinte.texteSourd)
            }
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(actif ? Teinte.accent.opacity(0.14) : .clear, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(actif ? Teinte.accent : Teinte.bordFort))
        }
        .buttonStyle(.plain)
    }
}
