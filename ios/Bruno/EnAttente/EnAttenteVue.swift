import SwiftUI

/**
 En attente — le tri sur mobile (BRU-12). À trier déplié, avec ses trois destinations et une croix ;
 À venir et Idées repliés. Le tri, oui ; réordonner au doigt, non : le Rang se règle sur le web.
 */
struct EnAttenteVue: View {
    @State private var modele = EnAttenteModele()
    @State private var ouverts: Set<Bucket> = [.aTrier]
    @State private var selection: String?
    @State private var droitEntree: Tache?
    @State private var pourQuand: Tache?
    @State private var aSupprimer: Tache?
    @State private var erreurAction: String?
    private let file = FileAttente.partagee

    var body: some View {
        ZStack {
            Teinte.fond.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 0) {
                enTete
                ScrollView {
                    VStack(spacing: 8) {
                        if let erreur = modele.erreur ?? erreurAction {
                            Text(erreur).font(.system(size: 13)).foregroundStyle(Teinte.texteSourd).frame(maxWidth: .infinity, alignment: .leading)
                        }
                        section(.aTrier, compteur: modele.taches(.aTrier).count + file.enAttente, accent: true) {
                            ForEach(file.captures) { c in CarteEnRoute(capture: c) }
                            ForEach(modele.taches(.aTrier)) { t in
                                CarteATrier(tache: t, auteur: modele.membre(t.creeParId), ouverte: selection == t.id,
                                            onSurLeFeu: { droitEntree = t }, onAVenir: { pourQuand = t },
                                            onIdees: { agir { try await modele.passerEnIdees(t) } }, onSupprimer: { aSupprimer = t })
                                    .onTapGesture { withAnimation(.easeOut(duration: 0.15)) { selection = selection == t.id ? nil : t.id } }
                            }
                            if modele.taches(.aTrier).isEmpty && file.enAttente == 0 && modele.chargeUneFois {
                                Text("Rien à trier.").font(.system(size: 15)).foregroundStyle(Teinte.texteFaible).frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 8)
                            }
                        }
                        Color.clear.frame(height: 10)
                        section(.aVenir, compteur: modele.taches(.aVenir).count, accent: false) {
                            ForEach(modele.taches(.aVenir)) { t in Ligne(tache: t, assigne: modele.membre(t.assigneId)) }
                        }
                        section(.idees, compteur: modele.taches(.idees).count, accent: false) {
                            ForEach(modele.taches(.idees)) { t in Ligne(tache: t, assigne: modele.membre(t.assigneId)) }
                        }
                        Color.clear.frame(height: 90)
                    }
                    .padding(.horizontal, 20).padding(.top, 16)
                }
                .refreshable { await modele.charger() }
            }
        }
        .task { await modele.charger() }
        .onChange(of: file.enAttente) { _, _ in Task { await modele.charger() } }
        .sheet(item: $droitEntree) { t in
            DroitEntreeFeuille(tache: t, membres: modele.membres, moiId: modele.moi?.id) { assigneId, engagement in
                try await modele.passerSurLeFeu(t, assigneId: assigneId, engagement: engagement)
            }
        }
        .sheet(item: $pourQuand) { t in
            PourQuandFeuille(tache: t) { engagement in try await modele.passerAVenir(t, engagement: engagement) }
        }
        .alert("Supprimer cette Tâche ?", isPresented: Binding(get: { aSupprimer != nil }, set: { if !$0 { aSupprimer = nil } })) {
            Button("Supprimer", role: .destructive) { if let t = aSupprimer { agir { try await modele.supprimer(t) } } }
            Button("Annuler", role: .cancel) {}
        } message: {
            Text("Elle disparaît pour de bon, sans trace. Pour une Capture ratée ou un doublon, c'est le bon geste.")
        }
    }

    private var enTete: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(modele.taches(.aTrier).count + file.enAttente) à trier").font(.system(size: 13.5)).foregroundStyle(Teinte.texteSourd)
            Text("En attente").font(.system(size: 30, weight: .semibold)).foregroundStyle(Teinte.texte)
        }
        .padding(.horizontal, 20).padding(.top, 8)
    }

    private func agir(_ fn: @escaping () async throws -> Void) {
        erreurAction = nil
        Task { do { try await fn() } catch { erreurAction = error.localizedDescription } }
    }

    private func section<Contenu: View>(_ bucket: Bucket, compteur: Int, accent: Bool, @ViewBuilder contenu: () -> Contenu) -> some View {
        VStack(spacing: 8) {
            Button { withAnimation(.easeOut(duration: 0.15)) { if ouverts.contains(bucket) { ouverts.remove(bucket) } else { ouverts.insert(bucket) } } } label: {
                HStack(spacing: 10) {
                    Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(Teinte.texteSourd)
                        .rotationEffect(.degrees(ouverts.contains(bucket) ? 90 : 0))
                    Text(bucket.libelle).font(.system(size: 17, weight: .medium)).foregroundStyle(Teinte.texte)
                    Spacer()
                    Text("\(compteur)").font(.system(size: 14)).foregroundStyle(accent && compteur > 0 ? Teinte.accent : Teinte.texteSourd)
                }
                .frame(height: 48)
                .overlay(alignment: .bottom) { Rectangle().fill(Color(hex: 0x2E2E2E)).frame(height: 1) }
            }
            .buttonStyle(.plain)
            if ouverts.contains(bucket) { contenu() }
        }
    }
}

