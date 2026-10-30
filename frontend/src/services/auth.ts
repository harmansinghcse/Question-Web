import { useEffect, useSyncExternalStore } from "react";

export interface WebUser {
    userId: number;
    email: string;
    displayName: string;
    role: "STUDENT" | "ADMIN";
    accountStatus: string;
    createdAt: string;
    updatedAt: string;
}

interface AuthResponsePayload {
    accessToken: string;
    refreshToken: string;
    user: WebUser;
}

export interface WebAuthSnapshot {
    user: WebUser | null;
    isAuthenticated: boolean;
    isRestoring: boolean;
}

const REFRESH_STORAGE_KEY = "qw_web_refresh_token";
const USER_STORAGE_KEY = "qw_web_user";

let accessTokenMemory: string | null = null;
let refreshTokenMemory: string | null = readStorage(REFRESH_STORAGE_KEY);
let currentUser: WebUser | null = readStoredUser();
let restoring = Boolean(refreshTokenMemory || currentUser);
let restoreStarted = false;
let inFlightRefresh: Promise<string | null> | null = null;

let snapshotCache: WebAuthSnapshot = {
    user: currentUser,
    isAuthenticated: Boolean(currentUser && accessTokenMemory),
    isRestoring: restoring,
};

const listeners = new Set<() => void>();

function readStorage(key: string): string | null {
    try {
        return typeof window !== "undefined"
            ? window.localStorage.getItem(key)
            : null;
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: string | null): void {
    try {
        if (typeof window === "undefined") return;
        if (value === null) {
            window.localStorage.removeItem(key);
        } else {
            window.localStorage.setItem(key, value);
        }
    } catch {
        // Ignore storage quota / private-mode restrictions
    }
}

function readStoredUser(): WebUser | null {
    const raw = readStorage(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as WebUser;
    } catch {
        return null;
    }
}

function emitChange(): void {
    snapshotCache = {
        user: currentUser,
        isAuthenticated: Boolean(currentUser && accessTokenMemory),
        isRestoring: restoring,
    };
    for (const listener of listeners) {
        listener();
    }
}

function applyAuthSession(payload: AuthResponsePayload): void {
    accessTokenMemory = payload.accessToken;
    refreshTokenMemory = payload.refreshToken;
    currentUser = payload.user;
    restoring = false;
    writeStorage(REFRESH_STORAGE_KEY, payload.refreshToken);
    writeStorage(USER_STORAGE_KEY, JSON.stringify(payload.user));
    emitChange();
}

function clearAuthSession(): void {
    accessTokenMemory = null;
    refreshTokenMemory = null;
    currentUser = null;
    restoring = false;
    writeStorage(REFRESH_STORAGE_KEY, null);
    writeStorage(USER_STORAGE_KEY, null);
    emitChange();
}

async function parseErrorMessage(
    response: Response,
    fallback: string,
): Promise<string> {
    const body = (await response.json().catch(() => null)) as {
        message?: string | string[];
    } | null;
    if (Array.isArray(body?.message) && body.message.length > 0) {
        return body.message.join("; ");
    }
    if (typeof body?.message === "string" && body.message.trim().length > 0) {
        return body.message;
    }
    return `${fallback} (HTTP ${response.status})`;
}

export async function refreshWebAccessToken(): Promise<string | null> {
    if (inFlightRefresh) return inFlightRefresh;

    inFlightRefresh = (async () => {
        try {
            const response = await fetch("/api/auth/refresh", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    refreshTokenMemory
                        ? { refreshToken: refreshTokenMemory }
                        : {},
                ),
            });

            if (!response.ok) {
                clearAuthSession();
                return null;
            }

            const data = (await response.json()) as AuthResponsePayload;
            applyAuthSession(data);
            return data.accessToken;
        } catch {
            restoring = false;
            emitChange();
            return null;
        } finally {
            inFlightRefresh = null;
        }
    })();

    return inFlightRefresh;
}

export async function ensureWebSessionRestored(): Promise<void> {
    if (restoreStarted) return;
    restoreStarted = true;
    if (!refreshTokenMemory && !currentUser) {
        if (restoring) {
            restoring = false;
            emitChange();
        }
        return;
    }
    await refreshWebAccessToken();
}

export async function loginWebStudent(params: {
    email: string;
    password: string;
}): Promise<WebUser> {
    const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: params.email.trim(),
            password: params.password,
        }),
    });

    if (!response.ok) {
        throw new Error(
            await parseErrorMessage(response, "Unable to sign in"),
        );
    }

    const data = (await response.json()) as AuthResponsePayload;
    applyAuthSession(data);
    return data.user;
}

export async function registerAndLoginWebStudent(params: {
    email: string;
    password: string;
    displayName: string;
}): Promise<WebUser> {
    const regResponse = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: params.email.trim(),
            password: params.password,
            displayName: params.displayName.trim(),
        }),
    });

    if (!regResponse.ok) {
        throw new Error(
            await parseErrorMessage(regResponse, "Unable to create account"),
        );
    }

    return loginWebStudent({
        email: params.email,
        password: params.password,
    });
}

export async function logoutWebStudent(): Promise<void> {
    const tokenToRevoke = refreshTokenMemory;
    clearAuthSession();
    try {
        await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
                tokenToRevoke ? { refreshToken: tokenToRevoke } : {},
            ),
        });
    } catch {
        // Local session already cleared
    }
}

export async function fetchAuthApi<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const url = endpoint.startsWith("/api")
        ? endpoint
        : `/api${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    if (!accessTokenMemory && refreshTokenMemory) {
        await refreshWebAccessToken();
    }

    const doRequest = async (token: string | null): Promise<Response> => {
        const headers = new Headers(options.headers);
        if (!headers.has("Content-Type") && options.body) {
            headers.set("Content-Type", "application/json");
        }
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
        return fetch(url, {
            ...options,
            credentials: "include",
            headers,
        });
    };

    let response = await doRequest(accessTokenMemory);

    if (response.status === 401 && refreshTokenMemory) {
        const refreshed = await refreshWebAccessToken();
        if (refreshed) {
            response = await doRequest(refreshed);
        }
    }

    if (!response.ok) {
        throw new Error(
            await parseErrorMessage(response, "Request failed"),
        );
    }

    if (
        response.status === 204 ||
        response.headers.get("content-length") === "0"
    ) {
        return {} as T;
    }

    return (await response.json()) as T;
}

function subscribeAuth(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function getAuthSnapshot(): WebAuthSnapshot {
    return snapshotCache;
}

export function useWebAuth() {
    const snapshot = useSyncExternalStore(subscribeAuth, getAuthSnapshot);

    useEffect(() => {
        void ensureWebSessionRestored();
    }, []);

    return {
        ...snapshot,
        login: loginWebStudent,
        registerAndLogin: registerAndLoginWebStudent,
        logout: logoutWebStudent,
    };
}

