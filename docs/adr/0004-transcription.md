# ADR 0004 — La transcription se fait sur l'iPhone, par le framework Speech d'Apple

**Date** : 9 septembre 2026 · **Statut** : accepté · **Ticket** : BRU-8

## Contexte

La Capture est le pilier 1 : une idée doit atterrir dans Bruno en quelques secondes, à la voix,
**sans jamais échouer** (règle 1) — donc y compris hors ligne, dans un train ou un parking. Deux
familles de moteurs existent : sur l'appareil (rapide, hors ligne, un peu moins précis) et par
une API (plus précis, exige le réseau, coûte, envoie la voix ailleurs).

## Décision

`SFSpeechRecognizer` (framework Speech d'Apple), locale `fr-FR`, avec `requiresOnDeviceRecognition`
dès que l'iPhone le sait faire — c'est le cas sur tout iPhone récent en français. Quand il ne le
sait pas, Speech passe par les serveurs d'Apple : même code, même résultat, moins de garantie
hors ligne. Aucune API tierce.

Trois compléments :
- **L'audio est écrit sur le disque au fil de l'eau** (`.caf`, à côté de la file d'attente), avant
  tout appel réseau (BRU-7). Il n'est pas envoyé au serveur aujourd'hui : il est là pour ne rien
  perdre si la transcription rate — et pour une retranscription plus tard si on le veut.
- **Le champ texte n'est pas optionnel** : réunions, transports, open space. Ce qu'on écrit est
  le titre ; ce qu'on dit est la transcription brute, et elle part toujours telle quelle (règle 3).
- Si le micro ou la transcription sont refusés ou indisponibles, l'écran le dit en une ligne et
  renvoie au champ texte. Jamais un écran d'erreur bloquant.

## Conséquences

- Zéro coût, zéro dépendance, la voix ne quitte pas l'iPhone quand la reconnaissance locale existe.
- La qualité dépend d'Apple ; l'Enrichissement (BRU-9) nettoie le titre derrière, et la
  transcription brute reste visible sous le titre nettoyé.
- Le simulateur transcrit avec le micro du Mac ; l'entrée audio y est parfois absente — l'écran
  renvoie alors au texte, comme sur un iPhone sans micro.
