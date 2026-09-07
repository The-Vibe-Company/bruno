# E5 — Relances · **Pilier 2**

> On ne compte pas sur les Membres pour ouvrir Bruno. Bruno les relance.

C'est l'épique qui décide si le produit vit ou meurt. Le critère de succès n°3 du PRD est
« les Relances ne sont pas désactivées au bout d'un mois ».

## BRU-23 — Les Créneaux

Maquette : `Bruno iOS v2` → écran « Réglages ».

- [ ] Chaque Membre pose ses propres heures, **au quart d'heure près**, minimum **trois**
- [ ] La nature découle de la position dans la journée : la première est le **Point du matin**,
      la dernière le **Bilan**, celles du milieu des **Rappels**. Rien d'autre à configurer
- [ ] Point du matin et Bilan **non retirables**. Les Rappels sont retirables — mais on ne peut
      pas descendre sous trois Créneaux au total : le dernier « Retirer » est désactivé
- [ ] Déplacer une heure recalcule les natures automatiquement
- [ ] « + Ajouter un Créneau »

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
