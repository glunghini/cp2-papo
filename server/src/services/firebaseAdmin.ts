import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

import { env } from '../config/env';

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: env.firebasePrivateKey,
    }),
    databaseURL: env.firebaseDatabaseUrl,
  });

export const adminAuth = getAuth(app);
export const firestore = getFirestore(app);
export const database = getDatabase(app);
