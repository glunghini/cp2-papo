import { readString } from '../utils/read';
import { firestore } from './firebaseAdmin';

export type DeviceRecord = {
  uid: string;
  path: string;
  token: string;
};

export async function loadEnabledDevices(uids: string[]): Promise<DeviceRecord[]> {
  const unique = Array.from(new Set(uids));
  const results = await Promise.all(
    unique.map((uid) =>
      firestore.collection('users').doc(uid).collection('devices').where('enabled', '==', true).get(),
    ),
  );
  return results.flatMap((snapshot, index) =>
    snapshot.docs
      .map((doc) => ({ uid: unique[index] ?? '', path: doc.ref.path, token: readString(doc.get('token')) }))
      .filter((device) => device.uid !== '' && device.token !== ''),
  );
}

/** Tokens recusados pelo serviço de push deixam de ser usados. */
export async function disableDevices(paths: string[]): Promise<void> {
  const unique = Array.from(new Set(paths));
  if (unique.length === 0) return;
  const batch = firestore.batch();
  unique.forEach((path) => {
    batch.update(firestore.doc(path), { enabled: false, updatedAt: Date.now() });
  });
  await batch.commit();
  console.info(`[push] ${unique.length} token(s) inválido(s) desativado(s)`);
}
