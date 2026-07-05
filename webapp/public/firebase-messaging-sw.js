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
    icon: "/next.svg",
  };
  self.registration.showNotification(title, options);
});