/// Une carte à trier : le titre nettoyé, l'auteur, la transcription brute en italique — et, ouverte, ses trois destinations.
private struct CarteATrier: View {
    let tache: Tache
    let auteur: Membre?
    let ouverte: Bool
    let onSurLeFeu: () -> Void
    let onAVenir: () -> Void
    let onIdees: () -> Void
    let onSupprimer: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 10) {
                Text(tache.titre).font(.system(size: 16)).foregroundStyle(Teinte.texte).lineSpacing(2)
                Spacer(minLength: 0)
                if let auteur { Initiale(nom: auteur.nom) }
            }
            if let brute = tache.transcriptionBrute, !brute.isEmpty {
                Text("« \(brute) »").font(.system(size: 13)).italic().foregroundStyle(Teinte.texteSourd)
            } else {
                Text(Jours.moment(tache.createdAt)).font(.system(size: 13)).italic().foregroundStyle(Teinte.texteSourd)
            }
            if ouverte {
                HStack(spacing: 6) {
                    Destination(titre: "Sur le feu", primaire: true, action: onSurLeFeu)
                    Destination(titre: "À venir", primaire: false, action: onAVenir)
                    Destination(titre: "Idées", primaire: false, action: onIdees)
                    Spacer()
                    Button(action: onSupprimer) {
                        Image(systemName: "xmark").font(.system(size: 12, weight: .medium)).foregroundStyle(Teinte.texteSourd)
                            .frame(width: 34, height: 34)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(hex: 0x3A3A3A)))
                    }
                    .accessibilityLabel("Supprimer")
                }
                .padding(.top, 8)
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 13)
        .background(ouverte ? Color(hex: 0x1E1E1E) : Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(ouverte ? Teinte.bordFort : Teinte.bord))
        .contentShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct Destination: View {
    let titre: String
    let primaire: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(titre).font(.system(size: 13.5, weight: primaire ? .medium : .regular))
                .foregroundStyle(primaire ? Teinte.surAccent : Teinte.texte)
                .padding(.horizontal, 12).frame(height: 34)
                .background(primaire ? Teinte.accent : .clear, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(primaire ? .clear : Color(hex: 0x3A3A3A)))
        }
    }
}

/// Une Capture encore sur le disque, pas encore chez le serveur : elle compte déjà, on le dit.
private struct CarteEnRoute: View {
    let capture: Capture
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(capture.titre).font(.system(size: 16)).foregroundStyle(Teinte.texte)
            HStack(spacing: 6) {
                Circle().fill(Teinte.accent).frame(width: 6, height: 6)
                Text("en attente d'envoi").font(.system(size: 13)).italic().foregroundStyle(Teinte.texteSourd)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14).padding(.vertical, 13)
        .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bord, style: StrokeStyle(lineWidth: 1, dash: [4, 3])))
    }
}

/// Une ligne d'À venir ou d'Idées : le titre, l'Engagement s'il y en a un, l'Assigné.
private struct Ligne: View {
    let tache: Tache
    let assigne: Membre?
    var body: some View {
        HStack(spacing: 10) {
            Text(tache.titre).font(.system(size: 15)).foregroundStyle(Teinte.texte)
            Spacer(minLength: 0)
            if let e = tache.engagement { Text(Jours.libelle(e)).font(.system(size: 13)).foregroundStyle(Teinte.texteSourd) }
            if let assigne { Initiale(nom: assigne.nom, taille: 20) }
        }
        .padding(.horizontal, 14).padding(.vertical, 11)
        .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bord))
    }
}
