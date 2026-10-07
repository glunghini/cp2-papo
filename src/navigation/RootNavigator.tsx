import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { colors, spacing } from '../theme';
import type { AppStackParamList, AuthStackParamList } from '../types/navigation';
import { flushPendingNavigation, navigationRef } from './navigationRef';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.ink,
    border: colors.line,
  },
};

const screenOptions: NativeStackNavigationOptions = {
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.ink, fontWeight: '600' },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: true, title: 'Criar conta' }}
      />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={screenOptions}>
      <AppStack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversas' }} />
      <AppStack.Screen name="Users" component={UsersScreen} options={{ title: 'Nova conversa' }} />
      <AppStack.Screen name="GroupForm" component={GroupFormScreen} options={{ title: 'Novo grupo' }} />
      <AppStack.Screen name="Chat" component={ChatScreen} options={{ title: '' }} />
      <AppStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
      <AppStack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Integrantes' }} />
    </AppStack.Navigator>
  );
}

function MissingProfile() {
  const { signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  return (
    <View style={styles.missing}>
      <Text style={styles.missingTitle}>Não encontramos o seu perfil</Text>
      <Text style={styles.missingText}>
        O cadastro pode não ter sido concluído. Saia e entre de novo, ou crie a conta outra vez.
      </Text>
      <PrimaryButton
        label="Sair"
        loading={leaving}
        onPress={() => {
          setLeaving(true);
          signOut().finally(() => setLeaving(false));
        }}
      />
    </View>
  );
}

export function RootNavigator() {
  const { status, isRegistering } = useAuth();

  if (status === 'loading' && !isRegistering) {
    return <Loading label="Carregando" />;
  }

  // Durante o cadastro a tela de registro continua montada para exibir erros
  let content = <AuthNavigator />;
  if (!isRegistering && status === 'signed-in') content = <AppNavigator />;
  if (!isRegistering && status === 'missing-profile') content = <MissingProfile />;

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={flushPendingNavigation}
      onStateChange={flushPendingNavigation}
    >
      {content}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  missingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  missingText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
  },
});
