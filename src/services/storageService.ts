import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from './firebase';

// fetch(uri).blob() falha em algumas versões do React Native com arquivos locais,
// por isso a leitura do arquivo é feita com XMLHttpRequest.
function readFileAsBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onload = () => resolve(request.response as Blob);
    request.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    request.responseType = 'blob';
    request.open('GET', uri, true);
    request.send(null);
  });
}

async function uploadImage(path: string, localUri: string): Promise<string> {
  const blob = await readFileAsBlob(localUri);
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(fileRef);
}

// Nome com timestamp para não reaproveitar imagem antiga em cache
export function uploadProfilePhoto(uid: string, localUri: string): Promise<string> {
  return uploadImage(`users/${uid}/avatar_${Date.now()}.jpg`, localUri);
}

export function uploadGroupPhoto(groupId: string, localUri: string): Promise<string> {
  return uploadImage(`groups/${groupId}/photo_${Date.now()}.jpg`, localUri);
}
