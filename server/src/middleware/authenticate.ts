import type { NextFunction, Request, Response } from 'express';

import { adminAuth } from '../services/firebaseAdmin';
import { HttpError } from '../utils/httpError';

/** Valida o ID token do Firebase Authentication enviado pelo app. */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'unauthenticated', 'Envie o token de autenticação.');
  }

  try {
    // checkRevoked = true: conta desativada ou sessão revogada deixa de funcionar na hora
    const decoded = await adminAuth.verifyIdToken(token, true);
    req.auth = { uid: decoded.uid };
  } catch {
    throw new HttpError(401, 'invalid_token', 'Sua sessão expirou. Entre novamente.');
  }
  next();
}

export function requireUid(req: Request): string {
  if (!req.auth) throw new HttpError(401, 'unauthenticated', 'Envie o token de autenticação.');
  return req.auth.uid;
}
