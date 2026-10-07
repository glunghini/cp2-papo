import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';

import { firestore } from './firebaseAdmin';

// Se um processamento travou (queda do servidor, por exemplo), libera depois desse tempo
const STALE_AFTER_MS = 2 * 60 * 1000;

type LockResult = { acquired: boolean; ref: DocumentReference };

/**
 * Garante que cada mensagem gere push uma única vez. A transação do Firestore
 * serializa requisições repetidas: só a primeira encontra o documento livre.
 */
export async function acquireDispatchLock(
  conversationId: string,
  messageId: string,
  requestedBy: string,
): Promise<LockResult> {
  const ref = firestore.collection('notificationDispatches').doc(`${conversationId}__${messageId}`);

  const acquired = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) {
      const status: unknown = snapshot.get('status');
      const startedAt: unknown = snapshot.get('startedAt');
      const stale =
        status === 'processing' && typeof startedAt === 'number' && Date.now() - startedAt > STALE_AFTER_MS;
      if (status !== 'failed' && !stale) return false;
    }
    transaction.set(
      ref,
      {
        conversationId,
        messageId,
        requestedBy,
        status: 'processing',
        startedAt: Date.now(),
        attempts: FieldValue.increment(1),
      },
      { merge: true },
    );
    return true;
  });

  return { acquired, ref };
}

type DispatchSummary = {
  status: 'sent' | 'skipped';
  recipients: number;
  devices: number;
  delivered: number;
};

export async function completeDispatch(ref: DocumentReference, summary: DispatchSummary): Promise<void> {
  await ref.set({ ...summary, finishedAt: Date.now() }, { merge: true });
}

export async function failDispatch(ref: DocumentReference, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'erro desconhecido';
  await ref.set({ status: 'failed', error: message.slice(0, 300), finishedAt: Date.now() }, { merge: true });
}
