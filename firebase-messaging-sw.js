// firebase-messaging-sw.js

self.addEventListener('push', function(event) {
  let title = "JurgisAgro Pranešimas 🚜";
  let body = "Nauja informacija Jūsų ūkiui!";

  if (event.data) {
    try {
      const payload = event.data.json();
      
      // 🌟 Dabar skaitome TIESIOGIAI iš to JSON struktūros, kurią matėte nuotraukoje:
      // Jei yra "notification" objektas, paimame jį
      const dataObj = payload.notification || payload.data;
      
      if (dataObj) {
          title = dataObj.title || title;
          body = dataObj.body || body;
      } else {
          // Jei tai senas geras tekstinis pranešimas
          body = event.data.text();
      }
    } catch (e) {
      body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: '/logo.svg',
      badge: '/logo.svg',
      requireInteraction: true
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('http://localhost:5000/'));
});