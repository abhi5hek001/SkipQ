importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Must match the web app config in .env.local
// Service workers cannot read process.env — fill in your values here.
firebase.initializeApp({
  apiKey:            self.__FIREBASE_API_KEY__            || '',
  authDomain:        self.__FIREBASE_AUTH_DOMAIN__        || '',
  projectId:         self.__FIREBASE_PROJECT_ID__         || '',
  storageBucket:     self.__FIREBASE_STORAGE_BUCKET__     || '',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || '',
  appId:             self.__FIREBASE_APP_ID__             || '',
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
