importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// NOTE: Firebase web config values are public identifiers (not secrets), so
// it is safe to hardcode them here. Replace with your project's config, or
// keep in sync with the NEXT_PUBLIC_FIREBASE_* values in your .env.local.
firebase.initializeApp({
  apiKey: "AIzaSyDNAxmbAi5prBXsYhnVTXXfhtn80Ni9acw",
  authDomain: "testloginweb-f42ec.firebaseapp.com",
  projectId: "testloginweb-f42ec",
  storageBucket: "testloginweb-f42ec.firebasestorage.app",
  messagingSenderId: "280632803058",
  appId: "1:280632803058:web:b33a9733887a4d63ab5a6b",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "SpendSense";
  const options = {
    body: payload.notification?.body ?? "",
    icon: "/icons/icon-192.png",
  };
  self.registration.showNotification(title, options);
});

// Open the app (or focus it if already open) when a notification is clicked.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/dashboard");
    })
  );
});

// --- PWA offline caching ---------------------------------------------------
// Network-first with a same-origin cache fallback: once pages and assets have
// been visited online they stay available offline.
const CACHE_NAME = "spendsense-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only handle same-origin requests; let cross-origin (Firebase, Google APIs,
  // fonts) pass through untouched.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, copy))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(request))
  );
});
