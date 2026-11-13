import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, Timestamp } from 'firebase/firestore';
import { isFirebaseMock } from './services/env';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock-auth-domain',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock-project-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mock-storage-bucket',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'mock-sender-id',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'mock-app-id',
};

export { firebaseConfig };
export const app = initializeApp(firebaseConfig);

// App Check (opcional): defina VITE_FIREBASE_APPCHECK_SITE_KEY (reCAPTCHA v3) e
// ative a imposição no console do Firebase para barrar clientes que não sejam o app.
const appCheckKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
if (!isFirebaseMock && appCheckKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
// O cache persistente do Firestore (IndexedDB) já cuida de leitura offline e da
// fila de escritas por usuário; em modo mock usamos cache em memória.
export const db = initializeFirestore(app, {
  localCache: isFirebaseMock
    ? memoryLocalCache()
    : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export { Timestamp };
