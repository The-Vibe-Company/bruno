import AVFoundation
import Foundation
import Observation
import Speech

/// Le micro et le reconnaisseur, hors de l'acteur principal : leurs rappels arrivent sur des files audio.
/// On ne l'appelle que depuis `Transcripteur`, sur le fil principal — d'où le `@unchecked`.
private final class Micro: @unchecked Sendable {
    private let moteur = AVAudioEngine()
    private var requete: SFSpeechAudioBufferRecognitionRequest?
    private var tache: SFSpeechRecognitionTask?
    private var fichier: AVAudioFile?

    struct PasDEntree: Error {}

    /// Démarre le micro, écrit l'audio dans `url` au fil de l'eau, et remonte la transcription partielle.
    func demarrer(reconnaisseur: SFSpeechRecognizer, vers url: URL, surTexte: @escaping @Sendable (String) -> Void) throws {
        let requete = SFSpeechAudioBufferRecognitionRequest()
        requete.shouldReportPartialResults = true
        if reconnaisseur.supportsOnDeviceRecognition { requete.requiresOnDeviceRecognition = true }
        let entree = moteur.inputNode
        let format = entree.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else { throw PasDEntree() }
        let fichier = try? AVAudioFile(forWriting: url, settings: format.settings)
        entree.installTap(onBus: 0, bufferSize: 1024, format: format) { tampon, _ in
            requete.append(tampon)
            try? fichier?.write(from: tampon)
        }
        moteur.prepare()
        do { try moteur.start() } catch { entree.removeTap(onBus: 0); throw error }
        self.requete = requete
        self.fichier = fichier
        tache = reconnaisseur.recognitionTask(with: requete) { resultat, _ in
            if let texte = resultat?.bestTranscription.formattedString { surTexte(texte) }
        }
    }

    func arreter() {
        moteur.stop()
        moteur.inputNode.removeTap(onBus: 0)
        requete?.endAudio()
        tache?.finish()
        requete = nil; tache = nil; fichier = nil
    }
}

/**
 La transcription, en direct. Sur l'appareil quand l'iPhone sait le faire — c'est ce qui marche
 hors ligne — sinon par le réseau (BRU-8). L'audio est écrit sur le disque au fil de l'eau : il
 existe avant tout appel réseau (BRU-7). Si le micro ou la transcription manquent, on le dit et
 on renvoie au champ texte : jamais un écran d'erreur bloquant.
 */
@MainActor
@Observable
final class Transcripteur {
    private(set) var texte = ""
    private(set) var enCours = false
    private(set) var duree: TimeInterval = 0
    private(set) var erreur: String?
    private(set) var fichierAudio: URL?

    private let micro = Micro()
    private var chrono: Timer?

    func demarrer(dans dossier: URL) async {
        erreur = nil
        guard await AVAudioApplication.requestRecordPermission() else { erreur = "Le micro est refusé — autorise-le dans Réglages, ou écris-la."; return }
        let autorisation = await withCheckedContinuation { (suite: CheckedContinuation<SFSpeechRecognizerAuthorizationStatus, Never>) in
            SFSpeechRecognizer.requestAuthorization { @Sendable statut in suite.resume(returning: statut) }
        }
        guard autorisation == .authorized else { erreur = "La transcription est refusée — autorise-la dans Réglages, ou écris-la."; return }
        guard let reconnaisseur = SFSpeechRecognizer(locale: Locale(identifier: "fr-FR")), reconnaisseur.isAvailable else {
            erreur = "Pas de transcription ici — écris-la."
            return
        }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            erreur = "Le micro ne répond pas — écris-la."
            return
        }
        let url = dossier.appending(path: "capture-\(UUID().uuidString).caf")
        do {
            try micro.demarrer(reconnaisseur: reconnaisseur, vers: url) { [weak self] texte in
                Task { @MainActor in
                    if let self, self.enCours { self.texte = texte }
                }
            }
        } catch {
            erreur = "Le micro ne démarre pas — écris-la."
            return
        }
        fichierAudio = url
        texte = ""
        duree = 0
        enCours = true
        chrono = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { @Sendable [weak self] _ in
            Task { @MainActor in self?.duree += 1 }
        }
    }

    func arreter() {
        chrono?.invalidate(); chrono = nil
        micro.arreter()
        enCours = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    func oublier() {
        if enCours { arreter() }
        if let fichierAudio { try? FileManager.default.removeItem(at: fichierAudio) }
        texte = ""; duree = 0; fichierAudio = nil; erreur = nil
    }
}
