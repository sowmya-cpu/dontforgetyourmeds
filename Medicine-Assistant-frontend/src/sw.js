
import { precacheAndRoute } from "workbox-precaching";

// Cache application files for offline use
precacheAndRoute(self.__WB_MANIFEST);

// Receive Web Push notifications

self.addEventListener("push", (event) => {
  console.log("Push event received by service worker");

  let data = {
    title: "Medicine Assistant Test",
    body: "Your service worker push handler is working!",
    url: "/",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      requireInteraction: true,
      data: { url: data.url || "/" },
    })
  );
});


// Open the app when the user clicks a notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clients) => {
        const existingClient = clients.find(
          (client) => client.url === targetUrl
        );

        if (existingClient) {
          return existingClient.focus();
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});
