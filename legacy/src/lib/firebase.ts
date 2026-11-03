/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Database ID specified in project config
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';

let firestoreInstance: Firestore;

try {
  // Initialize Firestore with multi-tab persistent local cache for high reliability offline
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, dbId);
} catch (e) {
  // Fallback to standard getFirestore if already initialized
  firestoreInstance = getFirestore(app, dbId);
}

export const db = firestoreInstance;
export const firebaseApp = app;
export const auth: Auth = getAuth(app);

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
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    isAnonymous?: boolean | null;
  };
}

/**
 * Standardized Firestore error handler conforming to zero-trust logging specifications
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
  };
  console.error('[FieldOps IT Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Ensures a valid Firebase Auth session exists so Firestore rules (request.auth != null) succeed.
 */
export async function ensureFirebaseAuthSession(): Promise<boolean> {
  if (auth.currentUser) return true;
  try {
    await signInAnonymously(auth);
    return true;
  } catch (err) {
    console.warn('[FieldOps IT Auth] Firebase Auth anonymous session fallback:', err);
    return false;
  }
}

// Automatically ensure auth session on client startup
if (typeof window !== 'undefined') {
  ensureFirebaseAuthSession();
}

// Connection self-test when client is online per Firestore guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connection self-test: Client is offline.');
      return false;
    }
    // Any other response (including document not found) confirms network path reached Firestore
    return true;
  }
}
