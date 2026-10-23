export async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const url = endpoint.startsWith("/api")
        ? endpoint
        : `/api${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
        });

        if (!response.ok) {
            // NestJS errors look like { message: string | string[] }.
            const body = (await response.json().catch(() => null)) as {
                message?: string | string[];
            } | null;
            const detail = Array.isArray(body?.message)
                ? body.message.join("; ")
                : body?.message;
            throw new Error(
                `API Error: ${response.status} ${response.statusText}${
                    detail ? ` — ${detail}` : ""
                }`,
            );
        }

        // Safely handle empty responses (e.g., 204 No Content)
        if (
            response.status === 204 ||
            response.headers.get("content-length") === "0"
        ) {
            return {} as T;
        }

        const data = await response.json().catch(() => ({}));
        return data as T;
    } catch (error) {
        console.error("API Fetch failed:", error);
        throw error;
    }
}
