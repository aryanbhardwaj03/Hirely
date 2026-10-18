import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile as updateFirebaseProfile,
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
  console.warn('Firebase initialization note:', err);
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

function mapFirebaseError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Access temporarily disabled due to multiple failed attempts. Please reset your password or try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing authentication.';
    case 'auth/cancelled-popup-request':
      return 'A sign-in request is already in progress.';
    case 'auth/unauthorized-domain':
      return 'This app domain is not authorized in your Firebase console. Please add it under Authentication > Settings > Authorized Domains.';
    default:
      return error?.message || 'Authentication failed. Please verify your connection and try again.';
  }
}

export async function loginWithGoogle(): Promise<{ user: AuthUser; token: string }> {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Firebase configuration is missing. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in your environment.');
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
    return { user: authUser, token };
  } catch (error: any) {
    throw new Error(mapFirebaseError(error));
  }
}

export async function loginWithEmail(
  email: string,
  pass: string
): Promise<{ user: AuthUser; token: string }> {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Firebase configuration is missing. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in your environment.');
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const token = await result.user.getIdToken();
    const authUser: AuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };
    return { user: authUser, token };
  } catch (error: any) {
    throw new Error(mapFirebaseError(error));
  }
}

export async function registerWithEmail(
  email: string,
  pass: string,
  name?: string
): Promise<{ user: AuthUser; token: string }> {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Firebase configuration is missing. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in your environment.');
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);

    // Optionally update display name
    if (name && name.trim()) {
      try {
        await updateFirebaseProfile(result.user, { displayName: name.trim() });
      } catch (profileErr) {
        console.warn('Could not set displayName on new user:', profileErr);
      }
    }

    // Trigger email verification if supported
    try {
      await sendEmailVerification(result.user);
    } catch (verifErr) {
      console.warn('Email verification email could not be dispatched:', verifErr);
    }

    const token = await result.user.getIdToken();
    const authUser: AuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: name?.trim() || result.user.displayName,
      photoURL: result.user.photoURL,
    };
    return { user: authUser, token };
  } catch (error: any) {
    throw new Error(mapFirebaseError(error));
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Firebase configuration is missing. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in your environment.');
  }

  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    throw new Error(mapFirebaseError(error));
  }
}

export async function logoutUser(): Promise<void> {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error', e);
    }
  }
}

export function subscribeToAuthChanges(
  callback: (user: AuthUser | null, token: string | null) => void
): () => void {
  if (auth && isFirebaseConfigured()) {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const user: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };
          callback(user, token);
        } catch {
          callback(null, null);
        }
      } else {
        callback(null, null);
      }
    });
    return unsubscribe;
  }

  callback(null, null);
  return () => {};
}

export async function getCurrentAuthToken(): Promise<string | null> {
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }
  return null;
}
