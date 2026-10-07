import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { HttpError } from '../utils/httpError';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'not_found', message: 'Rota não encontrada.' } });
}

// Express reconhece o handler de erro pelos 4 parâmetros
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? 'Dados inválidos.';
    res.status(400).json({ error: { code: 'invalid_request', message } });
    return;
  }
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: { code: 'invalid_json', message: 'Corpo da requisição inválido.' } });
    return;
  }
  console.error('[api] erro não tratado', error);
  res.status(500).json({ error: { code: 'internal', message: 'Erro interno. Tente de novo em instantes.' } });
}
