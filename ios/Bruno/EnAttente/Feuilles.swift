import SwiftUI

/// La pastille d'une personne : sa photo si elle en a une, son initiale sinon — la même partout.
struct Initiale: View {
    let nom: String
    var avatar: String? = nil
    var taille: CGFloat = 22
    var body: some View {
        if let image = avatar.flatMap(Avatars.image) {
            Image(uiImage: image).resizable().scaledToFill().frame(width: taille, height: taille).clipShape(Circle())
        } else {
            Text(String(nom.trimmingCharacters(in: .whitespaces).prefix(1)).uppercased())
                .font(.system(size: taille * 0.55, weight: .medium))
                .foregroundStyle(Teinte.texte)
                .frame(width: taille, height: taille)
                .background(Color(hex: 0x2E2E2E), in: Circle())
        }
    }
}

/// Le style commun des feuilles du bas : la poignée, le fond, les coins.
private struct Feuille<Contenu: View>: View {
    @ViewBuilder let contenu: () -> Contenu
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Capsule().fill(Color(hex: 0x3A3A3A)).frame(width: 40, height: 4).frame(maxWidth: .infinity)
            contenu()
        }
        .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 8)
        .presentationDetents([.height(440)])
        .presentationDragIndicator(.hidden)
        .presentationBackground(Color(hex: 0x141414))
    }
}

private struct Champ<Contenu: View>: View {
    let libelle: String
    @ViewBuilder let contenu: () -> Contenu
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(libelle).font(.system(size: 14)).foregroundStyle(Teinte.texteSourd)
            HStack { contenu() }
                .font(.system(size: 16)).foregroundStyle(Teinte.texte)
                .padding(.horizontal, 14).frame(minHeight: 50)
                .background(Color(hex: 0x0F0F0F), in: RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bordFort))
        }
    }
}

private struct BoutonPrincipal: View {
    let titre: String
    var occupe = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(titre).font(.system(size: 16, weight: .medium)).foregroundStyle(Teinte.surAccent)
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(Teinte.accent, in: RoundedRectangle(cornerRadius: 12))
        }
        .disabled(occupe).opacity(occupe ? 0.6 : 1)
    }
}

/**
 Le droit d'entrée Sur le feu — invariant 2, le seul verrou dur de Bruno. Deux champs et deux
 seulement, pré-remplis « moi » et « aujourd'hui », validables en un tap.
 */
struct DroitEntreeFeuille: View {
    let tache: Tache
    let membres: [Membre]
    let moiId: String?
    let onConfirmer: (String, String) async throws -> Void
    @Environment(\.dismiss) private var fermer
    @State private var assigneId: String
    @State private var engagement: Date = .now
    @State private var occupe = false
    @State private var erreur: String?
    @State private var choixAssigne = false

    init(tache: Tache, membres: [Membre], moiId: String?, onConfirmer: @escaping (String, String) async throws -> Void) {
        self.tache = tache; self.membres = membres; self.moiId = moiId; self.onConfirmer = onConfirmer
        _assigneId = State(initialValue: moiId ?? membres.first?.id ?? "")
    }

    var body: some View {
        Feuille {
            VStack(alignment: .leading, spacing: 4) {
                Text("Passer Sur le feu").font(.system(size: 13.5)).foregroundStyle(Teinte.accent)
                Text(tache.titre).font(.system(size: 22, weight: .semibold)).foregroundStyle(Teinte.texte).lineLimit(2)
            }
            Champ(libelle: "Assigné") {
                Button { choixAssigne = true } label: {
                    HStack(spacing: 9) {
                        Initiale(nom: membres.first { $0.id == assigneId }?.nom ?? "?", avatar: membres.first { $0.id == assigneId }?.avatar, taille: 24)
                        Text(membres.first { $0.id == assigneId }?.nom ?? "—").foregroundStyle(Teinte.texte)
                        Spacer()
                        if assigneId == moiId { Text("moi").font(.system(size: 13.5)).foregroundStyle(Teinte.texteFaible) }
                        Image(systemName: "chevron.down").font(.system(size: 11, weight: .semibold)).foregroundStyle(Teinte.texteFaible)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            .sheet(isPresented: $choixAssigne) {
                ChoixFeuille(titre: "Assigner à", choix: membres.map { Choix(id: $0.id, libelle: $0.nom, initiale: $0.nom, avatar: $0.avatar) }, courant: assigneId) { assigneId = $0 }
            }
            Champ(libelle: "Engagement") {
                Text(Jours.long(Jours.jour(engagement)))
                Spacer()
                Text(Jours.libelle(Jours.jour(engagement))).font(.system(size: 13.5)).foregroundStyle(Teinte.texteFaible)
            }
            // Le sélecteur natif, invisible mais sous le doigt : tout le champ ouvre le calendrier.
            .overlay { DatePicker("Engagement", selection: $engagement, in: Date.now..., displayedComponents: .date).labelsHidden().blendMode(.destinationOver) }
            if let erreur { Text(erreur).font(.system(size: 13.5)).foregroundStyle(Teinte.bloque) }
            VStack(spacing: 8) {
                BoutonPrincipal(titre: "Passer Sur le feu", occupe: occupe) {
                    occupe = true
                    Task {
                        do { try await onConfirmer(assigneId, Jours.jour(engagement)); fermer() } catch { erreur = error.localizedDescription }
                        occupe = false
                    }
                }
                Button("Annuler") { fermer() }.font(.system(size: 16)).foregroundStyle(Teinte.texteSourd).frame(maxWidth: .infinity, minHeight: 44)
            }
        }
    }
}

/// « Pour quand ? » — À venir se planifie librement : une date, ou pas encore.
struct PourQuandFeuille: View {
    let tache: Tache
    let onConfirmer: (String?) async throws -> Void
    @Environment(\.dismiss) private var fermer
    @State private var avecDate = false
    @State private var date: Date = Calendar.current.date(byAdding: .day, value: 7, to: .now) ?? .now
    @State private var occupe = false
    @State private var erreur: String?

    var body: some View {
        Feuille {
            VStack(alignment: .leading, spacing: 4) {
                Text("Passer À venir").font(.system(size: 13.5)).foregroundStyle(Teinte.accent)
                Text(tache.titre).font(.system(size: 22, weight: .semibold)).foregroundStyle(Teinte.texte).lineLimit(2)
            }
            Champ(libelle: "Pour quand ?") {
                Toggle(isOn: $avecDate) { Text(avecDate ? Jours.long(Jours.jour(date)) : "Pas encore de date") }.tint(Teinte.accent)
            }
            if avecDate {
                DatePicker("Date", selection: $date, in: Date.now..., displayedComponents: .date).datePickerStyle(.compact).labelsHidden().tint(Teinte.accent)
            }
            if let erreur { Text(erreur).font(.system(size: 13.5)).foregroundStyle(Teinte.bloque) }
            VStack(spacing: 8) {
                BoutonPrincipal(titre: "Passer À venir", occupe: occupe) {
                    occupe = true
                    Task {
                        do { try await onConfirmer(avecDate ? Jours.jour(date) : nil); fermer() } catch { erreur = error.localizedDescription }
                        occupe = false
                    }
                }
                Button("Annuler") { fermer() }.font(.system(size: 16)).foregroundStyle(Teinte.texteSourd).frame(maxWidth: .infinity, minHeight: 44)
            }
        }
    }
}
