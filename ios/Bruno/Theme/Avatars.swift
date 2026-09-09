import UIKit

/// Les photos de profil : une data URL de 160 px dans un sens, une image dans l'autre. Petit cache, parce qu'une pastille se dessine souvent.
enum Avatars {
    nonisolated(unsafe) private static var cache: [String: UIImage] = [:]

    static func image(_ dataURL: String) -> UIImage? {
        if let i = cache[dataURL] { return i }
        guard let virgule = dataURL.firstIndex(of: ","), let donnees = Data(base64Encoded: String(dataURL[dataURL.index(after: virgule)...])), let i = UIImage(data: donnees) else { return nil }
        if cache.count > 32 { cache.removeAll() }
        cache[dataURL] = i
        return i
    }

    /// Réduire une photo en un petit carré de 160 px, en JPEG : assez pour un rond, pas de quoi peser.
    static func dataURL(_ image: UIImage) -> String? {
        let cote = min(image.size.width, image.size.height)
        let cadre = CGRect(x: (image.size.width - cote) / 2, y: (image.size.height - cote) / 2, width: cote, height: cote)
        let rendu = UIGraphicsImageRenderer(size: CGSize(width: 160, height: 160), format: { let f = UIGraphicsImageRendererFormat(); f.scale = 1; return f }())
        let petite = rendu.image { _ in
            let echelle = 160 / cote
            image.draw(in: CGRect(x: -cadre.minX * echelle, y: -cadre.minY * echelle, width: image.size.width * echelle, height: image.size.height * echelle))
        }
        guard let jpeg = petite.jpegData(compressionQuality: 0.85) else { return nil }
        return "data:image/jpeg;base64," + jpeg.base64EncodedString()
    }
}
