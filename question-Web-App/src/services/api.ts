
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

type RequestOptions = RequestInit & {
  token?: string;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      'Missing EXPO_PUBLIC_API_URL configuration.',
    );
  }

  const { token, headers, ...requestOptions } = options;

  const response = await fetch(
    `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`,
    {
      ...requestOptions,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Request failed (${response.status}): ${message}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
