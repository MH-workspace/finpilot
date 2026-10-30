import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Singleton-safe Firebase App initialization
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Connect specifically to the provisioned FinPilot Firestore database
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Ensure session survives browser refreshes and tab restarts
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase Auth persistence warning:', err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Verify Firestore connectivity on startup
let connectionTested = false;
export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error(
        'Firestore client reported offline during startup check. Verify network connectivity and Firebase configuration.'
      );
    }
  }
}

void testFirestoreConnection();

/**
 * Sanitizes any client or imported document ID so it conforms to Firestore rule validation:
 * ^[a-zA-Z0-9_-]{1,128}$
 */
export function sanitizeFirestoreId(rawId: string, fallbackPrefix = 'item'): string {
  const cleaned = (rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  if (cleaned.length > 0) return cleaned;
  return `${fallbackPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

// Error handling types and helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errCode = (error as { code?: string })?.code;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    code: errCode,
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function getReadableFirestoreError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);

  try {
    const parsed = JSON.parse(rawMessage) as Partial<FirestoreErrorInfo>;
    if (parsed && typeof parsed.error === 'string') {
      const code = parsed.code || '';
      const lower = parsed.error.toLowerCase();
      if (code === 'permission-denied' || lower.includes('missing or insufficient permissions')) {
        if (!parsed.authInfo?.userId) {
          return 'Your cloud session is not active. Please sign in again to save or view your records.';
        }
        return 'Permission denied while accessing your cloud ledger. Please refresh or sign in again.';
      }
      if (code === 'unavailable' || lower.includes('offline') || lower.includes('network')) {
        return 'Unable to reach FinPilot Cloud right now. Please check your internet connection and try again.';
      }
      if (code === 'unauthenticated') {
        return 'Your authentication session expired. Please sign in again.';
      }
      return `Database operation failed: ${parsed.error}`;
    }
  } catch {
    // Not JSON-wrapped error
  }

  const lower = rawMessage.toLowerCase();
  if (lower.includes('missing or insufficient permissions') || lower.includes('permission-denied')) {
    return 'Permission denied while accessing your cloud ledger. Please verify you are signed in.';
  }
  if (lower.includes('offline') || lower.includes('unavailable') || lower.includes('network')) {
    return 'Network interruption while communicating with Firestore. Please check your connection and retry.';
  }
  return 'Could not complete the cloud database operation. Please try again.';
}
