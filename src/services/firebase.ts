import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import clientConfig from '../../firebaseConfig.json';

const firebaseConfig: FirebaseOptions = clientConfig;

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createAuth(): Auth {
  try {
    // Persistência em AsyncStorage para recuperar a sessão ao reabrir o app
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Com fast refresh o módulo é reavaliado e o Auth já existe
    return getAuth(firebaseApp);
  }
}

export const auth = createAuth();
export const firestore = getFirestore(firebaseApp);
export const database = getDatabase(firebaseApp);
export const storage = getStorage(firebaseApp);
