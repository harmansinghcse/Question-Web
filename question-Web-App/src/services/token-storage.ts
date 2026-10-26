import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'question_web_secure_refresh_token';

// In-memory fallback for environments where SecureStore is unavailable (e.g., web during dev)
let memoryRefreshToken: string | null = null;

export const tokenStorage = {
  /**
   * Stores the refresh token securely in device keystore/keychain.
   * Never stores tokens in ordinary AsyncStorage.
   */
  async saveRefreshToken(token: string): Promise<void> {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
      } else {
        memoryRefreshToken = token;
      }
    } catch (err) {
      console.warn('[tokenStorage] SecureStore unavailable, using memory store:', err);
      memoryRefreshToken = token;
    }
  },

  /**
   * Retrieves the stored refresh token from secure storage.
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      }
      return memoryRefreshToken;
    } catch (err) {
      console.warn('[tokenStorage] Failed to read refresh token:', err);
      return memoryRefreshToken;
    }
  },

  /**
   * Completely removes the refresh token from secure storage.
   */
  async clearRefreshToken(): Promise<void> {
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    } catch (err) {
      console.warn('[tokenStorage] Failed to clear refresh token:', err);
    } finally {
      memoryRefreshToken = null;
    }
  },
};
