import SwiftUI

/**
 Le détail d'une Tâche (BRU-19) — et là où on la modifie (BRU-48) : le titre, l'Assigné, les
 Aidants, les Notes s'éditent sur place et s'enregistrent en quittant le champ. L'Engagement
 Sur le feu ne bouge que par un Report (invariant 4). Les trois fins : Terminé en primaire,
 Reporter et Abandonner côte à côte, Supprimer à l'écart dans le menu ···.
 */
struct DetailVue: View {
    let membres: [Membre]
    let retour: String
    var onFin: ((Tache, String) -> Void)? = nil
    let onChange: () async -> Void
    @Environment(\.dismiss) private var fermer
    @State private var tache: Tache
    @State private var titre: String
    @State private var notes: String
    @FocusState private var focus: Champ?
    @State private var report = false
    @State private var blocage = false
    @State private var engagementFeuille = false
    @State private var supprimer = false
    @State private var occupe = false
    @State private var erreur: String?

    enum Champ { case titre, notes }

    init(tache: Tache, membres: [Membre], retour: String, onFin: ((Tache, String) -> Void)? = nil, onChange: @escaping () async -> Void) {
        self.membres = membres; self.retour = retour; self.onFin = onFin; self.onChange = onChange
        _tache = State(initialValue: tache)
        _titre = State(initialValue: tache.titre)
        _notes = State(initialValue: tache.notes ?? "")
    }

    private func membre(_ id: String?) -> Membre? { membres.first { $0.id == id } }
    private var statut: String {
        switch tache.statut { case .enCours: "En cours"; case .bloque: "Bloqué"; default: tache.bucket == .surLeFeu ? "À faire" : tache.bucket.libelle }
    }

