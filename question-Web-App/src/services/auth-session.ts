import { tokenStorage } from './token-storage';
import { authApi, AuthResponse, User } from './auth-api';

let memoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

type AuthListener = (user: User | null) => void;
const listeners = new Set<AuthListener>();

export const authSession = {
  /**
   * Returns current short-lived access token held in memory.
   */
  getAccessToken(): string | null {
    return memoryAccessToken;
  },

  /**
   * Sets in-memory access token.
   */
  setAccessToken(token: string | null): void {
    memoryAccessToken = token;
  },

  /**
   * Subscribes to authentication state changes (e.g. from background refresh or session expiry).
   */
  subscribe(listener: AuthListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Notifies all subscribers of user state changes.
   */
  notify(user: User | null): void {
    listeners.forEach((listener) => {
      try {
        listener(user);
      } catch {
        console.error('[authSession] Listener error:');
      }
    });
  },

  /**
   * Refreshes access token and rotates refresh token.
   * Concurrency-safe: coalesces simultaneous requests to prevent race-condition rotation errors.
   */
  async refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) {
      return await refreshPromise;
    }

    refreshPromise = (async () => {
      const storedToken = await tokenStorage.getRefreshToken();
      if (!storedToken) {
        memoryAccessToken = null;
        return null;
      }

      try {
        const response: AuthResponse = await authApi.refresh(storedToken);
        memoryAccessToken = response.accessToken;
        await tokenStorage.saveRefreshToken(response.refreshToken);
        authSession.notify(response.user);
        return response.accessToken;
      } catch {
        // If refresh fails (revoked, expired, invalid, or disabled account), clear local state
        memoryAccessToken = null;
        await tokenStorage.clearRefreshToken();
        authSession.notify(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return await refreshPromise;
  },

  /**
   * Clears in-memory credentials and local secure storage.
   */
  async clearSession(): Promise<void> {
    memoryAccessToken = null;
    await tokenStorage.clearRefreshToken();
    authSession.notify(null);
  },
};
