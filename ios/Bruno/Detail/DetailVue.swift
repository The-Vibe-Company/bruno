import SwiftUI

/**
 Le détail d'une Tâche (BRU-19) : ce qu'elle est, en lecture — et ses trois fins : Terminé en
 primaire, Reporter et Abandonner côte à côte, Supprimer à l'écart dans le menu ···.
 */
struct DetailVue: View {
    let tache: Tache
    let membres: [Membre]
    let retour: String
    /// Après un Terminé ou un Abandonné : l'écran d'en dessous propose d'annuler, six secondes.
    var onFin: ((Tache, String) -> Void)? = nil
    let onChange: () async -> Void
    @Environment(\.dismiss) private var fermer
    @State private var report = false
    @State private var supprimer = false
    @State private var occupe = false
    @State private var erreur: String?

    private func membre(_ id: String?) -> Membre? { membres.first { $0.id == id } }
    private var statut: String {
        switch tache.statut { case .enCours: "En cours"; case .bloque: "Bloqué"; default: tache.bucket == .surLeFeu ? "À faire" : tache.bucket.libelle }
    }

    var body: some View {
        ZStack {
            Teinte.fond.ignoresSafeArea()
            VStack(spacing: 0) {
                HStack {
                    Button { fermer() } label: {
                        HStack(spacing: 6) { Image(systemName: "chevron.left").font(.system(size: 15, weight: .semibold)); Text(retour) }
                            .font(.system(size: 16)).foregroundStyle(Teinte.accent)
                    }
                    Spacer()
                    Menu {
                        Button("Supprimer", role: .destructive) { supprimer = true }
                    } label: {
                        Text("···").font(.system(size: 22)).foregroundStyle(Teinte.texteSourd).frame(width: 44, height: 32, alignment: .trailing)
                    }
                }
                .padding(.horizontal, 20).padding(.top, 6)

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(tache.titre).font(.system(size: 24, weight: .semibold)).foregroundStyle(Teinte.texte)
                            HStack(spacing: 0) {
                                Text(statut).foregroundStyle(Teinte.texteSourd)
                                if tache.reportsCount > 0 { Text(" · ").foregroundStyle(Teinte.texteSourd); Text("reporté \(tache.reportsCount)×").foregroundStyle(Teinte.accent) }
                            }
                            .font(.system(size: 14))
                        }
                        VStack(spacing: 0) {
                            champ("Assigné") { if let a = membre(tache.assigneId) { Initiale(nom: a.nom); Text(a.nom) } else { Text("personne").foregroundStyle(Teinte.texteFaible) } }
                            champ("Aidants") {
                                let aidants = tache.aidantIds.compactMap { membre($0) }
                                if aidants.isEmpty { Text("—").foregroundStyle(Teinte.texteFaible) }
                                ForEach(aidants) { a in Initiale(nom: a.nom); Text(a.nom) }
                            }
                            champ("Engagement") { Text(tache.engagement.map(Jours.libelle) ?? "—") }
                            champ("Statut") {
                                Text(statut)
                                if tache.statut == .bloque, let r = tache.raisonBlocage { Text("· \(r)").foregroundStyle(Teinte.bloque) }
                            }
                            champ("Reports", dernier: true) { Text("\(tache.reportsCount)") }
                        }
                        .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bord))

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Notes").font(.system(size: 14)).foregroundStyle(Teinte.texteSourd)
                            VStack(alignment: .leading, spacing: 12) {
                                if let notes = tache.notes, !notes.isEmpty { Text(notes).font(.system(size: 15)).foregroundStyle(Teinte.texte).lineSpacing(3) }
                                else { Text("Aucune note.").font(.system(size: 15)).foregroundStyle(Teinte.texteFaible) }
                                if let brute = tache.transcriptionBrute, !brute.isEmpty {
                                    Rectangle().fill(Color(hex: 0x262626)).frame(height: 1)
                                    Text("« \(brute) »").font(.system(size: 14)).italic().foregroundStyle(Teinte.texteSourd).lineSpacing(3)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 14).padding(.vertical, 13)
                            .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bord))
                        }
                        if let erreur { Text(erreur).font(.system(size: 13.5)).foregroundStyle(Teinte.bloque) }
                    }
                    .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 8)
                }

                VStack(spacing: 8) {
                    Button { agir { try await Api.partagee.poster("api/taches/\(tache.id)/terminer"); onFin?(tache, "terminée") } } label: {
                        Text("Terminé").font(.system(size: 16, weight: .medium)).foregroundStyle(Teinte.surAccent)
                            .frame(maxWidth: .infinity, minHeight: 52).background(Teinte.accent, in: RoundedRectangle(cornerRadius: 12))
                    }
                    HStack(spacing: 8) {
                        Button { report = true } label: { secondaire("Reporter") }.disabled(tache.engagement == nil).opacity(tache.engagement == nil ? 0.5 : 1)
                        Button { agir { try await Api.partagee.poster("api/taches/\(tache.id)/abandonner"); onFin?(tache, "abandonnée") } } label: { secondaire("Abandonner") }
                    }
                }
                .disabled(occupe)
                .padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 12)
                .overlay(alignment: .top) { Rectangle().fill(Color(hex: 0x262626)).frame(height: 1) }
            }
        }
        .sheet(isPresented: $report) {
            ReportFeuille(tache: tache) { raison, jour in
                try await Api.partagee.poster("api/taches/\(tache.id)/reporter", Report(raison: raison, nouvelEngagement: jour))
                await onChange(); fermer()
            } onAbandonner: {
                try await Api.partagee.poster("api/taches/\(tache.id)/abandonner")
                onFin?(tache, "abandonnée")
                await onChange(); fermer()
            }
        }
        .alert("Supprimer cette Tâche ?", isPresented: $supprimer) {
            Button("Supprimer", role: .destructive) { agir { try await Api.partagee.supprimer("api/taches/\(tache.id)") } }
            Button("Annuler", role: .cancel) {}
        } message: {
            Text("Elle disparaît pour de bon, sans trace. Si vous avez décidé de ne pas la faire, préférez « Abandonner » : ça reste consultable.")
        }
    }

    private struct Report: Encodable, Sendable { let raison: String; let nouvelEngagement: String }

    private func agir(_ fn: @escaping () async throws -> Void) {
        occupe = true; erreur = nil
        Task {
            do { try await fn(); await onChange(); fermer() } catch { erreur = error.localizedDescription }
            occupe = false
        }
    }

    private func secondaire(_ titre: String) -> some View {
        Text(titre).font(.system(size: 16)).foregroundStyle(Teinte.texte)
            .frame(maxWidth: .infinity, minHeight: 48).overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bordFort))
    }

    private func champ<Contenu: View>(_ libelle: String, dernier: Bool = false, @ViewBuilder contenu: () -> Contenu) -> some View {
        HStack(spacing: 12) {
            Text(libelle).font(.system(size: 14)).foregroundStyle(Teinte.texteSourd).frame(width: 96, alignment: .leading)
            HStack(spacing: 8) { contenu() }.font(.system(size: 16)).foregroundStyle(Teinte.texte)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14).frame(minHeight: 50)
        .overlay(alignment: .bottom) { if !dernier { Rectangle().fill(Color(hex: 0x262626)).frame(height: 1) } }
    }
}
