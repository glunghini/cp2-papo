function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Variável de ambiente ${name} não configurada.`);
  }
  return value.trim();
}

function optional(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : null;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  firebaseProjectId: required('FIREBASE_PROJECT_ID'),
  firebaseClientEmail: required('FIREBASE_CLIENT_EMAIL'),
  // A chave costuma ser colada com "\n" literais no painel da hospedagem
  firebasePrivateKey: required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  firebaseDatabaseUrl: required('FIREBASE_DATABASE_URL'),
  expoAccessToken: optional('EXPO_ACCESS_TOKEN'),
} as const;
