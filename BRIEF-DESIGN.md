# Brief pour Claude Design — Bruno, v3

Projet existant : `Bruno Web v2`, `Bruno Web v2 - Light`, `Bruno iOS v2`, `Bruno iOS v2 - Light`.
Reprendre exactement la même langue visuelle et produire **les deux thèmes** pour chaque écran.
Interface en français. Le vocabulaire est fixé dans `CONTEXT.md` : ne renommer aucun terme.

Il manque quatre choses. Par ordre de priorité.

---

## 1. Le formulaire du droit d'entrée « Sur le feu » — le plus urgent

**Le problème.** Aujourd'hui, la carte d'une Tâche « À trier » a un bouton « Sur le feu » qui la
déplace en un tap. Or une Tâche ne peut pas être Sur le feu sans un **Assigné** et un
**Engagement** — c'est la seule règle dure de Bruno. Le bouton la contourne.

**À dessiner.**
- Une feuille modale iOS : deux champs, **Assigné** et **Engagement**, rien d'autre.
- Pré-remplis avec « moi » et « aujourd'hui », validables en un tap.
- L'équivalent web, déclenché au clic sur le bouton **et** au dépôt d'une carte dans le kanban.
- L'état d'annulation.

**L'esprit.** Ni blocage sec ni valeur par défaut invisible : on doit toujours voir à quoi on
s'engage, sans que ça coûte plus d'un geste.

---

## 2. Le détail d'une Tâche sur le web, et sa feuille de Report

Les deux existent sur iOS, aucune sur le web. Cliquer une carte du Board ne mène nulle part.

**À dessiner.**
- **Le détail** : titre, puis `Statut · reporté N×`. Les champs Assigné, Aidants, Engagement,
  Statut, Reports. Les Notes, avec la **transcription vocale brute en italique** sous un filet.
- Actions : `Terminé` en primaire, `Reporter` et `Abandonner` à côté, `Supprimer` en secondaire.
- Panneau latéral ou modale, au choix — mais **sans quitter le Board** : on trie en rafale.
- **La feuille de Report** sur le web : reprendre la version iOS telle quelle, elle est bonne.

---

## 3. Le widget d'écran d'accueil iOS

Le produit tient sur une idée : capturer une idée en cinq secondes, à la voix, sans ouvrir l'app.
Le widget est ce qui supprime les trois secondes d'ouverture.

**À dessiner.**
- Le widget dans ses tailles, l'état d'enregistrement en cours, la confirmation muette après envoi.
- Dans les deux thèmes.

---

## 4. Le bandeau Affectation devient interactif

**Le problème.** On voit son Affectation sur « Aujourd'hui », sur le Daily et sur le Board, et on
peut en sortir (« Je ne suis plus dessus »). Mais **rien ne permet d'en prendre une**.

**À dessiner.**
- L'**état vide** du bandeau : quand on n'est sur rien, il propose de choisir.
- Le bandeau **cliquable** : un tap ouvre la liste des Affectations actives, on en choisit une
  ou plusieurs. La date de début est le jour même.
- Le cas de **plusieurs Affectations simultanées** sur iOS — la maquette n'en montre qu'une.

À ne pas faire : ajouter ça dans les Réglages. Les Réglages ne gèrent que la **liste** de ce à
quoi on peut travailler. Qui est sur quoi se voit — et se change — là où c'est affiché.

---

## Trois décisions récentes à répercuter dans les maquettes existantes

1. **Les rangs numérotés disparaissent** du Board sombre (`1 Relancer MONKA`, `2 Préparer le
   mail`…). La priorité, c'est la position dans la pile ; le mode clair avait raison.
2. **`la précédente n'est pas faite`** est supprimé de la carte d'une occurrence récurrente.
3. L'écran web **« Terminé » est renommé « Fait »** : il contient les Tâches terminées *et*
   abandonnées, et « Terminé » désigne un état précis du glossaire.

## Une correction mineure

Dans les Réglages iOS, le bouton « Retirer » du dernier Rappel doit être désactivé : on ne peut
pas descendre sous trois Créneaux.
