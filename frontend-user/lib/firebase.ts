import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (err) {
    console.warn('[FCM] Token request failed:', err);
    return null;
  }
}
