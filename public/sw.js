self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("buddypilot-static-v2").then((cache) => cache.addAll([
    "/site.webmanifest?v=4",
    "/offline.html",
    "/icons.svg",
    "/icons/app-icon-192x192.png",
    "/icons/app-icon-96x96.png",
  ])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== "buddypilot-static-v2").map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Pages are never cached: they hold signed-in data. The fallback only shows
  // when the network request itself fails.
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
    return;
  }
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !/^\/(icons\/|icons\.svg|site\.webmanifest)/.test(url.pathname)) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open("buddypilot-static-v2").then((cache) => cache.put(event.request, copy));
    return response;
  })));
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "BuddyPilot", {
    body: data.body || "",
    icon: data.icon || "/icons/app-icon-192x192.png",
    badge: data.badge || "/icons/app-icon-96x96.png",
    tag: data.tag || "buddypilot-alert",
    renotify: false,
    data: { url: data.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
