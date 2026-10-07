const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Formata enquanto o usuário digita: (11) 98765-4321 */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

/** Formata enquanto o usuário digita: 31/12/2000 */
export function maskDate(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Converte DD/MM/AAAA para AAAA-MM-DD, ou null se a data não existir. */
export function brDateToIso(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(Date.UTC(year, month - 1, day));
  const exists =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return exists ? `${yyyy}-${mm}-${dd}` : null;
}

export function validateBirthDate(value: string): string | null {
  const iso = brDateToIso(value);
  if (!iso) return 'Use o formato DD/MM/AAAA com uma data válida.';
  const birth = new Date(`${iso}T00:00:00Z`);
  const now = new Date();
  if (birth.getTime() > now.getTime()) return 'A data de nascimento não pode estar no futuro.';
  if (now.getUTCFullYear() - birth.getUTCFullYear() > 120) return 'Confira o ano de nascimento.';
  return null;
}
