import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'question_web_secure_refresh_token';

// In-memory fallback
let memoryRefreshToken: string | null = null;

function getWebStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export const tokenStorage = {
  /**
   * Stores the refresh token securely in device keystore/keychain (native)
   * or localStorage (web).
   */
  async saveRefreshToken(token: string): Promise<void> {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
        return;
      }
    } catch {
      // Fall through to web/memory
    }

    const webStorage = getWebStorage();
    if (webStorage) {
      try {
        webStorage.setItem(REFRESH_TOKEN_KEY, token);
      } catch {
        memoryRefreshToken = token;
      }
    } else {
      memoryRefreshToken = token;
    }
  },

  /**
   * Retrieves the stored refresh token from secure storage (native)
   * or localStorage (web).
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (token) return token;
      }
    } catch {
      // Fall through to web/memory
    }

    const webStorage = getWebStorage();
    if (webStorage) {
      try {
        const token = webStorage.getItem(REFRESH_TOKEN_KEY);
        if (token) return token;
      } catch {
        return memoryRefreshToken;
      }
    }

    return memoryRefreshToken;
  },

  /**
   * Completely removes the refresh token from secure storage (native)
   * or localStorage (web).
   */
  async clearRefreshToken(): Promise<void> {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    } catch {
      // Ignore
    }

    const webStorage = getWebStorage();
    if (webStorage) {
      try {
        webStorage.removeItem(REFRESH_TOKEN_KEY);
      } catch {
        // Ignore
      }
    }

    memoryRefreshToken = null;
  },
};
