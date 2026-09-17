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
- [x] **Aucune Relance le samedi ni le dimanche** *(règle 15)* — et rien ne glisse non plus : un
      Engagement du vendredi arrive au lundi avec **un** Report, pas trois
- [x] **Le glissement du matin** (16 septembre 2026) : une Tâche Sur le feu qu'on devait finir
      avant aujourd'hui revient au jour même, et compte un Report sans auteur (« pas fait le jour
      dit »). Antoine l'a demandé ainsi ; auparavant l'Engagement restait au jour dit et rien ne
      bougeait sans qu'un humain donne une raison
- [x] **Sauf ce qui est bloqué** (17 septembre) : une Tâche bloquée n'a pas glissé, elle attend
      quelqu'un. Elle garde sa date, ne compte aucun Report, et dit « bloqué depuis 3 j »
- [x] **Un seul report vécu, un seul compté** : reporter à la main une Tâche que le matin venait
      de faire glisser **remplace** le Report automatique — même date de départ, compteur inchangé
- [x] Aucun mode vacances *(règle 17)*
- [x] Rien à envoyer ⇒ **rien n'est envoyé**
- [x] **Jamais deux fois** : une table `relance_envoyee` (Membre × jour × Créneau, unique) fait
      barrage si le cron repasse. Testé. La livraison est une interface : le journal aujourd'hui,
      APNs avec BRU-25 — le moteur n'y verra rien
- [x] Vérifié sur la démo : trois Points du matin distincts à 09:15, trois Bilans à 17:30, rien
      le samedi

## BRU-25 bis — Les Relances arrivent · **livré (push web)**

Le moteur composait depuis BRU-24 et livrait au journal : personne n'a jamais rien reçu. Le push
web couvre **l'ordinateur**, sans rien demander à Apple. Sur iPhone, les Relances passeront par
l'app — c'est BRU-25, et Antoine l'a tranché le 15 septembre : pas de Bruno posé sur l'écran
d'accueil, l'app.

- [x] `abonnement_push` : un appareil par ligne, endpoint unique — se réabonner remplace
- [x] Réglages → **Mes Relances** : activer sur cet appareil, la liste des appareils, « Envoyer un essai »
- [x] Un appareil parti (404/410 du service de push) est effacé tout seul : on ne réécrit pas dans le vide
- [x] Le cron livre aux appareils **et** au journal — c'est le journal qu'on relit quand quelqu'un
      dit « je n'ai rien reçu », et il dit maintenant si personne n'était abonné
- [x] Clés VAPID en variables d'environnement ; sans elles, Bruno se tait comme avant
- [x] Vérifié de bout en bout : le Point du matin reçu en notification dans un vrai navigateur
- [ ] Reste à APNs : l'appui long **`Terminé` / `Reporter`**, qu'une notification web ne sait pas faire

## BRU-25 — Push iOS actionnable · ⏳ **le code est là, il manque la clé APNs**

Tout le chemin est écrit : l'app demande l'autorisation au lancement, renvoie son jeton à chaque
fois (Apple le change quand il veut), et le serveur signe un jeton ES256 avec la clé `.p8` pour
parler à APNs en HTTP/2. Vérifié dans le simulateur avec la charge exacte que le serveur envoie.

Il manque **une clé d'authentification APNs** (`.p8` + `Key ID`) créée dans le compte Apple
Developer — à poser dans Vercel, jamais dans le code. Et, avant toute publication TestFlight :
**Push Notifications** activé sur l'identifiant `co.thevibecompany.bruno`, puis le profil App
Store régénéré — sinon la signature refuse l'entitlement `aps-environment`.

Maquette : `Bruno iOS v2` → écran « Relance · écran verrouillé ».

- [x] Appui long sur la notification : **`Terminé`** et **`Reporter`** (catégorie `RELANCE`)
- [x] `Terminé` ne demande rien et n'ouvre pas l'app : il ferme la première Tâche nommée
- [ ] `Reporter` ouvre l'app pour l'instant ; l'extension légère avec la raison reste à faire
- [ ] Le corps rappelle la Tâche nommée et le reste (« 1 autre engagement encore ouvert »)
- [ ] C'est la différence entre un système de relance et du spam *(règle 14)* — si ce ticket
      est bâclé, coupez le pilier 2 et assumez-le
