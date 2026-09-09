import SwiftUI

/**
 Aujourd'hui — ce que je dois faire, et sur quoi je suis (BRU-18, BRU-28). Mes Tâches Sur le feu
 dont l'Engagement est arrivé, groupées En cours → À faire → Bloqué ; puis celles où j'aide. Le
 bandeau Affectation est épinglé en tête, et c'est là que ça se change.
 */
struct AujourdhuiVue: View {
    @State private var modele = AujourdhuiModele()
    @State private var choisir = false
    @State private var erreurAction: String?

    var body: some View {
        ZStack {
            Teinte.fond.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 0) {
                enTete
                bandeau.padding(.horizontal, 20).padding(.top, 14)
                ScrollView {
                    VStack(spacing: 10) {
                        if let erreur = modele.erreur ?? erreurAction {
                            Text(erreur).font(.system(size: 13)).foregroundStyle(Teinte.texteSourd).frame(maxWidth: .infinity, alignment: .leading)
                        }
                        section("En cours", couleur: Teinte.enCours, taches: modele.miennes(.enCours))
                        section("À faire", couleur: Teinte.aFaire, taches: modele.miennes(.aFaire))
                        section("Bloqué", couleur: Teinte.bloque, taches: modele.miennes(.bloque))
                        if !modele.aideSur.isEmpty { aide }
                        if modele.chargeUneFois && [Statut.enCours, .aFaire, .bloque].allSatisfy({ modele.miennes($0).isEmpty }) {
                            Text("Rien d’engagé pour aujourd’hui.").font(.system(size: 15)).foregroundStyle(Teinte.texteFaible).frame(maxWidth: .infinity, alignment: .leading).padding(.top, 8)
                        }
                        Color.clear.frame(height: 90)
                    }
                    .padding(.horizontal, 20).padding(.top, 14)
                }
                .refreshable { await modele.charger() }
            }
        }
        .task { await modele.charger() }
        .sheet(isPresented: $choisir) {
            AffectationFeuille(choix: modele.choix, dessus: Set(modele.mesAffectations.map(\.affectationId))) { ids in try await modele.poser(affectationIds: ids) }
        }
    }

    private var enTete: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text(Jours.long(Jours.aujourdhui())).font(.system(size: 13.5)).foregroundStyle(Teinte.texteSourd)
                Text("Aujourd'hui").font(.system(size: 28, weight: .semibold)).foregroundStyle(Teinte.texte)
            }
            Spacer()
            if let moi = modele.moi { Initiale(nom: moi.nom, taille: 34) }
        }
        .padding(.horizontal, 20).padding(.top, 4)
    }

    /// Le bandeau : une ligne par Affectation, « Je ne suis plus dessus » à côté ; vide, il propose de choisir.
    private var bandeau: some View {
        VStack(spacing: 10) {
            if modele.mesAffectations.isEmpty {
                HStack(spacing: 14) {
                    RoundedRectangle(cornerRadius: 1).stroke(Color(hex: 0x4A4A4A), style: StrokeStyle(lineWidth: 1, dash: [3, 2])).frame(width: 4, height: 36)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Affectation").font(.system(size: 13)).foregroundStyle(Teinte.texteSourd)
                        Text("Aucune Affectation").font(.system(size: 18, weight: .medium)).foregroundStyle(Teinte.texteSourd)
                    }
                    Spacer()
                    Button("Choisir") { choisir = true }.font(.system(size: 14)).foregroundStyle(Teinte.accent)
                        .padding(.horizontal, 12).frame(height: 36).overlay(RoundedRectangle(cornerRadius: 8).stroke(Teinte.accent.opacity(0.5)))
                }
            } else {
                ForEach(modele.mesAffectations) { sur in
                    HStack(spacing: 14) {
                        RoundedRectangle(cornerRadius: 1).fill(Color(hexChaine: sur.couleur)).frame(width: 4, height: 36)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Affectation · \(Jours.depuis(sur.depuis))").font(.system(size: 13)).foregroundStyle(Teinte.texteSourd)
                            Text(sur.nom).font(.system(size: 20, weight: .medium)).foregroundStyle(Teinte.texte)
                        }
                        Spacer()
                        Button("Je ne suis plus dessus") { agir { try await modele.quitter(sur) } }
                            .font(.system(size: 13)).foregroundStyle(Teinte.texteSourd)
                            .padding(.horizontal, 10).frame(height: 36).overlay(RoundedRectangle(cornerRadius: 8).stroke(Teinte.bordFort))
                    }
                }
                Button { choisir = true } label: {
                    Text("+ Ajouter une Affectation").font(.system(size: 14)).foregroundStyle(Teinte.accent).frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Teinte.bord))
    }

    private func agir(_ fn: @escaping () async throws -> Void) {
        erreurAction = nil
        Task { do { try await fn() } catch { erreurAction = error.localizedDescription } }
    }

    @ViewBuilder
    private func section(_ titre: String, couleur: Color, taches: [Tache]) -> some View {
        if !taches.isEmpty {
            VStack(spacing: 8) {
                HStack(spacing: 9) {
                    Circle().fill(couleur).frame(width: 7, height: 7)
                    Text(titre).font(.system(size: 16, weight: .medium)).foregroundStyle(Teinte.texte)
                    Spacer()
                    Text("\(taches.count)").font(.system(size: 13.5)).foregroundStyle(Teinte.texteSourd)
                }
                .padding(.bottom, 8)
                .overlay(alignment: .bottom) { Rectangle().fill(couleur).frame(height: 1) }
                ForEach(taches) { t in
                    LigneTache(tache: t, couleur: couleur) { agir { try await modele.terminer(t) } }
                }
            }
        }
    }

    private var aide: some View {
        VStack(spacing: 8) {
            HStack {
                Text("J'aide sur").font(.system(size: 16, weight: .medium)).foregroundStyle(Teinte.texte)
                Spacer()
                Text("\(modele.aideSur.count)").font(.system(size: 13.5)).foregroundStyle(Teinte.texteSourd)
            }
            .padding(.bottom, 8)
            .overlay(alignment: .bottom) { Rectangle().fill(Color(hex: 0x2E2E2E)).frame(height: 1) }
            ForEach(modele.aideSur) { t in
                HStack(spacing: 12) {
                    Text(t.titre).font(.system(size: 16)).foregroundStyle(Color(hex: 0xD8D8D8))
                    Spacer(minLength: 0)
                    if let a = modele.membre(t.assigneId) { Initiale(nom: a.nom) }
                }
                .padding(.horizontal, 14).padding(.vertical, 11)
                .background(Color(hex: 0x121212), in: RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: 0x262626)))
            }
        }
    }
}

