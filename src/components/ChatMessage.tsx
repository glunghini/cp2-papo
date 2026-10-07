import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { ChatMessage } from '../types/chat';
import { formatMessageTime } from '../utils/format';

type Props = {
  message: ChatMessage;
  currentUid: string;
  isOwn: boolean;
  authorName: string | null;
  pending: boolean;
  resolveName: (uid: string) => string;
};

function describeAudience(message: ChatMessage, currentUid: string, resolveName: (uid: string) => string) {
  if (message.target.type === 'member') {
    const { memberId } = message.target;
    return memberId === currentUid ? 'Para você' : `Para ${resolveName(memberId)}`;
  }
  if (message.mentionedUserIds.length > 0) {
    const names = message.mentionedUserIds.map((uid) => (uid === currentUid ? 'você' : resolveName(uid)));
    return `Menciona ${names.join(', ')}`;
  }
  return null;
}

function ChatMessageItemBase({ message, currentUid, isOwn, authorName, pending, resolveName }: Props) {
  const audience = describeAudience(message, currentUid, resolveName);
  const mentionsMe =
    !isOwn &&
    (message.mentionedUserIds.includes(currentUid) ||
      (message.target.type === 'member' && message.target.memberId === currentUid));

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          mentionsMe && styles.bubbleMention,
        ]}
      >
        {authorName ? <Text style={styles.author}>{authorName}</Text> : null}
        {audience ? (
          <Text style={[styles.audience, isOwn ? styles.metaOwn : styles.audienceOther]}>{audience}</Text>
        ) : null}
        <Text style={[styles.text, isOwn && styles.textOwn]}>{message.text}</Text>
        <Text style={[styles.meta, isOwn ? styles.metaOwn : styles.metaOther]}>
          {pending ? 'Enviando' : formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export const ChatMessageItem = memo(ChatMessageItemBase);

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    marginVertical: 3,
    flexDirection: 'row',
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 6,
    borderRadius: radius.lg,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleMention: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  author: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  audience: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  audienceOther: {
    color: colors.inkMuted,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  textOwn: {
    color: colors.onPrimary,
  },
  meta: {
    marginTop: 2,
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  metaOwn: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  metaOther: {
    color: colors.inkSoft,
  },
});
