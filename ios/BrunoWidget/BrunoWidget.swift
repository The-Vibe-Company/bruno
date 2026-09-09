import SwiftUI
import WidgetKit

/**
 Le widget d'écran d'accueil — BRU-10, le meilleur levier du pilier 1. Un tap ouvre Bruno
 directement en enregistrement : le micro est déjà chaud quand l'écran apparaît. (Un widget ne
 peut pas enregistrer lui-même : iOS ne lui donne pas le micro. C'est l'app qui le fait, tout de
 suite.) Il montre aussi ce qui attend : les Engagements du jour, ce qu'il y a à trier.
 */
@main
struct BrunoWidgetBundle: WidgetBundle {
    var body: some Widget { CaptureWidget() }
}

struct Entree: TimelineEntry {
    let date: Date
    let resume: Partage.Resume?
}

struct Fournisseur: TimelineProvider {
    func placeholder(in context: Context) -> Entree { Entree(date: .now, resume: Partage.Resume(engagementsAujourdhui: 3, aTrier: 1, jour: "")) }
    func getSnapshot(in context: Context, completion: @escaping (Entree) -> Void) { completion(Entree(date: .now, resume: Partage.lire() ?? placeholder(in: context).resume)) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entree>) -> Void) {
        // L'app pousse les chiffres à chaque chargement ; on se rafraîchit quand même toutes les heures.
        completion(Timeline(entries: [Entree(date: .now, resume: Partage.lire())], policy: .after(Date.now.addingTimeInterval(3600))))
    }
}

struct CaptureWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "co.thevibecompany.bruno.capture", provider: Fournisseur()) { entree in
            CaptureWidgetVue(entree: entree)
                .containerBackground(Color(red: 0.086, green: 0.086, blue: 0.086), for: .widget)
                .widgetURL(Partage.lienCapture)
        }
        .configurationDisplayName("Capturer")
        .description("Une idée, tout de suite dans À trier.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular])
    }
}

private let accent = Color(red: 0.949, green: 0.451, blue: 0.075)
private let sourd = Color(red: 0.722, green: 0.722, blue: 0.722)
private let texte = Color(red: 0.929, green: 0.929, blue: 0.929)

struct CaptureWidgetVue: View {
    @Environment(\.widgetFamily) private var famille
    let entree: Entree

    var body: some View {
        switch famille {
        case .accessoryCircular:
            ZStack { AccessoryWidgetBackground(); Image(systemName: "mic.fill").font(.system(size: 22, weight: .medium)) }
        case .systemMedium:
            HStack(spacing: 16) {
                micro(76)
                VStack(alignment: .leading, spacing: 8) {
                    marque
                    Text("Capturer une idée").font(.system(size: 17, weight: .medium)).foregroundStyle(texte)
                    Text(sousTitre).font(.system(size: 13)).foregroundStyle(sourd)
                }
                Spacer(minLength: 0)
            }
        default:
            VStack(spacing: 0) {
                marque.frame(maxWidth: .infinity, alignment: .leading)
                Spacer()
                micro(64)
                Spacer()
                Text("Capturer").font(.system(size: 12.5)).foregroundStyle(texte)
            }
        }
    }

    private var sousTitre: String {
        guard let r = entree.resume else { return "Tout de suite dans À trier." }
        let e = r.engagementsAujourdhui, t = r.aTrier
        return "\(e) engagement\(e > 1 ? "s" : "") aujourd'hui · \(t) à trier"
    }

    private var marque: some View {
        HStack(spacing: 7) {
            Text("B").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color(red: 0.043, green: 0.043, blue: 0.043))
                .frame(width: 18, height: 18).background(accent, in: RoundedRectangle(cornerRadius: 5))
            Text("Bruno").font(.system(size: 12)).foregroundStyle(sourd)
        }
    }

    private func micro(_ taille: CGFloat) -> some View {
        ZStack {
            Circle().fill(accent).frame(width: taille, height: taille).shadow(color: accent.opacity(0.35), radius: 12, y: 8)
            Image(systemName: "mic.fill").font(.system(size: taille * 0.38, weight: .medium)).foregroundStyle(Color(red: 0.043, green: 0.043, blue: 0.043))
        }
    }
}
