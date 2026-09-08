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

## BRU-24 — Le moteur de Relance

- [ ] **Une seule notification groupée par Créneau.** Jamais une notification par Tâche —
      c'est la décision qui détermine si le système survit *(règle 13)*
- [ ] **Point du matin** : mon Affectation du jour · mes Tâches engagées aujourd'hui · les Tâches
      À venir dont l'Engagement arrive (proposition de passage) · mes Bloqué · les Affectations
      ouvertes depuis plus de 14 jours
- [ ] **Rappels** : ce qui reste ouvert aujourd'hui. Ton factuel
- [ ] **Bilan** : ce que je devais finir et qui ne l'est pas. Ton direct, il nomme la Tâche
- [ ] Les Tâches **Bloqué sont exclues** des Rappels et du Bilan *(règle 16)*
- [ ] **Aucune Relance le samedi ni le dimanche.** Un Engagement du week-end glisse au lundi
      **sans compter comme un Report** *(règle 15)*
- [ ] Aucun mode vacances *(règle 17)*
- [ ] Rien à envoyer ⇒ **rien n'est envoyé**. Une notification vide est du bruit pur

## BRU-25 — Push iOS actionnable

Maquette : `Bruno iOS v2` → écran « Relance · écran verrouillé ».

- [ ] Appui long sur la notification : **`Terminé`** et **`Reporter`**
- [ ] `Terminé` ne demande rien et n'ouvre pas l'app
- [ ] `Reporter` ouvre une extension légère avec la raison, **sans charger l'app entière**
- [ ] Le corps rappelle la Tâche nommée et le reste (« 1 autre engagement encore ouvert »)
- [ ] C'est la différence entre un système de relance et du spam *(règle 14)* — si ce ticket
      est bâclé, coupez le pilier 2 et assumez-le
