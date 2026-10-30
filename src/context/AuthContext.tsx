import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
  onIdTokenChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'signin' | 'signup' | 'forgot';
  setAuthModalMode: (mode: 'signin' | 'signup' | 'forgot') => void;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function syncUserProfileDocument(firebaseUser: User, explicitDisplayName?: string): Promise<void> {
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const nowIso = new Date().toISOString();
  const snap = await getDoc(userDocRef);
  const existingData = snap.exists() ? snap.data() : undefined;

  const resolvedName =
    explicitDisplayName?.trim() ||
    firebaseUser.displayName?.trim() ||
    existingData?.displayName ||
    firebaseUser.email?.split('@')[0] ||
    'FinPilot User';

  await setDoc(
    userDocRef,
    {
      id: firebaseUser.uid,
      email: firebaseUser.email || existingData?.email || '',
      displayName: String(resolvedName).slice(0, 128),
      photoURL: String(firebaseUser.photoURL || existingData?.photoURL || '').slice(0, 2048),
      createdAt: existingData?.createdAt || nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  const popupInFlightRef = useRef(false);
  const syncedUidRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Clean up any legacy mock session artifact from older builds
    try {
      localStorage.removeItem('finpilot_active_session');
    } catch {
      // Ignore storage access errors in restricted privacy modes
    }

    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      if (currentUser) {
        try {
          // Validate token freshness to handle revoked or expired sessions cleanly
          await currentUser.getIdToken();
        } catch (tokenErr: any) {
          const code = tokenErr?.code || '';
          if (
            code === 'auth/user-token-expired' ||
            code === 'auth/invalid-user-token' ||
            code === 'auth/user-disabled'
          ) {
            await firebaseSignOut(auth).catch(() => {});
            if (isMounted) {
              setUser(null);
              syncedUidRef.current = null;
              setAuthError('Your session has expired. Please sign in again.');
              setLoading(false);
            }
            return;
          }
        }

        if (!isMounted) return;
        setUser(currentUser);
        setLoading(false);

        // Synchronize user profile document once per authenticated UID session
        if (syncedUidRef.current !== currentUser.uid) {
          syncedUidRef.current = currentUser.uid;
          syncUserProfileDocument(currentUser).catch((err) => {
            console.error('Failed to synchronize user profile in Firestore:', err);
          });
        }
      } else {
        syncedUidRef.current = null;
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const translateAuthError = useCallback((error: any): string => {
    const code = String(error?.code || '');
    const rawMsg = String(error?.message || '');
    const host = typeof window !== 'undefined' ? window.location.hostname : 'current domain';

    if (
      code === 'auth/operation-not-allowed' ||
      code === 'auth/admin-restricted-operation' ||
      rawMsg.includes('PASSWORD_LOGIN_DISABLED')
    ) {
      return 'Email/Password sign-in is currently disabled in Firebase Console. Please click "Continue with Google", or enable the Email/Password provider in Firebase Console → Authentication → Sign-in method.';
    }

    switch (code) {
      case 'auth/popup-closed-by-user':
        return 'Sign-in window was closed before completing. Please try again when ready.';
      case 'auth/popup-blocked':
        return 'Your browser blocked the Google Sign-In popup. Please allow popups for this site in your address bar (or open FinPilot in a new browser tab) and try again.';
      case 'auth/unauthorized-domain':
        return `Domain "${host}" is not authorized for Firebase OAuth. Add "${host}" in Firebase Console → Authentication → Settings → Authorized domains.`;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This user account has been disabled. Please contact your administrator.';
      case 'auth/user-token-expired':
        return 'Your session expired. Please sign in again.';
      case 'auth/too-many-requests':
        return 'Too many unsuccessful attempts. Please wait a moment before trying again.';
      case 'auth/network-request-failed':
        return 'Network error while reaching Firebase Authentication. Please check your internet connection.';
      default:
        return rawMsg || 'Authentication failed. Please try again.';
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    if (popupInFlightRef.current) return false;
    popupInFlightRef.current = true;
    setAuthError(null);

    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setUser(cred.user);
      setIsAuthModalOpen(false);
      return true;
    } catch (error: any) {
      const code = String(error?.code || '');
      if (code !== 'auth/cancelled-popup-request') {
        console.error('Google Sign-In failed:', code, error?.message);
        setAuthError(translateAuthError(error));
      }
      return false;
    } finally {
      popupInFlightRef.current = false;
    }
  }, [translateAuthError]);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthError(null);
      const cleanEmail = email.trim();
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        setUser(cred.user);
        setIsAuthModalOpen(false);
        return true;
      } catch (error: any) {
        console.error('Email Sign-In failed:', error?.code, error?.message);
        setAuthError(translateAuthError(error));
        return false;
      }
    },
    [translateAuthError]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string): Promise<boolean> => {
      setAuthError(null);
      const cleanEmail = email.trim();
      const cleanName = displayName?.trim() || cleanEmail.split('@')[0];
      try {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (cleanName) {
          await updateProfile(userCred.user, {
            displayName: cleanName,
          });
        }
        await syncUserProfileDocument(userCred.user, cleanName);
        syncedUidRef.current = userCred.user.uid;
        setUser(auth.currentUser);
        setIsAuthModalOpen(false);
        return true;
      } catch (error: any) {
        console.error('Email Registration failed:', error?.code, error?.message);
        setAuthError(translateAuthError(error));
        return false;
      }
    },
    [translateAuthError]
  );

  const resetPassword = useCallback(
    async (email: string): Promise<boolean> => {
      setAuthError(null);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        return true;
      } catch (error: any) {
        console.error('Password reset failed:', error?.code, error?.message);
        setAuthError(translateAuthError(error));
        return false;
      }
    },
    [translateAuthError]
  );

  const signOut = useCallback(async () => {
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
      syncedUidRef.current = null;
      setUser(null);
    } catch (error: any) {
      console.error('Sign-out failed:', error);
      setAuthError('Failed to sign out cleanly. Please refresh and try again.');
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        clearAuthError,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
