import Foundation

/// Ce qui se modifie librement sur une Tâche : le titre, les Notes, l'Assigné, les Aidants.
/// Jamais l'Engagement Sur le feu — il ne bouge que par un Report (invariant 4).
struct Patch: Encodable, Sendable {
    var titre: String?
    /// `.some(nil)` efface les Notes ; `nil` ne les touche pas.
    var notes: String??
    var assigneId: String?
    var aidantIds: [String]?

    enum Cle: String, CodingKey { case titre, notes, assigneId, aidantIds }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: Cle.self)
        if let titre { try c.encode(titre, forKey: .titre) }
        if let notes { if let notes { try c.encode(notes, forKey: .notes) } else { try c.encodeNil(forKey: .notes) } }
        if let assigneId { try c.encode(assigneId, forKey: .assigneId) }
        if let aidantIds { try c.encode(aidantIds, forKey: .aidantIds) }
    }
}
