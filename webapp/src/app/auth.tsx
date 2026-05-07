import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  clearSession,
  completeLoginIfNeeded,
  fetchAuthenticatedUser,
  getCachedUser,
  getStoredAccessToken,
  login,
  logout,
} from '../services/auth';
import type { AuthenticatedUser } from '../types/domain';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signIn: () => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(getCachedUser());
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const hasStartedRefresh = useRef(false);

  const refreshUser = async () => {
    try {
      setAuthError(null);
      await completeLoginIfNeeded();

      if (!getStoredAccessToken()) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const nextUser = await fetchAuthenticatedUser();
      setUser(nextUser);
    } catch {
      clearSession();
      setUser(null);
      setAuthError('Unable to verify user access. Please try signing in again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasStartedRefresh.current) {
      return;
    }

    hasStartedRefresh.current = true;
    void refreshUser();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && getStoredAccessToken()),
      isLoading,
      authError,
      clearAuthError: () => setAuthError(null),
      signIn: login,
      signOut: () => {
        void logout();
      },
      refreshUser,
    }),
    [authError, isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
