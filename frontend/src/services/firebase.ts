import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import { AuthUser } from '../types/opportunity';

// Check if Firebase environment variables are provided
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

try {
  if (isFirebaseConfigured()) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
} catch (err) {
  console.warn('Firebase initialization note: using fallback auth state until production credentials are configured.', err);
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Stored Demo User session key
const DEMO_USER_STORAGE_KEY = 'hirely_auth_user_session';

export async function loginWithGoogle(): Promise<{ user: AuthUser; token: string }> {
  if (!auth || !isFirebaseConfigured()) {
    // If Firebase credentials are not yet set in .env, perform a guided fallback login
    throw new Error('FIREBASE_CONFIG_MISSING');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    const authUser: AuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };
    localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify({ user: authUser, token }));
    return { user: authUser, token };
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Only one sign-in window can be active at a time.');
    }
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized in your Firebase console. Please add it to Authorized Domains.');
    }
    throw new Error(error.message || 'Failed to authenticate with Google.');
  }
}

export async function demoLogin(
  name = 'Alex Chen',
  email = 'alex.chen@university.edu'
): Promise<{ user: AuthUser; token: string }> {
  const demoUser: AuthUser = {
    uid: `demo-uid-${Date.now()}`,
    email,
    displayName: name,
    photoURL: null,
    isAnonymous: true,
  };
  const token = `hirely-demo-jwt-token-${demoUser.uid}`;
  localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify({ user: demoUser, token }));
  return { user: demoUser, token };
}

export async function logoutUser(): Promise<void> {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error', e);
    }
  }
  localStorage.removeItem(DEMO_USER_STORAGE_KEY);
}

export function subscribeToAuthChanges(
  callback: (user: AuthUser | null, token: string | null) => void
): () => void {
  // If Firebase Auth is initialized, attach real listener
  if (auth && isFirebaseConfigured()) {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        const user: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify({ user, token }));
        callback(user, token);
      } else {
        // Check if demo user stored
        const stored = localStorage.getItem(DEMO_USER_STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            callback(parsed.user, parsed.token);
            return;
          } catch {
            localStorage.removeItem(DEMO_USER_STORAGE_KEY);
          }
        }
        callback(null, null);
      }
    });
    return unsubscribe;
  }

  // Fallback: check localStorage for session
  const stored = localStorage.getItem(DEMO_USER_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      callback(parsed.user, parsed.token);
    } catch {
      callback(null, null);
    }
  } else {
    // Default to active demo session so user can immediately experience the app, or prompt login
    callback(null, null);
  }

  return () => {};
}

export async function getCurrentAuthToken(): Promise<string | null> {
  if (auth && auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  const stored = localStorage.getItem(DEMO_USER_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored).token;
    } catch {
      return null;
    }
  }
  return null;
}
