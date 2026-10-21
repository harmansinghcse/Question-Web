
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

if (!API_BASE_URL) {
    console.warn('[api] EXPO_PUBLIC_API_URL is not configured');
}

/** Pull a human-readable message out of a NestJS error body. */
function extractErrorMessage(body: string, status: number): string {
    if (body) {
        try {
            const parsed = JSON.parse(body) as { message?: unknown };
            const msg = parsed?.message;
            if (Array.isArray(msg)) return msg.join(', ');
            if (typeof msg === 'string' && msg.trim()) return msg;
        } catch {
            // Not JSON — fall through to raw text if it's short enough.
            if (body.length <= 200) return body;
        }
    }
    return `Server error (HTTP ${status})`;
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    if (!API_BASE_URL) {
        throw new Error(
            'Backend API URL is not configured. Set EXPO_PUBLIC_API_URL in your .env file.',
        );
    }

    const url = `${API_BASE_URL}${endpoint}`;

    // Abort after 15s so an unreachable host doesn't spin forever.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

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
        const aborted = err instanceof Error && err.name === 'AbortError';
        const message = aborted
            ? `Request timed out — is the backend reachable at ${API_BASE_URL}?`
            : err instanceof Error
              ? err.message
              : 'Network request failed';

        throw new Error(`Network error: ${message}`);
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        const body = await response.text().catch(() => '');

        console.error('[API ERROR]', {
            url,
            status: response.status,
            body,
        });

        throw new Error(extractErrorMessage(body, response.status));
    }

    if (response.status === 204) {
        return undefined as T;
    }

    try {
        return (await response.json()) as T;
    } catch {
        throw new Error(`Server returned invalid JSON for ${endpoint}`);
    }
}

export interface Subject {
    subjectKey: number;
    subjectId: string;
    deptId: number;
    subjectName: string | null;
    credits: number;
    semester: number;
}

export interface Chapter {
    chapterId: number;
    chapterNo: number;
    chapterName: string;
    subjectKey: number | null;
}

export interface Topic {
    topicId: number;
    topicName: string;
    chapterId: number;
}

/**
 * Reserved for the future questions endpoint.
 * The backend questions API is not implemented yet.
 */
export interface Question {
    questionId: number;
    questionText: string;
    topicId: number;
    marks?: number;
    source?: string;
    year?: number;
}

export const api = {
    getSubjects: (search?: string): Promise<Subject[]> =>
        request<Subject[]>(
            `/subjects${
                search ? `?search=${encodeURIComponent(search)}` : ''
            }`,
        ),

    getSubject: (id: number): Promise<Subject> =>
        request<Subject>(`/subjects/${id}`),

    getChapters: (subjectKey: number): Promise<Chapter[]> =>
        request<Chapter[]>(`/chapters?subjectKey=${subjectKey}`),

    getChapter: (id: number): Promise<Chapter> =>
        request<Chapter>(`/chapters/${id}`),

    getTopics: (chapterId: number): Promise<Topic[]> =>
        request<Topic[]>(`/topics?chapterId=${chapterId}`),

    getTopic: (id: number): Promise<Topic> =>
        request<Topic>(`/topics/${id}`),
};