/// Une Tâche du jour : le cercle à cocher (en pointillés quand c'est Bloqué), le titre, la ligne du dessous.
struct LigneTache: View {
    let tache: Tache
    let couleur: Color
    let onTerminer: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onTerminer) {
                Circle().stroke(Color(hex: 0x4A4A4A), style: StrokeStyle(lineWidth: 1.5, dash: tache.statut == .bloque ? [3, 2] : []))
                    .frame(width: 22, height: 22)
            }
            .accessibilityLabel("Terminé")
            VStack(alignment: .leading, spacing: 3) {
                Text(tache.titre).font(.system(size: 16)).foregroundStyle(tache.statut == .bloque ? Color(hex: 0xD8D8D8) : Teinte.texte)
                sousTitre
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14).padding(.vertical, 11)
        .background(couleur.opacity(0.09), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(couleur.opacity(0.35)))
    }

    private var sousTitre: some View {
        HStack(spacing: 0) {
            if tache.statut == .bloque, let raison = tache.raisonBlocage {
                Text(raison).foregroundStyle(Teinte.bloque); Text(" · ").foregroundStyle(Teinte.texteSourd)
            }
            Text(tache.engagement.map(Jours.libelle) ?? "—").foregroundStyle(Teinte.texteSourd)
            if tache.reportsCount > 0 {
                Text(" · ").foregroundStyle(Teinte.texteSourd); Text("reporté \(tache.reportsCount)×").foregroundStyle(Teinte.accent)
            }
        }
        .font(.system(size: 13))
    }
}
