import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { configureNotificationHandler } from './src/services/notificationService';

configureNotificationHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <RootNavigator />
        </NotificationProvider>
      </AuthProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
