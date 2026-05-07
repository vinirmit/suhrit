import { AuthProvider } from './auth';
import { AppRouter } from './router';
import { NotificationProvider } from '../hooks/useNotification';

export function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </NotificationProvider>
  );
}

