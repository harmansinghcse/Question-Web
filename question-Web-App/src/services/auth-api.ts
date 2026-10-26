const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

const TIMEOUT_MS = 20000;

if (!API_BASE_URL) {
  console.warn('[auth-api] EXPO_PUBLIC_API_URL is not configured');
}

export interface User {
  userId: number;
  email: string;
  displayName: string;
  role: 'STUDENT' | 'ADMIN';
  accountStatus: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function extractErrorMessage(body: string, status: number): string {
  if (body) {
    try {
      const parsed = JSON.parse(body) as { message?: unknown };
      const msg = parsed?.message;
      if (Array.isArray(msg)) return msg.join(', ');
      if (typeof msg === 'string' && msg.trim()) return msg;
    } catch {
      if (body.length <= 200) return body;
    }
  }

  switch (status) {
    case 400:
      return 'Invalid request details. Please check your inputs.';
    case 401:
      return 'Invalid email or password.';
    case 403:
      return 'Access forbidden.';
    case 409:
      return 'An account with this email already exists.';
    default:
      return `Server error (HTTP ${status})`;
  }
}

async function authRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      'Backend API URL is not configured. Set EXPO_PUBLIC_API_URL in your .env file.',
    );
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : '';
    const cancelled =
      (err instanceof Error && err.name === 'AbortError') ||
      /cancel|abort/i.test(raw);

    let message: string;
    if (cancelled && timedOut) {
      message = `Request timed out. Unable to reach backend at ${API_BASE_URL}`;
    } else if (cancelled) {
      message = 'Request was cancelled';
    } else {
      message = raw || 'Network request failed';
    }

    throw new AuthError(`Network error: ${message}`, 0);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const message = extractErrorMessage(body, response.status);
    throw new AuthError(message, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new AuthError(`Server returned invalid response from ${endpoint}`, response.status);
  }
}

export const authApi = {
  /**
   * Registers a new student account.
   */
  async register(payload: RegisterPayload): Promise<User> {
    return authRequest<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        displayName: payload.displayName.trim(),
      }),
    });
  },

  /**
   * Authenticates user and returns tokens and user profile.
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return authRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  /**
   * Refreshes access token and rotates refresh token.
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    return authRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  /**
   * Revokes refresh token session on logout.
   */
  async logout(refreshToken?: string): Promise<{ success: boolean; message: string }> {
    return authRequest<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
};
