/**
 * Centralised API client for the Question Web NestJS backend.
 *
 * Base URL is read from EXPO_PUBLIC_API_URL (must include the "/api" prefix).
 *
 * Examples:
 *   Web / iOS simulator:   http://localhost:3000/api
 *   Android emulator:      http://10.0.2.2:3000/api
 *   Physical device:       http://<COMPUTER_LAN_IP>:3000/api
 *
 * Credentials, Aiven connection strings, and CA certificates are NEVER
 * included here — they live only in the backend's environment.
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
    console.warn('[api] EXPO_PUBLIC_API_URL is not configured');
}

// ─── Generic request helper ───────────────────────────────────────────────────

async function request<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    if (!API_BASE_URL) {
        throw new Error('Backend API URL is not configured. Set EXPO_PUBLIC_API_URL in your .env file.');
    }

    let response: Response;

    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
    } catch (networkError: unknown) {
        const message =
            networkError instanceof Error
                ? networkError.message
                : 'Network request failed';
        throw new Error(`Network error: ${message}`);
    }

    if (!response.ok) {
        let errorMessage: string;
        try {
            errorMessage = await response.text();
        } catch {
            errorMessage = `HTTP ${response.status}`;
        }
        throw new Error(errorMessage || `API error: ${response.status}`);
    }

    try {
        return response.json() as Promise<T>;
    } catch {
        throw new Error('Server returned an invalid JSON response');
    }
}

// ─── Response types (matching verified backend entity shapes) ─────────────────

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
 * Questions API is NOT yet implemented on the backend.
 * This interface is defined for future integration only.
 * Do not fabricate data using this type.
 */
export interface Question {
    /** Will be assigned by the backend when the endpoint is implemented. */
    questionId: number;
    questionText: string;
    topicId: number;
    marks?: number;
    source?: string;
    year?: number;
}

// ─── API methods (only for verified endpoints) ────────────────────────────────

export const api = {
    // Subjects
    getSubjects: (search?: string): Promise<Subject[]> =>
        request<Subject[]>(
            `/subjects${search ? `?search=${encodeURIComponent(search)}` : ''}`,
        ),

    getSubject: (id: number): Promise<Subject> =>
        request<Subject>(`/subjects/${id}`),

    // Chapters — must filter by subjectKey on the backend
    getChapters: (subjectKey: number): Promise<Chapter[]> =>
        request<Chapter[]>(`/chapters?subjectKey=${subjectKey}`),

    getChapter: (id: number): Promise<Chapter> =>
        request<Chapter>(`/chapters/${id}`),

    // Topics — must filter by chapterId on the backend
    getTopics: (chapterId: number): Promise<Topic[]> =>
        request<Topic[]>(`/topics?chapterId=${chapterId}`),

    getTopic: (id: number): Promise<Topic> =>
        request<Topic>(`/topics/${id}`),

    // Questions — NOT YET IMPLEMENTED on the backend.
    // Calling this will throw at runtime until the endpoint exists.
    // getQuestions: (topicId: number): Promise<Question[]> =>
    //     request<Question[]>(`/questions?topicId=${topicId}`),
};
