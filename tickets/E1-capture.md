# E1 — Capture · **Pilier 1**

> Une idée doit atterrir dans Bruno en quelques secondes, à la voix, depuis le mobile,
> sans jamais échouer.

## BRU-6 — Écran Capture iOS

Maquette : `Bruno iOS v2` → écran « Capture ».

- [ ] Gros bouton micro central, appui = enregistrement, transcription affichée en direct
- [ ] Champ texte juste en dessous — **pas optionnel** (réunions, transports, open space)
- [ ] Compteur de durée
- [ ] Bandeau d'état réseau : `hors ligne · N en attente d'envoi`
- [ ] Bouton d'action libellé **« Envoyer dans À trier »** — la destination est explicite
- [ ] Accessible depuis le bouton central de la barre d'onglets, sur tous les écrans

## BRU-7 — La Capture ne peut jamais échouer *(règle 1)*

Le ticket le plus important du produit. Si la capture échoue une seule fois, la confiance est
morte et le pilier 1 avec.

- [ ] L'audio est écrit sur le disque **avant** tout appel réseau
- [ ] La Tâche est créée localement immédiatement et apparaît dans À trier
- [ ] File d'attente persistante, qui survit à un kill de l'app et à un redémarrage du téléphone
- [ ] Renvoi automatique au retour du réseau, avec back-off
- [ ] Aucun écran d'erreur bloquant, jamais — l'échec réseau est un état, pas une alerte
- [ ] **Test explicite** : mode avion, trois captures, kill de l'app, retour du réseau,
      les trois arrivent

## BRU-8 — Transcription vocale

- [ ] Choix du moteur documenté dans un ADR : sur l'appareil (rapide, hors ligne, moins précis)
      contre API (précis, exige le réseau). Le hors ligne étant obligatoire, prévoir au minimum
      un repli sur l'appareil
- [ ] La **transcription brute est toujours stockée** et jamais écrasée *(règle 3)*

## BRU-9 — Enrichissement LLM asynchrone

- [ ] Tourne **après** la création de la Tâche, jamais avant — il ne bloque rien
- [ ] Produit un titre propre, et remplit Assigné et Engagement **uniquement s'ils sont énoncés
      explicitement** *(règle 4 : il ne devine jamais)*
- [ ] Ne pose **jamais** le Bucket `Sur le feu` *(règle 2)*
- [ ] Si l'utilisateur dit « urgent », la Tâche remonte en tête d'À trier — rien de plus
- [ ] Si le LLM échoue ou n'est pas joignable, la Tâche reste avec son titre brut, et c'est un
      état parfaitement acceptable
- [ ] La transcription brute reste visible sous le titre nettoyé, dans les Notes

## BRU-10 — Widget écran d'accueil · **bloqué par BRU-34**

Le meilleur levier du pilier 1 : supprimer les trois secondes d'ouverture d'app.

- [ ] Un tap sur le widget démarre l'enregistrement, sans ouvrir l'app
- [ ] Fonctionne écran verrouillé
- [ ] Même garantie de non-échec que BRU-7
