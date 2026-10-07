import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import type { LoginInput, RegisterInput, RegisterResult } from '../types/user';
import { brDateToIso, maskPhone } from '../utils/validation';
import { auth } from './firebase';
import { clearDeliveredNotifications, unregisterDevice } from './notificationService';
import { uploadProfilePhoto } from './storageService';
import { createUserProfile } from './userService';

export function observeSession(onChange: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, onChange);
}

export async function login({ email, password }: LoginInput): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const { user } = credential;

  try {
    let photoUrl = '';
    let photoUploadFailed = false;

    if (input.photoUri) {
      try {
        photoUrl = await uploadProfilePhoto(user.uid, input.photoUri);
      } catch {
        // A conta continua válida sem foto; o usuário pode trocar depois pelo perfil
        photoUploadFailed = true;
      }
    }

    await createUserProfile(user.uid, {
      name: input.name.trim(),
      photoUrl,
      email: user.email ?? input.email.trim().toLowerCase(),
      phoneNumber: maskPhone(input.phoneNumber),
      birthDate: brDateToIso(input.birthDate) ?? '',
    });

    return { photoUploadFailed };
  } catch (error) {
    // Sem perfil no Firestore a conta fica inutilizável, então desfazemos o cadastro
    await deleteUser(user).catch(() => undefined);
    throw error;
  }
}

export async function logout(uid: string | null): Promise<void> {
  if (uid) {
    await unregisterDevice(uid).catch(() => undefined);
  }
  await clearDeliveredNotifications().catch(() => undefined);
  await signOut(auth);
}
