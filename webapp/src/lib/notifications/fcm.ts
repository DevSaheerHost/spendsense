"use client";

import { getToken, onMessage, type Messaging } from "firebase/messaging";
import { getMessagingInstance } from "@/lib/firebase/client";
import { saveFcmToken } from "@/lib/firestore/users";

/**
 * Requests notification permission, registers the FCM service worker,
 * fetches a device token, and stores it on the user's Firestore profile
 * so server-side jobs (EMI reminders, budget alerts) can reach this device.
 */
export async function registerForPushNotifications(uid: string): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set; push notifications are disabled.");
    return null;
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  }).catch((error) => {
    console.error("Failed to get FCM token", error);
    return null;
  });

  if (token) {
    await saveFcmToken(uid, token);
  }
  return token;
}

export function listenForForegroundMessages(
  messaging: Messaging,
  onMessageReceived: (title: string, body: string) => void
) {
  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? "SpendSense";
    const body = payload.notification?.body ?? "";
    onMessageReceived(title, body);
  });
}

/**
 * Calls the server API route to push a notification to the current user's
 * own registered devices. Requires a fresh Firebase Auth ID token.
 */
export async function sendPushToSelf(idToken: string, title: string, body: string) {
  await fetch("/api/notifications/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ title, body }),
  }).catch((error) => {
    console.error("Failed to send push notification", error);
  });
}
