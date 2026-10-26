import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  authApi,
  User,
  LoginPayload,
  RegisterPayload,
  AuthError,
} from '../services/auth-api';
import { tokenStorage } from '../services/token-storage';
import { authSession } from '../services/auth-session';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to background session updates (e.g. automatic refresh or revocation)
  useEffect(() => {
    const unsubscribe = authSession.subscribe((updatedUser) => {
      setUser(updatedUser);
    });
    return unsubscribe;
  }, []);

  // Initial session restoration
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedRefreshToken = await tokenStorage.getRefreshToken();
        if (!storedRefreshToken) {
          if (isMounted) setIsRestoring(false);
          return;
        }

        // Verify and rotate with the backend
        const response = await authApi.refresh(storedRefreshToken);
        if (isMounted) {
          authSession.setAccessToken(response.accessToken);
          await tokenStorage.saveRefreshToken(response.refreshToken);
          setUser(response.user);
        }
      } catch (err) {
        // If the refresh token is expired, revoked, or invalid, clear local storage
        console.warn('[AuthProvider] Failed to restore session:', err);
        await tokenStorage.clearRefreshToken();
        authSession.setAccessToken(null);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsRestoring(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (payload: LoginPayload) => {
    setError(null);
    try {
      const response = await authApi.login(payload);
      authSession.setAccessToken(response.accessToken);
      await tokenStorage.saveRefreshToken(response.refreshToken);
      setUser(response.user);
    } catch (err) {
      const message =
        err instanceof AuthError ? err.message : 'Unable to log in. Please try again.';
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setError(null);
    try {
      const newUser = await authApi.register(payload);
      return newUser;
    } catch (err) {
      const message =
        err instanceof AuthError
          ? err.message
          : 'Registration failed. Please try again.';
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    const storedToken = await tokenStorage.getRefreshToken();

    // Clear local credentials immediately regardless of network status
    await authSession.clearSession();
    setUser(null);

    // Attempt to notify backend to revoke the session
    if (storedToken) {
      try {
        await authApi.logout(storedToken);
      } catch (err) {
        console.warn('[AuthProvider] Remote logout notification failed:', err);
      }
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const newToken = await authSession.refreshAccessToken();
    return newToken !== null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isRestoring,
      error,
      login,
      register,
      logout,
      refreshSession,
      clearError,
    }),
    [user, isRestoring, error, login, register, logout, refreshSession, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
