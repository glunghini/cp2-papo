import { FirebaseError } from 'firebase/app';

/** Erro com mensagem já pronta para ser exibida ao usuário. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'O e-mail informado não é válido.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/missing-password': 'Informe a senha.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique a rede e tente de novo.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/user-token-expired': 'Sua sessão expirou. Entre novamente.',
  'auth/requires-recent-login': 'Por segurança, entre novamente para continuar.',
  'permission-denied': 'Você não tem permissão para fazer isso.',
  'unauthenticated': 'Sua sessão expirou. Entre novamente.',
  'unavailable': 'Serviço indisponível no momento. Verifique sua conexão.',
  'deadline-exceeded': 'A operação demorou demais. Tente de novo.',
  'not-found': 'Não encontramos o que você procurava.',
  'storage/unauthorized': 'Sem permissão para enviar esta imagem.',
  'storage/canceled': 'O envio da imagem foi cancelado.',
  'storage/retry-limit-exceeded': 'Não foi possível enviar a imagem. Verifique sua conexão.',
  'storage/quota-exceeded': 'O armazenamento de imagens atingiu o limite do plano.',
};

export function isPermissionDenied(error: unknown): boolean {
  if (error instanceof FirebaseError) return error.code === 'permission-denied';
  return error instanceof Error && error.message.includes('PERMISSION_DENIED');
}

export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof AppError) return error.message;

  if (error instanceof FirebaseError) {
    return FIREBASE_MESSAGES[error.code] ?? fallback;
  }

  if (error instanceof Error) {
    // Erros do Realtime Database chegam como Error comum
    if (error.message.includes('PERMISSION_DENIED')) return FIREBASE_MESSAGES['permission-denied'];
    if (error.name === 'ApiError') return error.message;
    if (error.message === 'Network request failed') {
      return 'Sem conexão com a internet. Verifique a rede e tente de novo.';
    }
  }

  return fallback;
}
