import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - CONFIGURED ✅
const firebaseConfig = {
  apiKey: "AIzaSyDxBhimDN0NQKUZrgfniRqg9qrhqOsEgW0",
  authDomain: "gst-buddy-c1db9.firebaseapp.com",
  projectId: "gst-buddy-c1db9",
  storageBucket: "gst-buddy-c1db9.firebasestorage.app",
  messagingSenderId: "555739119308",
  appId: "1:555739119308:web:a3631408ce988550c04c69",
  measurementId: "G-C62H1W3P81"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore Database
export const db = getFirestore(app);

export default app;

// DEBUGGING INFO
if (typeof window !== 'undefined') {
  console.log('🔥 Firebase Config Status:');
  console.log('   Project ID:', firebaseConfig.projectId);
  console.log('   Auth Domain:', firebaseConfig.authDomain);
  console.log('   API Key Valid:', firebaseConfig.apiKey && firebaseConfig.apiKey.length > 20);
  console.log('   ⚠️ If values above look generic, update firebase.js with real credentials');
  console.log('   📖 See FIREBASE_SETUP.md for complete setup guide');
}
