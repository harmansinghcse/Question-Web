import { useEffect, useState } from "react";
import { fetchApi } from "../services/api";

export interface DepartmentOption {
    deptId: number;
    deptName: string;
}

export interface SubjectOption {
    subjectKey: number;
    subjectId: string;
    deptId: number;
    subjectName: string;
}

export interface ChapterOption {
    chapterId: number;
    chapterNo: number;
    chapterName: string;
    subjectKey: number | null;
}

export interface TopicOption {
    topicId: number;
    topicName: string;
    chapterId: number;
}

interface Settled<T> {
    path: string | null;
    attempt: number;
    data?: T[];
    error?: string;
}

/**
 * Fetches a list from the API. Passing `null` disables the request.
 * Loading state is derived (not set synchronously inside the effect), so
 * switching paths immediately reports `loading` with no stale data.
 */
export function useApiList<T>(path: string | null) {
    const [result, setResult] = useState<Settled<T>>({
        path: null,
        attempt: 0,
    });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!path) return;
        let cancelled = false;

        fetchApi<T[]>(path)
            .then((data) => {
                if (!cancelled)
                    setResult({
                        path,
                        attempt,
                        data: Array.isArray(data) ? data : [],
                    });
            })
            .catch((error: unknown) => {
                if (!cancelled)
                    setResult({
                        path,
                        attempt,
                        error:
                            error instanceof Error
                                ? error.message
                                : "Request failed",
                    });
            });

        return () => {
            cancelled = true;
        };
    }, [path, attempt]);

    const settled =
        path !== null && result.path === path && result.attempt === attempt;

    return {
        loading: path !== null && !settled,
        error: settled ? result.error : undefined,
        data: settled && result.data ? result.data : ([] as T[]),
        retry: () => setAttempt((a) => a + 1),
    };
}
