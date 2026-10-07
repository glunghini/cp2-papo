// Leitura defensiva de dados vindos do Firebase. Tudo entra como unknown
// e só sai daqui com o tipo conferido.

export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readString(data: UnknownRecord, key: string, fallback = ''): string {
  const value = data[key];
  return typeof value === 'string' ? value : fallback;
}

export function readNumber(data: UnknownRecord, key: string, fallback = 0): number {
  const value = data[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** O Realtime Database pode devolver listas como array ou como objeto {0: ..., 1: ...}. */
export function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (isRecord(value)) {
    return Object.values(value).filter((item): item is string => typeof item === 'string');
  }
  return [];
}
