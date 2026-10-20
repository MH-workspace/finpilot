import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase/config';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync user profile document
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocPath = `users/${currentUser.uid}`;
        try {
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            await setDoc(userDocRef, {
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'FinPilot User',
              photoURL: currentUser.photoURL || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            await setDoc(
              userDocRef,
              {
                updatedAt: new Date().toISOString(),
                displayName: currentUser.displayName || snap.data()?.displayName || 'FinPilot User',
                photoURL: currentUser.photoURL || snap.data()?.photoURL || '',
              },
              { merge: true }
            );
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, userDocPath);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearAuthError = () => setAuthError(null);

  const translateAuthError = (error: any): string => {
    const code = error?.code || '';
    switch (code) {
      case 'auth/popup-closed-by-user':
        return 'Sign-in window was closed before completing. Please try again.';
      case 'auth/popup-blocked':
        return 'The sign-in popup was blocked by your browser. Please allow popups or use email sign-in.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please verify your credentials.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please wait a few moments or reset your password.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet connectivity.';
      default:
        return error?.message || 'Authentication failed. Please try again.';
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthModalOpen(false);
      return true;
    } catch (error: any) {
      console.warn('Google Sign-in status:', error);
      if (error?.code !== 'auth/cancelled-popup-request') {
        setAuthError(translateAuthError(error));
      }
      return false;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setIsAuthModalOpen(false);
      return true;
    } catch (error: any) {
      console.warn('Email Sign-in error:', error);
      setAuthError(translateAuthError(error));
      return false;
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<boolean> => {
    setAuthError(null);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName?.trim()) {
        await updateProfile(userCred.user, {
          displayName: displayName.trim(),
        });
      }
      setIsAuthModalOpen(false);
      return true;
    } catch (error: any) {
      console.warn('Email Sign-up error:', error);
      setAuthError(translateAuthError(error));
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (error: any) {
      console.warn('Password reset error:', error);
      setAuthError(translateAuthError(error));
      return false;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setAuthError(null);
    } catch (error: any) {
      console.error('Sign-out error:', error);
      setAuthError('Failed to sign out cleanly.');
    }
  };

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
