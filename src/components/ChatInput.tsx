import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MESSAGE_MAX_LENGTH } from '../services/chatService';
import { colors, radius, spacing } from '../theme';
import type { MessageTarget, OutgoingMessage } from '../types/chat';
import type { PublicUser } from '../types/user';
import { firstName } from '../utils/format';
import { UserItem } from './UserItem';

type Props = {
  /** Integrantes que podem ser mencionados. Vazio em conversas individuais. */
  mentionableMembers: PublicUser[];
  onSend: (message: OutgoingMessage) => void;
  disabled?: boolean;
  disabledReason?: string;
};

export function ChatInput({ mentionableMembers, onSend, disabled = false, disabledReason }: Props) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const membersById = useMemo(
    () => new Map(mentionableMembers.map((member) => [member.uid, member])),
    [mentionableMembers],
  );

  // Uma menção só vale enquanto o "@Nome" continuar no texto
  const activeMentions = useMemo(
    () =>
      mentions.filter((uid) => {
        const member = membersById.get(uid);
        return member ? text.includes(`@${firstName(member.name)}`) : false;
      }),
    [mentions, membersById, text],
  );

  const canMention = mentionableMembers.length > 0;
  const canSend = !disabled && text.trim().length > 0;

  const toggleMention = (member: PublicUser) => {
    if (mentions.includes(member.uid)) {
      setMentions((current) => current.filter((uid) => uid !== member.uid));
      return;
    }
    setMentions((current) => [...current, member.uid]);
    setText((current) => {
      const separator = current.length === 0 || current.endsWith(' ') ? '' : ' ';
      return `${current}${separator}@${firstName(member.name)} `;
    });
  };

  const handleSend = () => {
    if (!canSend) return;
    const [onlyMention] = activeMentions;
    const target: MessageTarget =
      activeMentions.length === 1 && onlyMention ? { type: 'member', memberId: onlyMention } : { type: 'conversation' };
    onSend({ text: text.trim(), mentionedUserIds: activeMentions, target });
    setText('');
    setMentions([]);
  };

  const audienceLabel = useMemo(() => {
    if (activeMentions.length === 0) return null;
    const names = activeMentions.map((uid) => membersById.get(uid)?.name ?? 'integrante');
    return activeMentions.length === 1 ? `Para ${names[0]}` : `Menciona ${names.join(', ')}`;
  }, [activeMentions, membersById]);

  if (disabled && disabledReason) {
    return (
      <View style={[styles.disabledBox, { paddingBottom: spacing.md + insets.bottom }]}>
        <Text style={styles.disabledText}>{disabledReason}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: spacing.sm + insets.bottom }]}>
      {audienceLabel ? (
        <View style={styles.audienceRow}>
          <Text style={styles.audienceText} numberOfLines={1}>
            {audienceLabel}
          </Text>
          <Pressable onPress={() => setMentions([])} hitSlop={8} accessibilityRole="button">
            <Text style={styles.audienceClear}>Limpar</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        {canMention ? (
          <Pressable
            onPress={() => setPickerOpen(true)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Mencionar integrante"
            style={({ pressed }) => [styles.mentionButton, pressed && styles.pressed]}
          >
            <Text style={styles.mentionLabel}>@</Text>
          </Pressable>
        ) : null}

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Mensagem"
          placeholderTextColor={colors.inkSoft}
          multiline
          maxLength={MESSAGE_MAX_LENGTH}
          editable={!disabled}
          style={styles.input}
          accessibilityLabel="Campo de mensagem"
        />

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          style={({ pressed }) => [styles.sendButton, !canSend && styles.sendDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.sendLabel}>Enviar</Text>
        </Pressable>
      </View>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)} accessibilityLabel="Fechar" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.sheetTitle}>Mencionar no grupo</Text>
          <Text style={styles.sheetHint}>
            Com uma pessoa marcada a mensagem fica direcionada a ela. Ela continua visível para o grupo.
          </Text>
          <FlatList
            data={mentionableMembers}
            keyExtractor={(member) => member.uid}
            renderItem={({ item }) => (
              <UserItem
                user={item}
                selectable
                selected={mentions.includes(item.uid)}
                onPress={() => toggleMention(item)}
              />
            )}
            style={styles.sheetList}
          />
          <Pressable onPress={() => setPickerOpen(false)} style={styles.sheetDone} accessibilityRole="button">
            <Text style={styles.sheetDoneLabel}>Pronto</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs + 2,
    gap: spacing.md,
  },
  audienceText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  audienceClear: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  mentionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  mentionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    fontSize: 16,
    color: colors.ink,
  },
  sendButton: {
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
  disabledBox: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  disabledText: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 37, 51, 0.35)',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.lg,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    paddingHorizontal: spacing.lg,
  },
  sheetHint: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkMuted,
  },
  sheetList: {
    flexGrow: 0,
  },
  sheetDone: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sheetDoneLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});
