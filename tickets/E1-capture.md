# E1 — Capture · **Pilier 1**

> Une idée doit atterrir dans Bruno en quelques secondes, à la voix, depuis le mobile,
> sans jamais échouer.

## BRU-6 — Écran Capture iOS · **livré le 9 septembre**

Maquette : `Bruno iOS v2` → écran « Capture ».

- [x] Gros bouton micro central, appui = enregistrement, transcription affichée en direct
- [x] Champ texte juste en dessous — **pas optionnel** (réunions, transports, open space)
- [x] Compteur de durée
- [x] Bandeau d'état réseau : `hors ligne · N en attente d'envoi`
- [x] Bouton d'action libellé **« Envoyer dans À trier »** — la destination est explicite
- [x] Accessible depuis le bouton central de la barre d'onglets, sur tous les écrans

## BRU-7 — La Capture ne peut jamais échouer *(règle 1)* · **livré le 9 septembre**

Le ticket le plus important du produit. Si la capture échoue une seule fois, la confiance est
morte et le pilier 1 avec.

- [x] L'audio est écrit sur le disque **avant** tout appel réseau
- [x] La Tâche est créée localement immédiatement (la file sur le disque) — elle s'affichera dans
      À trier de l'écran En attente iOS avec BRU-12
- [x] File d'attente persistante, qui survit à un kill de l'app et à un redémarrage du téléphone
- [x] Renvoi automatique au retour du réseau, avec back-off
- [x] Aucun écran d'erreur bloquant, jamais — l'échec réseau est un état, pas une alerte
- [x] **Test explicite** : mode avion, trois captures, kill de l'app, retour du réseau,
      les trois arrivent — *joué dans le simulateur avec le serveur coupé : deux captures en file,
      app tuée, serveur revenu, les deux arrivent dans l'ordre, la file se vide*

## BRU-8 — Transcription vocale · **livré le 9 septembre**

- [x] Choix du moteur documenté dans un ADR : sur l'appareil (rapide, hors ligne, moins précis)
      contre API (précis, exige le réseau). Le hors ligne étant obligatoire, prévoir au minimum
      un repli sur l'appareil — [ADR 0004](../docs/adr/0004-transcription.md)
- [x] La **transcription brute est toujours stockée** et jamais écrasée *(règle 3)*

## BRU-9 — Enrichissement LLM asynchrone

- [x] Tourne **après** la création de la Tâche, jamais avant — il ne bloque rien
- [x] Produit un titre propre, et remplit Assigné et Engagement **uniquement s'ils sont énoncés
      explicitement** *(règle 4 : il ne devine jamais)*
- [x] Ne pose **jamais** le Bucket `Sur le feu` *(règle 2)*
- [x] Si l'utilisateur dit « urgent », la Tâche remonte en tête d'À trier — rien de plus
- [x] Si le LLM échoue ou n'est pas joignable, la Tâche reste avec son titre brut, et c'est un
      état parfaitement acceptable
- [x] La transcription brute reste visible sous le titre nettoyé, dans les Notes

*Fait côté serveur : `POST /api/taches` répond, puis enrichit après coup (`after()`), seulement
pour une Capture (À trier). Sans `ANTHROPIC_API_KEY`, rien ne se passe et rien ne casse. À poser
dans Vercel pour l'activer en prod.*

## BRU-10 — Widget écran d'accueil · **bloqué par BRU-34**

Le meilleur levier du pilier 1 : supprimer les trois secondes d'ouverture d'app.

- [ ] Un tap sur le widget démarre l'enregistrement, sans ouvrir l'app
- [ ] Fonctionne écran verrouillé
- [ ] Même garantie de non-échec que BRU-7
