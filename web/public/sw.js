/*
 * Le bout de Bruno qui tourne quand Bruno est fermé : il reçoit les Relances et les affiche.
 *
 * Il n'a pas besoin de savoir ce qu'est une Tâche — le serveur envoie déjà le texte tout fait,
 * le même que celui gardé dans `relance_envoyee`. `tag` fait qu'un Rappel remplace le précédent
 * au lieu d'empiler trois bulles sur l'écran verrouillé.
 */
self.addEventListener("push", (e) => {
  let m = { titre: "Bruno", corps: "" };
  try { if (e.data) m = e.data.json(); } catch { m.corps = e.data ? e.data.text() : ""; }
  e.waitUntil(self.registration.showNotification(m.titre || "Bruno", {
    body: m.corps,
    icon: "/icone-192.png",
    badge: "/icone-192.png",
    tag: m.tag || "relance",
    data: { url: m.url || "/" },
  }));
});

/* Un clic ouvre Bruno — ou revient sur l'onglet déjà ouvert plutôt que d'en ajouter un. */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
    for (const f of fenetres) if (new URL(f.url).origin === self.location.origin) return f.focus();
    return self.clients.openWindow(url);
  }));
});
