import PhotosUI
import SwiftUI

/// Mon profil : ma photo, depuis la pellicule — et la retirer. Le reste se règle sur le web.
struct ProfilFeuille: View {
    let moi: Moi
    let onChange: () async -> Void
    @Environment(\.dismiss) private var fermer
    @State private var choix: PhotosPickerItem?
    @State private var occupe = false
    @State private var erreur: String?

    private struct Corps: Encodable, Sendable { let avatar: String? ; func encode(to e: Encoder) throws { var c = e.container(keyedBy: Cle.self); if let avatar { try c.encode(avatar, forKey: .avatar) } else { try c.encodeNil(forKey: .avatar) } } ; enum Cle: String, CodingKey { case avatar } }

    var body: some View {
        VStack(spacing: 20) {
            Capsule().fill(Color(hex: 0x3A3A3A)).frame(width: 40, height: 4)
            Initiale(nom: moi.nom, avatar: moi.avatar, taille: 96)
            VStack(spacing: 2) {
                Text(moi.nom).font(.system(size: 20, weight: .semibold)).foregroundStyle(Teinte.texte)
                Text(moi.email).font(.system(size: 14)).foregroundStyle(Teinte.texteSourd)
            }
            if let erreur { Text(erreur).font(.system(size: 13.5)).foregroundStyle(Teinte.bloque) }
            VStack(spacing: 8) {
                PhotosPicker(selection: $choix, matching: .images) {
                    Text(moi.avatar == nil ? "Ajouter une photo" : "Changer la photo").font(.system(size: 16, weight: .medium)).foregroundStyle(Teinte.surAccent)
                        .frame(maxWidth: .infinity, minHeight: 52).background(Teinte.accent, in: RoundedRectangle(cornerRadius: 12))
                }
                .disabled(occupe)
                if moi.avatar != nil {
                    Button { poser(nil) } label: {
                        Text("Retirer la photo").font(.system(size: 16)).foregroundStyle(Teinte.texte)
                            .frame(maxWidth: .infinity, minHeight: 48).overlay(RoundedRectangle(cornerRadius: 12).stroke(Teinte.bordFort))
                    }
                    .disabled(occupe)
                }
                Button("Fermer") { fermer() }.font(.system(size: 16)).foregroundStyle(Teinte.texteSourd).frame(maxWidth: .infinity, minHeight: 40)
            }
        }
        .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 8)
        .presentationDetents([.height(moi.avatar == nil ? 380 : 436)])
        .presentationDragIndicator(.hidden)
        .presentationBackground(Color(hex: 0x141414))
        .onChange(of: choix) { _, item in
            guard let item else { return }
            Task {
                guard let donnees = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: donnees), let url = Avatars.dataURL(image) else { erreur = "Cette image ne passe pas — essaie une autre."; return }
                poser(url)
            }
        }
    }

    private func poser(_ avatar: String?) {
        occupe = true; erreur = nil
        Task {
            do { let _: Moi = try await Api.partagee.modifier("api/auth/moi", Corps(avatar: avatar)); await onChange(); fermer() }
            catch { erreur = error.localizedDescription }
            occupe = false
        }
    }
}
