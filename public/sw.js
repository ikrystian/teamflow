// Service Worker dla powiadomień push
const CACHE_NAME = 'teamflow-v1';

// Instalacja service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

// Aktywacja service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

// Obsługa powiadomień push
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Przypomnienie o zadaniu', body: event.data.text() };
    }
  }

  const options = {
    title: data.title || 'Przypomnienie o zadaniu',
    body: data.body || 'Masz zadanie do wykonania',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data,
    actions: [
      {
        action: 'view',
        title: 'Zobacz zadanie'
      },
      {
        action: 'dismiss',
        title: 'Odrzuć'
      }
    ],
    requireInteraction: true,
    tag: data.taskId || 'task-reminder'
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Obsługa kliknięć w powiadomienia
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  if (event.action === 'view') {
    // Sprawdź typ powiadomienia i przejdź do odpowiedniej sekcji
    const data = event.notification.data || {};
    let url = '/dashboard';
    let messageType = 'NAVIGATE';

    if (data.chatRoomId) {
      // Powiadomienie o wiadomości w chacie
      url = `/dashboard/chat?room=${data.chatRoomId}`;
      messageType = 'NAVIGATE_TO_CHAT';
    } else if (data.taskId) {
      // Powiadomienie o zadaniu
      url = `/tasks?taskId=${data.taskId}`;
      messageType = 'NAVIGATE_TO_TASK';
    }

    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Sprawdź czy aplikacja jest już otwarta
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: messageType,
              chatRoomId: data.chatRoomId,
              taskId: data.taskId
            });
            return;
          }
        }

        // Jeśli aplikacja nie jest otwarta, otwórz nową kartę
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Powiadomienie zostało odrzucone
    console.log('Notification dismissed');
  }
});

// Obsługa zamknięcia powiadomienia
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed');
});
