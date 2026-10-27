import { fetchApi } from "./api";

export interface QuestionImageItem {
    imageId: number;
    imageUrl: string;
    displayOrder: number;
}

export interface QuestionTopicItem {
    topicId: number;
    topicName: string;
    chapterId: number;
}

export interface QuestionItem {
    quesId: number;
    quesText: string;
    quesType: string;
    sourceId: number;
    topics: QuestionTopicItem[];
    images: QuestionImageItem[];
    chapterId?: number | null;
    chapterName?: string | null;
    chapterNo?: number | null;
    subjectKey?: number | null;
    subjectName?: string | null;
    subjectId?: string | null;
    deptId?: number | null;
    deptName?: string | null;
    sourceType?: "EXAM" | "BOOK" | null;
    sourceLabel?: string | null;
    semester?: number | null;
}

export interface QuestionFilters {
    deptId?: number | null;
    semester?: number | null;
    subjectKey?: number | null;
    chapterId?: number | null;
    topicIds: number[];
    quesType?: string;
    sourceType?: string;
    sourceId?: number | null;
    search?: string;
}

export const INITIAL_QUESTION_FILTERS: QuestionFilters = {
    deptId: null,
    semester: null,
    subjectKey: null,
    chapterId: null,
    topicIds: [],
    quesType: "ALL",
    sourceType: "ALL",
    sourceId: null,
    search: "",
};

/**
 * Fetches questions from the backend API using the provided academic hierarchy & filters.
 */
export async function fetchFilteredQuestions(
    filters: QuestionFilters,
): Promise<QuestionItem[]> {
    const params = new URLSearchParams();

    if (filters.deptId) params.set("deptId", String(filters.deptId));
    if (filters.semester) params.set("semester", String(filters.semester));
    if (filters.subjectKey) params.set("subjectKey", String(filters.subjectKey));
    if (filters.chapterId) params.set("chapterId", String(filters.chapterId));

    if (filters.topicIds && filters.topicIds.length > 0) {
        params.set("topicIds", filters.topicIds.join(","));
    }

    if (filters.quesType && filters.quesType !== "ALL") {
        params.set("quesType", filters.quesType);
    }

    if (filters.sourceType && filters.sourceType !== "ALL") {
        params.set("sourceType", filters.sourceType);
    }

    if (filters.sourceId) {
        params.set("sourceId", String(filters.sourceId));
    }

    if (filters.search && filters.search.trim()) {
        params.set("search", filters.search.trim());
    }

    const query = params.toString();
    const endpoint = query ? `/api/questions?${query}` : "/api/questions";

    return fetchApi<QuestionItem[]>(endpoint);
}
