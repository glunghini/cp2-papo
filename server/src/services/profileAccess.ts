import { HttpError } from '../utils/httpError';
import { buildDirectConversationId } from '../utils/ids';
import { readNumber, readString, toStringList } from '../utils/read';
import { firestore } from './firebaseAdmin';

export type ProfileResponse = {
  uid: string;
  name: string;
  photoUrl: string;
  createdAt: number;
  email: string;
  phoneNumber: string;
  birthDate: string;
};

async function shareConversation(viewerUid: string, targetUid: string): Promise<boolean> {
  const direct = await firestore
    .collection('directConversations')
    .doc(buildDirectConversationId(viewerUid, targetUid))
    .get();
  if (direct.exists) return true;

  const groups = await firestore.collection('groups').where('memberIds', 'array-contains', viewerUid).get();
  return groups.docs.some((doc) => toStringList(doc.get('memberIds')).includes(targetUid));
}

/**
 * Dados cadastrais só para quem divide uma conversa individual ou um grupo.
 * As regras do Firestore não conseguem fazer essa consulta, por isso ela fica aqui.
 */
export async function getSharedProfile(viewerUid: string, targetUid: string): Promise<ProfileResponse> {
  if (viewerUid !== targetUid && !(await shareConversation(viewerUid, targetUid))) {
    throw new HttpError(
      403,
      'profile_forbidden',
      'Você só pode ver o perfil de quem tem uma conversa ou um grupo em comum com você.',
    );
  }

  const userRef = firestore.collection('users').doc(targetUid);
  const [publicSnap, privateSnap] = await Promise.all([
    userRef.get(),
    userRef.collection('private').doc('profile').get(),
  ]);
  if (!publicSnap.exists) throw new HttpError(404, 'user_not_found', 'Perfil não encontrado.');

  return {
    uid: targetUid,
    name: readString(publicSnap.get('name'), 'Usuário'),
    photoUrl: readString(publicSnap.get('photoUrl')),
    createdAt: readNumber(publicSnap.get('createdAt')),
    email: readString(privateSnap.get('email')),
    phoneNumber: readString(privateSnap.get('phoneNumber')),
    birthDate: readString(privateSnap.get('birthDate')),
  };
}
