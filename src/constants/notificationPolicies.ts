import type { NotificationPolicy } from '../types/group';

type PolicyOption = {
  value: NotificationPolicy;
  label: string;
  description: string;
};

export const NOTIFICATION_POLICY_OPTIONS: readonly PolicyOption[] = [
  {
    value: 'all_group_messages',
    label: 'Todas as mensagens',
    description: 'Todos os integrantes recebem push de qualquer mensagem do grupo.',
  },
  {
    value: 'mentioned_members',
    label: 'Só quem for mencionado',
    description: 'Apenas integrantes mencionados ou escolhidos como destinatário recebem push.',
  },
  {
    value: 'direct_messages_only',
    label: 'Só conversas individuais',
    description: 'Mensagens deste grupo não geram push. Conversas individuais continuam notificando.',
  },
  {
    value: 'disabled',
    label: 'Desativadas',
    description: 'Nenhuma mensagem deste grupo gera push.',
  },
];

export function getPolicyLabel(policy: NotificationPolicy): string {
  return NOTIFICATION_POLICY_OPTIONS.find((option) => option.value === policy)?.label ?? policy;
}
