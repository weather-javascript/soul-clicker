import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ★ Step3で取得したconfigをここに貼り付けるか、環境変数から読み込む
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? 'DUMMY_API_KEY',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? 'DUMMY.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? 'DUMMY_PROJECT',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? 'DUMMY.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '1:000:web:000',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
