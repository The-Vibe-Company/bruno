# Tickets — Bruno

Découpage du développement. Les tickets sont regroupés par épique, un fichier par épique.
Chaque ticket porte l'invariant ou la règle du [PRD](../PRD.md) qu'il fait respecter — c'est ce
qui doit être vérifié en relecture, pas seulement « ça marche ».

## Ordre de livraison

```
E0  Fondations          ─┬─→ E1  Capture ────────┐
                         ├─→ E2  Buckets & tri ──┼─→ E4  Engagement & Report ─→ E5  Relances
                         └─→ E3  Sur le feu ─────┘
                                                  └─→ E6  Affectations ─→ E7  Daily & Fait
                                                                          E8  Récurrence
```

**Le chemin critique de la V1**, c'est E0 → E1 → E2 → E4 → E5 : capturer, trier, s'engager,
être relancé. C'est la boucle qui porte les deux piliers. E6 à E8 sont réels mais détachables
si le planning dérape.

## Épiques

| | Épique | Tickets | Ce que ça sert |
|---|---|---|---|
| **E0** | [Fondations](./E0-fondations.md) | BRU-1 → 5, 38 | Stack, schéma, API, auth, thème |
| **E1** | [Capture](./E1-capture.md) | BRU-6 → 10 | **Pilier 1** |
| **E2** | [Buckets et tri](./E2-buckets-tri.md) | BRU-11 → 14 | Invariants 1, 2, 3 |
| **E3** | [Sur le feu](./E3-sur-le-feu.md) | BRU-15 → 19 | Statuts, Rang, fins |
| **E4** | [Engagement et Report](./E4-engagement-report.md) | BRU-20 → 22 | Invariants 4, 5 |
| **E5** | [Relances](./E5-relances.md) | BRU-23 → 25 | **Pilier 2** |
| **E6** | [Affectations et Clients](./E6-affectations.md) | BRU-26 → 29 | Invariant 6 |
| **E7** | [Daily et Fait](./E7-daily-fait.md) | BRU-30 → 31 | Le rituel |
| **E8** | [Récurrence](./E8-recurrence.md) | BRU-32 → 33 | Les séries |
| **E9** | [Design](./E9-design.md) | BRU-34 → 37, 39 → 41 | ✅ terminé |

## Bloqué par le design

**Plus rien.** Les quatre maquettes attendues ont été livrées le 7 septembre (voir
[E9](./E9-design.md)) : le droit d'entrée, le détail web et sa feuille de Report, le widget iOS,
et le bandeau Affectation interactif. **BRU-10, BRU-13 et BRU-28 sont débloqués.**

Le chemin est libre de bout en bout.
