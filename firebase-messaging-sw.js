// firebase-messaging-sw.js

self.addEventListener('push', function(event) {
  let title = "JurgisAgro Pranešimas 🚜";
  let body = "Nauja informacija Jūsų ūkiui!";

  if (event.data) {
    try {
      const payload = event.data.json();
      const dataObj = payload.notification || payload.data;
      if (dataObj) {
          title = dataObj.title || title;
          body = dataObj.body || body;
      } else {
          body = event.data.text();
      }
    } catch (e) {
      body = event.data.text();
    }
  }

  // 🌟 „Nothing Phone“ ir Android telefonams BŪTINAS PNG formatas ir vibravimas
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: '/logo.png',   // 👈 PAKEISTA IŠ .svg Į .png (Android nepalaiko SVG!)
      badge: '/logo.png',  // 👈 PAKEISTA IŠ .svg Į .png
      vibrate: [200, 100, 200],
      requireInteraction: false
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Telefone atidaro pagrindinį langą, o ne localhost
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});