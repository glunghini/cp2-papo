import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ConversationType } from './chat';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type UserPickerParams = {
  mode: 'select';
  groupId: string | null;
  selectedIds: string[];
  excludeIds: string[];
  maxSelectable: number | null;
};

export type AppStackParamList = {
  Conversations: undefined;
  Users: { mode: 'direct' } | UserPickerParams;
  GroupForm: { groupId?: string; pickedUserIds?: string[] } | undefined;
  Chat: { conversationId: string; conversationType: ConversationType };
  Profile: { uid: string };
  GroupMembers: { groupId: string };
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AuthStackParamList, AppStackParamList {}
  }
}
