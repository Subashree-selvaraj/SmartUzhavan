

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

// Initialize Firebase with error handling
let app, auth, googleProvider;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  console.warn('Running in development mode without Firebase authentication');
  console.warn('Please check your Firebase API key and configuration');
}

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

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