    var body: some View {
        ZStack {
            Teinte.fond.ignoresSafeArea()
            VStack(spacing: 0) {
                HStack {
                    Button { enregistrerTout(); fermer() } label: {
                        HStack(spacing: 6) { Image(systemName: "chevron.left").font(.system(size: 15, weight: .semibold)); Text(retour) }
                            .font(.system(size: 16)).foregroundStyle(Teinte.accent)
                    }
                    Spacer()
                    if focus != nil {
                        Button("OK") { focus = nil }.font(.system(size: 16, weight: .medium)).foregroundStyle(Teinte.accent)
                    } else {
                        Menu {
                            Button("Supprimer", role: .destructive) { supprimer = true }
                        } label: {
                            Text("···").font(.system(size: 22)).foregroundStyle(Teinte.texteSourd).frame(width: 44, height: 32, alignment: .trailing)
                        }
                    }
                }
                .padding(.horizontal, 20).padding(.top, 6)

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 6) {
                            TextField("Titre", text: $titre, axis: .vertical)
                                .font(.system(size: 24, weight: .semibold)).foregroundStyle(Teinte.texte).lineLimit(1...4)
                                .focused($focus, equals: .titre)
                                .submitLabel(.done)
                                .onSubmit { focus = nil }
                            HStack(spacing: 0) {
                                Text(statut).foregroundStyle(Teinte.texteSourd)
                                if tache.reportsCount > 0 { Text(" · ").foregroundStyle(Teinte.texteSourd); Text("reporté \(tache.reportsCount)×").foregroundStyle(Teinte.accent) }
                            }
                            .font(.system(size: 14))
                        }
                        VStack(spacing: 0) {
                            champ("Assigné") {
                                Menu {
                                    ForEach(membres) { m in
                                        Button { enregistrer(Patch(assigneId: m.id)) } label: {
                                            if m.id == tache.assigneId { Label(m.nom, systemImage: "checkmark") } else { Text(m.nom) }
                                        }
                                    }
                                } label: {
                                    HStack(spacing: 8) {
                                        if let a = membre(tache.assigneId) { Initiale(nom: a.nom); Text(a.nom) } else { Text("personne").foregroundStyle(Teinte.texteFaible) }
                                        Image(systemName: "chevron.up.chevron.down").font(.system(size: 11)).foregroundStyle(Teinte.texteFaible)
                                    }
                                    .foregroundStyle(Teinte.texte)
                                }
                            }
                            champ("Aidants") {
                                let candidats = membres.filter { $0.id != tache.assigneId }
                                if candidats.isEmpty { Text("—").foregroundStyle(Teinte.texteFaible) }
                                ForEach(candidats) { m in
                                    let aide = tache.aidantIds.contains(m.id)
                                    Button {
                                        enregistrer(Patch(aidantIds: aide ? tache.aidantIds.filter { $0 != m.id } : tache.aidantIds + [m.id]))
                                    } label: {
                                        HStack(spacing: 6) { Initiale(nom: m.nom, taille: 20); Text(m.nom).font(.system(size: 14)) }
                                            .foregroundStyle(aide ? Teinte.texte : Teinte.texteSourd)
                                            .padding(.leading, 3).padding(.trailing, 10).frame(height: 28)
                                            .background(aide ? Teinte.accent.opacity(0.14) : .clear, in: Capsule())
                                            .overlay(Capsule().stroke(aide ? Teinte.accent.opacity(0.5) : Teinte.bordFort))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            // Sur le feu, l'Engagement ne change que par un Report (invariant 4) : la ligne l'ouvre. Ailleurs, on choisit librement.
                            champ("Engagement") {
                                Button {
                                    if tache.bucket == .surLeFeu { report = true } else { engagementFeuille = true }
                                } label: {
                                    HStack(spacing: 8) {
                                        Text(tache.engagement.map(Jours.libelle) ?? "—")
                                        if tache.bucket == .surLeFeu, tache.engagement != nil { Text("· par un Report").font(.system(size: 13)).foregroundStyle(Teinte.texteFaible) }
                                        Image(systemName: "chevron.up.chevron.down").font(.system(size: 11)).foregroundStyle(Teinte.texteFaible)
                                    }
                                    .foregroundStyle(Teinte.texte)
                                }
                                .disabled(tache.bucket == .surLeFeu && tache.engagement == nil)
                            }
                            champ("Statut") {
                                if tache.bucket == .surLeFeu {
                                    Menu {
                                        Button { changerStatut(.aFaire) } label: { tache.statut == .aFaire ? Label("À faire", systemImage: "checkmark") : Label("À faire", systemImage: "") }
                                        Button { changerStatut(.enCours) } label: { tache.statut == .enCours ? Label("En cours", systemImage: "checkmark") : Label("En cours", systemImage: "") }
                                        Button { blocage = true } label: { tache.statut == .bloque ? Label("Bloqué — changer la raison", systemImage: "checkmark") : Label("Bloqué…", systemImage: "") }
                                    } label: {
                                        HStack(spacing: 8) {
                                            Text(statut)
                                            if tache.statut == .bloque, let r = tache.raisonBlocage { Text("· \(r)").foregroundStyle(Teinte.bloque).lineLimit(1) }
                                            Image(systemName: "chevron.up.chevron.down").font(.system(size: 11)).foregroundStyle(Teinte.texteFaible)
                                        }
                                        .foregroundStyle(Teinte.texte)
                                    }
                                } else {
                                    Text(statut)
                                }
                            }
                            champ("Reports", dernier: true) { Text("\(tache.reportsCount)") }
                        }
                        .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bord))

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Notes").font(.system(size: 14)).foregroundStyle(Teinte.texteSourd)
                            VStack(alignment: .leading, spacing: 12) {
                                ZStack(alignment: .topLeading) {
                                    if notes.isEmpty { Text("Une note, un contexte, un lien…").font(.system(size: 15)).foregroundStyle(Teinte.texteFaible).padding(.top, 8).padding(.leading, 5) }
                                    TextEditor(text: $notes)
                                        .font(.system(size: 15)).foregroundStyle(Teinte.texte)
                                        .scrollContentBackground(.hidden)
                                        .frame(minHeight: 72)
                                        .focused($focus, equals: .notes)
                                }
                                if let brute = tache.transcriptionBrute, !brute.isEmpty {
                                    Rectangle().fill(Color(hex: 0x262626)).frame(height: 1)
                                    Text("« \(brute) »").font(.system(size: 14)).italic().foregroundStyle(Teinte.texteSourd).lineSpacing(3)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 10).padding(.vertical, 8)
                            .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(focus == .notes ? Teinte.accent : Teinte.bord))
                        }
                        if let erreur { Text(erreur).font(.system(size: 13.5)).foregroundStyle(Teinte.bloque) }
                    }
                    .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 8)
                }
                .scrollDismissesKeyboard(.interactively)

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
        // Quitter un champ, c'est enregistrer ce qu'on y a changé.
        .onChange(of: focus) { avant, _ in
            if avant == .titre { enregistrerTitre() }
            if avant == .notes { enregistrerNotes() }
        }
        .onDisappear { enregistrerTout() }
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
        .sheet(isPresented: $blocage) {
            BlocageFeuille(tache: tache) { raison in
                // Déjà Bloqué : on ne change que la raison. Sinon, on bloque — avec elle.
                if tache.statut == .bloque {
                    tache = try await Api.partagee.modifier("api/taches/\(tache.id)", PatchRaison(raisonBlocage: raison))
                } else {
                    tache = try await Api.partagee.envoyer("api/taches/\(tache.id)/statut", ChangerStatut(statut: "bloque", raison: raison))
                }
                await onChange()
            }
        }
        .sheet(isPresented: $engagementFeuille) {
            EngagementFeuille(tache: tache) { jour in
                tache = try await Api.partagee.modifier("api/taches/\(tache.id)", Patch(engagement: .some(jour)))
                await onChange()
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
    private struct ChangerStatut: Encodable, Sendable { let statut: String; var raison: String? = nil }
    private struct PatchRaison: Encodable, Sendable { let raisonBlocage: String }

    /// À faire ou En cours, tout de suite ; Bloqué passe par sa raison.
    private func changerStatut(_ s: Statut) {
        erreur = nil
        Task {
            do { tache = try await Api.partagee.envoyer("api/taches/\(tache.id)/statut", ChangerStatut(statut: s.rawValue)); await onChange() }
            catch { erreur = error.localizedDescription }
        }
    }

    private func enregistrerTitre() {
        let t = titre.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { titre = tache.titre; return }
        if t != tache.titre { enregistrer(Patch(titre: t)) }
    }
    private func enregistrerNotes() {
        let n = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        if n != (tache.notes ?? "") { enregistrer(Patch(notes: .some(n.isEmpty ? nil : n))) }
    }
    private func enregistrerTout() { enregistrerTitre(); enregistrerNotes() }

    /// Une modification part tout de suite ; la Tâche revient telle que le serveur la voit.
    private func enregistrer(_ patch: Patch) {
        erreur = nil
        Task {
            do {
                tache = try await Api.partagee.modifier("api/taches/\(tache.id)", patch)
                await onChange()
            } catch { erreur = error.localizedDescription }
        }
    }

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
        HStack(alignment: .center, spacing: 12) {
            Text(libelle).font(.system(size: 14)).foregroundStyle(Teinte.texteSourd).frame(width: 96, alignment: .leading)
            HStack(spacing: 8) { contenu() }.font(.system(size: 16)).foregroundStyle(Teinte.texte)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14).padding(.vertical, 8).frame(minHeight: 50)
        .overlay(alignment: .bottom) { if !dernier { Rectangle().fill(Color(hex: 0x262626)).frame(height: 1) } }
    }
}
