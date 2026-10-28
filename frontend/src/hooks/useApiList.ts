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
    semester?: number;
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

export interface ExamOption {
    sourceId: number;
    examType: string;
    examYear: number;
    semesterNo: number;
    subjectKey: number;
    month?: string | null;
    subjectName?: string | null;
    subjectId?: string | null;
    deptId?: number | null;
    deptName?: string | null;
    label: string;
    questionCount?: number;
}

export interface BookOption {
    sourceId: number;
    bookName: string;
    authorName: string;
    label: string;
    questionCount?: number;
}

export interface SourceOption {
    sourceId: number;
    sourceType: "EXAM" | "BOOK";
    label: string;
    examType?: string | null;
    examYear?: number | null;
    semesterNo?: number | null;
    subjectKey?: number | null;
    subjectName?: string | null;
    subjectId?: string | null;
    month?: string | null;
    bookName?: string | null;
    authorName?: string | null;
    questionCount?: number;
}

export interface UpcomingExamOption {
    examId: number;
    deptId: number;
    subjectKey?: number | null;
    semester?: number | null;
    title: string;
    examDate: string;
    durationMinutes: number;
    venue?: string | null;
    instructions?: string | null;
    department?: { deptName: string };
    subject?: { subjectName: string; subjectId: string };
}

export interface TimetableOption {
    timetableId: number;
    deptId: number;
    semester: number;
    division: string;
    academicYear: string;
    isActive: boolean;
    department?: { deptName: string };
}

export interface TimetableEntryOption {
    entryId: number;
    timetableId: number;
    subjectKey: number;
    dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
    startTime: string;
    endTime: string;
    classroom?: string | null;
    teacher?: string | null;
    classType: "LECTURE" | "LAB" | "TUTORIAL" | "OTHER";
    subject?: { subjectName: string; subjectId: string };
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
