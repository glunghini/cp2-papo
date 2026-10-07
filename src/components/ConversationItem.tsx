import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLastMessage } from '../hooks/useConversations';
import { colors, radius, spacing } from '../theme';
import type { ConversationListItem } from '../types/chat';
import type { PublicUser } from '../types/user';
import { formatListTime } from '../utils/format';
import { Avatar } from './Avatar';

type Props = {
  item: ConversationListItem;
  currentUid: string;
  otherUser: PublicUser | undefined;
  onPress: (item: ConversationListItem) => void;
  onActivity: (conversationId: string, timestamp: number) => void;
};

export function ConversationItem({ item, currentUid, otherUser, onPress, onActivity }: Props) {
  const { message, unavailable } = useLastMessage(item.id);

  useEffect(() => {
    if (message) onActivity(item.id, message.createdAt);
  }, [message, item.id, onActivity]);

  const isGroup = item.type === 'group';
  const title = isGroup ? item.group.name : otherUser?.name ?? 'Carregando';
  const photoUrl = isGroup ? item.group.photoUrl : otherUser?.photoUrl ?? null;

  let preview = 'Nenhuma mensagem ainda';
  if (unavailable) preview = 'Mensagens indisponíveis';
  if (message) preview = `${message.senderId === currentUid ? 'Você: ' : ''}${message.text}`;

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${isGroup ? 'Grupo' : 'Conversa com'} ${title}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar uri={photoUrl} size={50} variant={isGroup ? 'group' : 'user'} />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {message ? <Text style={styles.time}>{formatListTime(message.createdAt)}</Text> : null}
        </View>
        <View style={styles.footer}>
          {isGroup ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Grupo</Text>
            </View>
          ) : null}
          <Text style={[styles.preview, !message && styles.previewEmpty]} numberOfLines={1}>
            {preview}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  time: {
    fontSize: 12,
    color: colors.inkSoft,
  },
  footer: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  preview: {
    flex: 1,
    fontSize: 14,
    color: colors.inkMuted,
  },
  previewEmpty: {
    fontStyle: 'italic',
    color: colors.inkSoft,
  },
});
