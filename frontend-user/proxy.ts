import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== '/firebase-messaging-sw.js') return;

  const sw = `
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? ''}",
  authDomain:        "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? ''}",
  projectId:         "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ''}",
  storageBucket:     "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? ''}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? ''}",
  appId:             "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? ''}",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'SkipQ';
  const body  = payload.notification?.body  ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/next.svg',
    data: payload.data,
  });
});
`;

  return new NextResponse(sw, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-store',
    },
  });
}

export const config = {
  matcher: '/firebase-messaging-sw.js',
};
