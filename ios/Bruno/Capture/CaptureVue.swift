import SwiftUI

/**
 L'écran Capture — le pilier 1. Un gros micro au centre, la transcription en direct, un champ
 texte juste dessous qui n'est pas optionnel (réunions, transports, open space), et un bouton qui
 dit où ça va : « Envoyer dans À trier ». L'état du réseau se lit en haut ; il n'arrête rien.
 */
struct CaptureVue: View {
    /// Depuis le widget : on enregistre dès l'ouverture, sans un tap de plus.
    var demarrerToutDeSuite = false
    @Environment(\.dismiss) private var fermer
    @State private var transcripteur = Transcripteur()
    @State private var texte = ""
    @State private var envoye = false
    private let file = FileAttente.partagee

    private var pret: Bool { !texte.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !transcripteur.texte.isEmpty }

    var body: some View {
        ZStack {
            Teinte.fond.ignoresSafeArea()
            VStack(spacing: 0) {
                enTete
                Spacer(minLength: 0)
                centre
                Spacer(minLength: 0)
                bas
            }
        }
        .task { if demarrerToutDeSuite, !transcripteur.enCours { await transcripteur.demarrer(dans: file.dossier) } }
        .onDisappear { transcripteur.oublier() }
    }

    private var enTete: some View {
        HStack {
            Button("Annuler") { transcripteur.oublier(); fermer() }
                .font(.system(size: 16)).foregroundStyle(Teinte.texteSourd)
            Spacer()
            if !file.enLigne || file.enAttente > 0 {
                HStack(spacing: 7) {
                    Circle().fill(file.enLigne ? Teinte.texteFaible : Teinte.accent).frame(width: 7, height: 7)
                    Text(file.enLigne ? "\(file.enAttente) en attente d'envoi" : "hors ligne · \(file.enAttente) en attente d'envoi")
                }
                .font(.system(size: 13)).foregroundStyle(Teinte.texteSourd)
            }
        }
        .padding(.horizontal, 20).padding(.top, 6)
    }

    private var centre: some View {
        VStack(spacing: 30) {
            Button {
                if transcripteur.enCours { transcripteur.arreter() } else { Task { await transcripteur.demarrer(dans: file.dossier) } }
            } label: {
                ZStack {
                    Circle().fill(Teinte.accent.opacity(0.05)).frame(width: 260, height: 260)
                    Circle().fill(Teinte.accent.opacity(0.12)).frame(width: 216, height: 216)
                    Circle().fill(Teinte.accent).frame(width: 180, height: 180)
                    if transcripteur.enCours { Onde() } else {
                        Image(systemName: "mic.fill").font(.system(size: 64, weight: .medium)).foregroundStyle(Teinte.surAccent)
                    }
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel(transcripteur.enCours ? "Arrêter l'enregistrement" : "Enregistrer")

            Group {
                if let erreur = transcripteur.erreur {
                    Text(erreur).foregroundStyle(Teinte.texteSourd)
                } else if transcripteur.texte.isEmpty {
                    Text(transcripteur.enCours ? "J'écoute…" : "Appuie, et dis-la.").foregroundStyle(Teinte.texteFaible)
                } else {
                    Text("« \(transcripteur.texte) »").foregroundStyle(Teinte.texte)
                }
            }
            .font(.system(size: 22, weight: .light)).multilineTextAlignment(.center).lineSpacing(4)
            .padding(.horizontal, 28)
            .frame(minHeight: 60)

            Text(chrono).font(.system(size: 14).monospacedDigit()).foregroundStyle(Teinte.texteSourd)
                .opacity(transcripteur.enCours || transcripteur.duree > 0 ? 1 : 0)
        }
    }

    private var chrono: String {
        let s = Int(transcripteur.duree)
        return String(format: "%02d:%02d", s / 60, s % 60)
    }

    private var bas: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                TextField("…ou écris-la", text: $texte, axis: .vertical)
                    .font(.system(size: 16)).foregroundStyle(Teinte.texte).lineLimit(1...4)
                Image(systemName: "pencil").foregroundStyle(Teinte.texteFaible)
            }
            .padding(.horizontal, 14).padding(.vertical, 13)
            .background(Teinte.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bord))

            Button(action: envoyer) {
                Text(envoye ? "Envoyé" : "Envoyer dans À trier")
                    .font(.system(size: 16, weight: .medium)).foregroundStyle(Teinte.surAccent)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(Teinte.accent, in: RoundedRectangle(cornerRadius: 12))
            }
            .disabled(!pret)
            .opacity(pret ? 1 : 0.5)
        }
        .padding(.horizontal, 20).padding(.bottom, 12)
    }

    /// Le titre, c'est ce qu'on a écrit — sinon ce qu'on a dit. La transcription brute part toujours telle quelle.
    private func envoyer() {
        if transcripteur.enCours { transcripteur.arreter() }
        let ecrit = texte.trimmingCharacters(in: .whitespacesAndNewlines)
        let dit = transcripteur.texte
        let titre = ecrit.isEmpty ? dit : ecrit
        guard !titre.isEmpty else { return }
        file.ajouter(titre: titre, transcription: dit.isEmpty ? nil : dit, audio: transcripteur.fichierAudio)
        envoye = true
        Task {
            try? await Task.sleep(for: .milliseconds(500))
            fermer()
        }
    }
}

/// Les barres qui dansent pendant l'enregistrement — ce que montre la maquette.
private struct Onde: View {
    @State private var phase = false
    private let hauteurs: [CGFloat] = [22, 46, 66, 36, 56, 28]
    var body: some View {
        HStack(spacing: 6) {
            ForEach(hauteurs.indices, id: \.self) { i in
                RoundedRectangle(cornerRadius: 3)
                    .fill(Teinte.surAccent)
                    .frame(width: 6, height: phase ? hauteurs[(i + 3) % hauteurs.count] : hauteurs[i])
            }
        }
        .frame(height: 70)
        .onAppear { withAnimation(.easeInOut(duration: 0.45).repeatForever(autoreverses: true)) { phase = true } }
    }
}
