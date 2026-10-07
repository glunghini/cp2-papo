export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return '';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatListTime(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  if (sameDay) return formatMessageTime(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Minúsculas e sem acento, para a busca por nome. */
export function normalizeText(value: string): string {
  const lower = value.toLowerCase();
  try {
    return lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return lower;
  }
}
