import { AppError } from '../utils/errors';
import { isRecord } from '../utils/parse';
import { auth } from './firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';

// Hospedagens gratuitas podem levar alguns segundos para "acordar"
const DEFAULT_TIMEOUT_MS = 45_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: Record<string, unknown>;
  timeoutMs?: number;
};

function readApiError(body: unknown, status: number): ApiError {
  if (isRecord(body) && isRecord(body.error)) {
    const message = typeof body.error.message === 'string' ? body.error.message : null;
    const code = typeof body.error.code === 'string' ? body.error.code : 'unknown';
    if (message) return new ApiError(message, status, code);
  }
  if (status === 401) return new ApiError('Sua sessão expirou. Entre novamente.', status, 'unauthenticated');
  if (status === 403) return new ApiError('Você não tem permissão para fazer isso.', status, 'forbidden');
  return new ApiError('O servidor não conseguiu concluir a operação.', status, 'unknown');
}

export async function apiRequest(path: string, options: RequestOptions = {}): Promise<unknown> {
  if (!API_URL) {
    throw new AppError('O endereço da API não foi configurado (EXPO_PUBLIC_API_URL).');
  }

  const user = auth.currentUser;
  if (!user) {
    throw new AppError('Sua sessão expirou. Entre novamente.');
  }

  const token = await user.getIdToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('O servidor demorou para responder. Tente de novo em instantes.', 0, 'timeout');
    }
    throw new ApiError('Não foi possível falar com o servidor. Verifique sua conexão.', 0, 'network');
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw readApiError(body, response.status);
  }
  return body;
}
