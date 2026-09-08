# E5 — Relances · **Pilier 2**

> On ne compte pas sur les Membres pour ouvrir Bruno. Bruno les relance.

C'est l'épique qui décide si le produit vit ou meurt. Le critère de succès n°3 du PRD est
« les Relances ne sont pas désactivées au bout d'un mois ».

## BRU-23 — Les Créneaux · **livré (web)**

Maquette : les Réglages web v3 (identiques à l'écran iOS). Page `/reglages`, dans le rail.

- [x] Chaque Membre pose ses propres heures, **au quart d'heure près** (contrainte Postgres,
      traduite en refus lisible), minimum **trois** (tenu par l'API — invariant de table, hors
      de portée d'un `CHECK`, cf. ADR 0002)
- [x] La nature découle de la position dans la journée : première = **Point du matin**, dernière
      = **Bilan**, milieu = **Rappels**. Fonction pure `natures()`, testée. Rien d'autre à configurer
- [x] Point du matin et Bilan **non retirables** ; les Rappels le sont, et **« Retirer » se
      désactive à trois** — vérifié dans le navigateur (ajout, retrait, retour à trois)
- [x] Déplacer une heure (chevrons ±15 min) recalcule les natures — testé : un Rappel poussé
      devant devient le Point du matin
- [x] « + Ajouter un Créneau » — à midi, ou au premier quart d'heure libre après
- [x] La page porte aussi le **Compte** (nom, adresse, se déconnecter) ; la section Affectations
      arrive avec BRU-26

## BRU-24 — Le moteur de Relance · **livré**

`src/relances/` : le temps (fuseau Europe/Paris, quart d'heure courant, jour ouvré), la
composition (pure, testée) et le moteur (lit tout, n'écrit qu'une trace). Le cron l'appelle
toutes les 15 minutes ; `?apercu=1&quand=2026-09-08T09:15` rejoue un instant sans rien envoyer.

- [x] **Une seule notification groupée par Créneau**, jamais une par Tâche *(règle 13)* —
      `composer()` renvoie un message ou rien
- [x] **Point du matin** : Affectation du jour · Tâches engagées aujourd'hui · Tâches À venir
      dont l'Engagement arrive (*« les passer Sur le feu ? »* — proposées, jamais déplacées) ·
      Bloqué · Affectations ouvertes depuis plus de 14 jours (*« Toujours sur X ? »*) · reportées
      3 fois ou plus
- [x] **Rappels** : *« N encore ouvertes aujourd'hui »*. Factuel
- [x] **Bilan** : *« Tu devais finir X. N autres engagements encore ouverts. »* — la première par Rang
- [x] Les Tâches **Bloqué sont exclues** des Rappels et du Bilan *(règle 16)* — et mentionnées au
      Point du matin
- [x] **Aucune Relance le samedi ni le dimanche** *(règle 15)*. Un Engagement du week-end est
      simplement « ≤ aujourd'hui » le lundi : il glisse sans Report, et sans écriture — rien ne
      bouge tout seul
- [x] Aucun mode vacances *(règle 17)*
- [x] Rien à envoyer ⇒ **rien n'est envoyé**
- [x] **Jamais deux fois** : une table `relance_envoyee` (Membre × jour × Créneau, unique) fait
      barrage si le cron repasse. Testé. La livraison est une interface : le journal aujourd'hui,
      APNs avec BRU-25 — le moteur n'y verra rien
- [x] Vérifié sur la démo : trois Points du matin distincts à 09:15, trois Bilans à 17:30, rien
      le samedi

## BRU-25 — Push iOS actionnable · ⛔ **bloqué : il manque l'app iOS et une clé APNs**

Le moteur est prêt et livre à une interface. Pour brancher APNs il faut : l'app iOS (E1, BRU-6),
et une **clé d'authentification APNs** (fichier `.p8`, `Key ID`, `Team ID`, `Bundle ID`) créée
dans le compte développeur Apple — à poser dans Vercel, jamais dans le code.

Maquette : `Bruno iOS v2` → écran « Relance · écran verrouillé ».

- [ ] Appui long sur la notification : **`Terminé`** et **`Reporter`**
- [ ] `Terminé` ne demande rien et n'ouvre pas l'app
- [ ] `Reporter` ouvre une extension légère avec la raison, **sans charger l'app entière**
- [ ] Le corps rappelle la Tâche nommée et le reste (« 1 autre engagement encore ouvert »)
- [ ] C'est la différence entre un système de relance et du spam *(règle 14)* — si ce ticket
      est bâclé, coupez le pilier 2 et assumez-le
