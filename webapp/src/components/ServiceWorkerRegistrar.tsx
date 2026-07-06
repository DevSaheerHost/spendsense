"use client";

import { useEffect } from "react";

// Registers the service worker on load so the app is installable (PWA) and
// works offline. FCM reuses this same registration when notifications are
// enabled. Renders nothing.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {});
  }, []);

  return null;
}
