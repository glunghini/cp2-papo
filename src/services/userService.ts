import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import type { ChatUser, PublicUser, UserPrivateData } from '../types/user';
import { isRecord, readNumber, readString, type UnknownRecord } from '../utils/parse';
import { apiRequest } from './apiClient';
import { firestore } from './firebase';
import { uploadProfilePhoto } from './storageService';

const usersCollection = collection(firestore, 'users');

export function parsePublicUser(snapshot: DocumentSnapshot): PublicUser | null {
  if (!snapshot.exists()) return null;
  const data: UnknownRecord = snapshot.data();
  return {
    uid: snapshot.id,
    name: readString(data, 'name', 'Usuário'),
    photoUrl: readString(data, 'photoUrl'),
    createdAt: readNumber(data, 'createdAt'),
  };
}

function parseChatUser(value: unknown): ChatUser | null {
  if (!isRecord(value) || typeof value.uid !== 'string') return null;
  return {
    uid: value.uid,
    name: readString(value, 'name', 'Usuário'),
    photoUrl: readString(value, 'photoUrl'),
    createdAt: readNumber(value, 'createdAt'),
    email: readString(value, 'email'),
    phoneNumber: readString(value, 'phoneNumber'),
    birthDate: readString(value, 'birthDate'),
  };
}

type NewProfile = Omit<PublicUser, 'uid' | 'createdAt'> & UserPrivateData;

export async function createUserProfile(uid: string, profile: NewProfile): Promise<void> {
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, 'users', uid), {
    uid,
    name: profile.name,
    photoUrl: profile.photoUrl,
    createdAt: Date.now(),
  });
  batch.set(doc(firestore, 'users', uid, 'private', 'profile'), {
    email: profile.email,
    phoneNumber: profile.phoneNumber,
    birthDate: profile.birthDate,
  });
  await batch.commit();
}

export function subscribeToPublicProfile(
  uid: string,
  onChange: (user: PublicUser | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firestore, 'users', uid),
    (snapshot) => onChange(parsePublicUser(snapshot)),
    onError,
  );
}

export function subscribeToUsers(
  onChange: (users: PublicUser[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const usersQuery = query(usersCollection, orderBy('name'), limit(300));
  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const users = snapshot.docs
        .map((item) => parsePublicUser(item))
        .filter((user): user is PublicUser => user !== null);
      onChange(users);
    },
    onError,
  );
}

const IN_QUERY_LIMIT = 30;

export async function getPublicProfiles(uids: string[]): Promise<PublicUser[]> {
  const unique = Array.from(new Set(uids)).filter((uid) => uid.length > 0);
  const chunks: string[][] = [];
  for (let index = 0; index < unique.length; index += IN_QUERY_LIMIT) {
    chunks.push(unique.slice(index, index + IN_QUERY_LIMIT));
  }
  const results = await Promise.all(
    chunks.map((chunk) => getDocs(query(usersCollection, where(documentId(), 'in', chunk)))),
  );
  return results
    .flatMap((snapshot) => snapshot.docs.map((item) => parsePublicUser(item)))
    .filter((user): user is PublicUser => user !== null);
}

/**
 * Dados cadastrais completos. O próprio usuário lê direto do Firestore;
 * para outras pessoas a API confere se há conversa ou grupo em comum.
 */
export async function getProfileDetails(uid: string, currentUid: string): Promise<ChatUser | null> {
  if (uid === currentUid) {
    const [publicSnap, privateSnap] = await Promise.all([
      getDoc(doc(firestore, 'users', uid)),
      getDoc(doc(firestore, 'users', uid, 'private', 'profile')),
    ]);
    const publicUser = parsePublicUser(publicSnap);
    if (!publicUser) return null;
    const privateData: UnknownRecord = privateSnap.exists() ? privateSnap.data() : {};
    return {
      ...publicUser,
      email: readString(privateData, 'email'),
      phoneNumber: readString(privateData, 'phoneNumber'),
      birthDate: readString(privateData, 'birthDate'),
    };
  }

  const response = await apiRequest(`/users/${encodeURIComponent(uid)}/profile`);
  return parseChatUser(response);
}

export async function updateOwnPhoto(uid: string, localUri: string): Promise<string> {
  const photoUrl = await uploadProfilePhoto(uid, localUri);
  await updateDoc(doc(firestore, 'users', uid), { photoUrl });
  return photoUrl;
}
