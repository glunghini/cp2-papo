export const MIN_GROUP_MEMBERS = 2;
export const MAX_GROUP_LIMIT = 50;
export const MAX_GROUP_NAME = 60;

export function parseMemberLimit(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function getAvailableSlots(memberLimit: number, memberCount: number): number {
  return Math.max(memberLimit - memberCount, 0);
}

export function validateGroupName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Dê um nome ao grupo.';
  if (trimmed.length > MAX_GROUP_NAME) return `O nome pode ter até ${MAX_GROUP_NAME} caracteres.`;
  return null;
}

export function validateMemberLimit(rawLimit: string, memberCount: number): string | null {
  const limit = parseMemberLimit(rawLimit);
  if (limit === null) return 'O limite precisa ser um número inteiro.';
  if (limit < MIN_GROUP_MEMBERS) return `O limite mínimo é ${MIN_GROUP_MEMBERS} integrantes.`;
  if (limit > MAX_GROUP_LIMIT) return `O limite máximo é ${MAX_GROUP_LIMIT} integrantes.`;
  if (limit < memberCount) {
    return `O grupo já tem ${memberCount} integrantes. O limite não pode ficar abaixo disso.`;
  }
  return null;
}

export function validateMemberCount(memberCount: number): string | null {
  if (memberCount < MIN_GROUP_MEMBERS) return 'Escolha pelo menos uma pessoa além de você.';
  return null;
}

export function formatSlots(memberLimit: number, memberCount: number): string {
  const available = getAvailableSlots(memberLimit, memberCount);
  if (available === 0) return `${memberCount} de ${memberLimit} integrantes. Grupo cheio.`;
  const slots = available === 1 ? '1 vaga disponível' : `${available} vagas disponíveis`;
  return `${memberCount} de ${memberLimit} integrantes. ${slots}.`;
}
