"use client";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";
import { type Messaging, getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
}

// Auth and Firestore are initialized lazily on first use rather than at module
// load. `getAuth()` throws (auth/invalid-api-key) when the config is missing,
// so eager top-level init would crash static prerendering during the build
// (e.g. of the not-found page) before env vars are ever needed. These getters
// are only ever called from browser-side code (effects, event handlers,
// Firestore subscriptions), so initialization happens with the real config.
let authInstance: Auth | null = null;
export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

let dbInstance: Firestore | null = null;
export function getFirebaseDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getFirebaseApp());
  return dbInstance;
}

// Messaging only works in the browser, and only when the platform supports it
// (e.g. no Safari private mode, no SSR). Callers must await this helper
// instead of importing a top-level Messaging instance.
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  return getMessaging(getFirebaseApp());
}
