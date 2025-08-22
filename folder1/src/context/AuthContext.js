

import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage
} from 'firebase/messaging';

// Validate required environment variables
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  console.error('Please create a .env file in the folder1 directory with the required Firebase configuration.');
}

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up with email and password
  function signup(email, password) {
    if (!auth) {
      return Promise.reject(new Error('Firebase authentication not initialized'));
    }
    return createUserWithEmailAndPassword(auth, email, password);
  }

  // Sign in with email and password
  function signin(email, password) {
    if (!auth) {
      return Promise.reject(new Error('Firebase authentication not initialized'));
    }
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Sign in with Google
  function signInWithGoogle() {
    if (!auth || !googleProvider) {
      return Promise.reject(new Error('Firebase authentication not initialized'));
    }
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    return signInWithPopup(auth, googleProvider);
  }

  // Phone authentication
  function setupRecaptcha(elementId) {
    if (!auth) {
      return Promise.reject(new Error('Firebase authentication not initialized'));
    }
    return new RecaptchaVerifier(auth, elementId, {
      'size': 'normal',
      'callback': () => {
        console.log('reCAPTCHA verified successfully');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      }
    });
  }

  function sendOTP(phoneNumber, recaptchaVerifier) {
    if (!auth) {
      return Promise.reject(new Error('Firebase authentication not initialized'));
    }
    return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  }

  // Logout
  function logout() {
    localStorage.removeItem('user');
    if (!auth) {
      return Promise.resolve();
    }
    return signOut(auth);
  }

  async function ensureUserProfileDocument(user) {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        phoneNumber: user.phoneNumber || null,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Failed to upsert user profile:', e);
    }
  }

  async function enableNotifications() {
    try {
      if (!currentUser) {
        console.warn('User not logged in; cannot enable notifications');
        return { ok: false, reason: 'not_logged_in' };
      }

      const supported = await isSupported().catch(() => false);
      if (!supported) {
        console.warn('Notifications/messaging not supported in this browser');
        return { ok: false, reason: 'not_supported' };
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return { ok: false, reason: 'permission_denied' };
      }

      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = getMessaging(app);
      const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swReg
      });

      if (!token) {
        console.warn('Failed to get FCM token');
        return { ok: false, reason: 'no_token' };
      }

      const userRef = doc(db, 'users', currentUser.uid);
      // Ensure doc exists, then append token idempotently
      await setDoc(userRef, { createdAt: serverTimestamp() }, { merge: true });
      await updateDoc(userRef, {
        webPushTokens: arrayUnion(token),
        lastTokenAt: serverTimestamp()
      });

      // Foreground messages
      onMessage(messaging, (payload) => {
        try {
          const title = payload?.notification?.title || 'Alert';
          const body = payload?.notification?.body || '';
          console.log('Foreground push:', title, body, payload);
        } catch (_) {}
      });

      return { ok: true, token };
    } catch (err) {
      console.error('enableNotifications error:', err);
      return { ok: false, reason: 'error', error: String(err?.message || err) };
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      if (user) {
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber
        };
        localStorage.setItem('user', JSON.stringify(userData));
        await ensureUserProfileDocument(user);
      } else {
        localStorage.removeItem('user');
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    signin,
    signInWithGoogle,
    setupRecaptcha,
    sendOTP,
    logout,
    enableNotifications
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
