import { authSession } from "./auth-session";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
/** Max time to wait for the backend before giving up. */
const TIMEOUT_MS = 20000;

if (!API_BASE_URL) {
    console.warn("[api] EXPO_PUBLIC_API_URL is not configured");
}

// --- HTTP layer ---

/** Pull a human-readable message out of a NestJS error body. */
function extractErrorMessage(body: string, status: number): string {
    if (body) {
        try {
            const parsed = JSON.parse(body) as { message?: unknown };
            const msg = parsed?.message;
            if (Array.isArray(msg)) return msg.join(", ");
            if (typeof msg === "string" && msg.trim()) return msg;
        } catch {
            // Not JSON - fall through to raw text if it's short enough.
            if (body.length <= 200) return body;
        }
    }
    return `Server error (HTTP ${status})`;
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false,
): Promise<T> {
    if (!API_BASE_URL) {
        throw new Error(
            "Backend API URL is not configured. Set EXPO_PUBLIC_API_URL in your .env file.",
        );
    }

    const url = `${API_BASE_URL}${endpoint}`;
    // Abort after TIMEOUT_MS so an unreachable host doesn't spin forever.
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, TIMEOUT_MS);

    const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    // Attach in-memory access token if available and not already specified
    const token = authSession.getAccessToken();
    if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
        response = await fetch(url, {
            ...options,
            signal: options.signal ?? controller.signal,
            headers,
        });
    } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : "";
        // Expo SDK 57 reports aborts as "Fetch request has been canceled"
        // instead of an error named AbortError, so check both.
        const cancelled =
            (err instanceof Error && err.name === "AbortError") ||
            /cancel|abort/i.test(raw);

        let message: string;
        if (cancelled && timedOut) {
            message = `No response after ${TIMEOUT_MS / 1000}s. Cannot reach ${url}`;
        } else if (cancelled) {
            message = "Request was cancelled";
        } else {
            message = raw || "Network request failed";
        }
        throw new Error(`Network error: ${message}`);
    } finally {
        clearTimeout(timeout);
    }

    // Auto-refresh token on 401 Unauthorized for authenticated endpoints
    if (response.status === 401 && !isRetry) {
        const refreshedToken = await authSession.refreshAccessToken();
        if (refreshedToken) {
            return request<T>(endpoint, options, true);
        }
    }

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error("[API ERROR]", {
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

export { request as apiRequest };

// --- Types ---

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

export type QuestionType = "MCQ" | "FILLUPS" | "SUBJECTIVE" | "TRUE/FALSE";

export const QUESTION_TYPES: QuestionType[] = [
    "MCQ",
    "FILLUPS",
    "SUBJECTIVE",
    "TRUE/FALSE",
];

export interface QuestionImage {
    imageId: number;
    imageUrl: string;
    displayOrder: number;
}

export interface QuestionSourceDetail {
    sourceId: number;
    sourceType: "EXAM" | "BOOK";
    label: string;
    examType?: string | null;
    examYear?: number | null;
    semesterNo?: number | null;
    bookName?: string | null;
    authorName?: string | null;
}

export interface Question {
    quesId: number;
    quesText: string;
    quesType: QuestionType;
    sourceId: number;
    topics: Topic[];
    images?: QuestionImage[];
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

export interface QuestionDetail {
    quesId: number;
    quesText: string;
    quesType: QuestionType;
    sourceId: number;
    source: QuestionSourceDetail | null;
    chapter: {
        chapterId: number;
        chapterNo: number;
        chapterName: string;
    } | null;
    subject: {
        subjectKey: number;
        subjectId: string;
        subjectName: string | null;
        semester: number;
    } | null;
    topics: Topic[];
    images: QuestionImage[];
}

export interface CreateQuestionPayload {
    quesText: string;
    quesType: QuestionType;
    sourceId: number;
    topicIds: number[];
    imageUrls?: string[];
}

export interface CreatedQuestionResponse {
    quesId: number;
    quesText: string;
    quesType: QuestionType;
    sourceId: number;
    topicIds: number[];
    imageUrls?: string[];
}

/** Filters for `api.searchQuestions`. All optional. */
export interface QuestionQuery {
    /** Matches question text or topic name */
    search?: string;
    /** Only questions tagged with a topic from this subject */
    subjectKey?: number;
    /** Filter questions by academic semester (1 to 8) */
    semester?: number;
    quesType?: QuestionType;
    /** 1-based */
    page?: number;
    pageSize?: number;
}

export interface QuestionPage {
    items: Question[];
    total: number;
    page: number;
    pageSize: number;
}

export interface QuestionStats {
    total: number;
    byType: Record<QuestionType, number>;
}

// New Types for Upcoming Exams, Timetable, and Sources

export interface UpcomingExam {
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

export interface TimetableEntry {
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

export interface Timetable {
    timetableId: number;
    deptId: number;
    semester: number;
    division: string;
    academicYear: string;
    isActive: boolean;
    entries?: TimetableEntry[];
    department?: { deptName: string };
}

/** Response of GET /timetables/my. Department and semester are resolved by the backend. */
export interface MyTimetable {
    deptId: number;
    deptName: string;
    semester: number;
    /** Divisions that have an active timetable for this department + semester. */
    divisions: string[];
    /** Division the returned timetable belongs to (null until one is chosen). */
    division: string | null;
    timetable: Timetable | null;
}

export interface SourceRecord {
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

// --- Client-side question search ---

const QUESTIONS_TTL_MS = 30_000;
let questionsCache: { at: number; promise: Promise<Question[]> } | null = null;

function loadQuestions(): Promise<Question[]> {
    const now = Date.now();
    if (questionsCache && now - questionsCache.at < QUESTIONS_TTL_MS) {
        return questionsCache.promise;
    }

    const promise = request<Question[]>("/questions");
    questionsCache = { at: now, promise };

    // Never cache a failure, so "Try again" really retries.
    promise.catch(() => {
        if (questionsCache?.promise === promise) questionsCache = null;
    });

    return promise;
}

const subjectTopicCache = new Map<number, Promise<Set<number>>>();
function loadSubjectTopicIds(subjectKey: number): Promise<Set<number>> {
    let promise = subjectTopicCache.get(subjectKey);
    if (!promise) {
        promise = (async () => {
            const chapters = await request<Chapter[]>(
                `/chapters?subjectKey=${subjectKey}`,
            );
            const topicLists = await Promise.all(
                chapters.map((c) =>
                    request<Topic[]>(`/topics?chapterId=${c.chapterId}`),
                ),
            );
            return new Set(topicLists.flat().map((t) => t.topicId));
        })();
        subjectTopicCache.set(subjectKey, promise);
        promise.catch(() => subjectTopicCache.delete(subjectKey));
    }
    return promise;
}

async function searchQuestions(
    query: QuestionQuery = {},
): Promise<QuestionPage> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = query.pageSize ?? 10;

    const [all, subjectTopicIds] = await Promise.all([
        loadQuestions(),
        query.subjectKey != null
            ? loadSubjectTopicIds(query.subjectKey)
            : Promise.resolve(null),
    ]);

    const needle = query.search?.trim().toLowerCase();

    const matches = all.filter((q) => {
        const topics = q.topics ?? [];
        if (query.quesType && q.quesType !== query.quesType) return false;
        if (query.semester != null) {
            const sem = q.semester ?? (q as any).subject?.semester;
            if (sem !== query.semester) return false;
        }
        if (
            subjectTopicIds &&
            !topics.some((t) => subjectTopicIds.has(t.topicId))
        ) {
            return false;
        }
        if (needle) {
            const inText = q.quesText.toLowerCase().includes(needle);
            const inTopic = topics.some((t) =>
                t.topicName.toLowerCase().includes(needle),
            );
            if (!inText && !inTopic) return false;
        }
        return true;
    });

    // Newest first
    matches.sort((a, b) => b.quesId - a.quesId);

    return {
        items: matches.slice((page - 1) * pageSize, page * pageSize),
        total: matches.length,
        page,
        pageSize,
    };
}

async function getQuestionStats(): Promise<QuestionStats> {
    const all = await loadQuestions();
    const byType: Record<QuestionType, number> = {
        MCQ: 0,
        FILLUPS: 0,
        SUBJECTIVE: 0,
        "TRUE/FALSE": 0,
    };
    for (const q of all) {
        if (q.quesType in byType) byType[q.quesType] += 1;
    }
    return { total: all.length, byType };
}

// --- Public API ---

export const api = {
    getSubjects: (search?: string): Promise<Subject[]> =>
        request<Subject[]>(
            `/subjects${search ? `?search=${encodeURIComponent(search)}` : ""}`,
        ),
    getSubject: (id: number): Promise<Subject> =>
        request<Subject>(`/subjects/${id}`),

    getChapters: (subjectKey: number): Promise<Chapter[]> =>
        request<Chapter[]>(`/chapters?subjectKey=${subjectKey}`),
    getChapter: (id: number): Promise<Chapter> =>
        request<Chapter>(`/chapters/${id}`),

    getTopics: (chapterId: number): Promise<Topic[]> =>
        request<Topic[]>(`/topics?chapterId=${chapterId}`),
    getTopic: (id: number): Promise<Topic> => request<Topic>(`/topics/${id}`),

    getQuestions: (): Promise<Question[]> => loadQuestions(),
    getQuestionById: (id: number): Promise<QuestionDetail> =>
        request<QuestionDetail>(`/questions/${id}`),

    searchQuestions,
    getQuestionStats,

    createQuestion: async (
        payload: CreateQuestionPayload,
    ): Promise<CreatedQuestionResponse> => {
        const created = await request<CreatedQuestionResponse>("/questions", {
            method: "POST",
            body: JSON.stringify(payload),
        });
        questionsCache = null; // so the new question shows up immediately
        return created;
    },

    // New Endpoints for Timetables, Exams, and Sources
    getUpcomingExams: (): Promise<UpcomingExam[]> =>
        request<UpcomingExam[]>("/upcoming-exams"),

    getMyTimetable: (division?: string): Promise<MyTimetable> =>
        request<MyTimetable>(
            division
                ? `/timetables/my?division=${encodeURIComponent(division)}`
                : "/timetables/my",
        ),

    getSources: (): Promise<SourceRecord[]> =>
        request<SourceRecord[]>("/sources"),

    // --- Quiz Revision API ---
    getQuizFilters: (): Promise<QuizFiltersResponse> =>
        request<QuizFiltersResponse>("/quiz/filters"),

    getQuizCounts: (params: {
        subjectKey: number;
        chapterId?: number;
        topicIds?: number[];
        difficulty?: string;
        questionType?: string;
    }): Promise<QuizCountsResponse> => {
        const query = new URLSearchParams();
        query.append("subjectKey", String(params.subjectKey));
        if (params.chapterId)
            query.append("chapterId", String(params.chapterId));
        if (params.topicIds?.length) {
            params.topicIds.forEach((id) =>
                query.append("topicIds", String(id)),
            );
        }
        if (params.difficulty) query.append("difficulty", params.difficulty);
        if (params.questionType)
            query.append("questionType", params.questionType);

        return request<QuizCountsResponse>(`/quiz/counts?${query.toString()}`);
    },

    startQuiz: (payload: StartQuizPayload): Promise<StartQuizResponse> =>
        request<StartQuizResponse>("/quiz/start", {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    submitQuiz: (
        attemptId: number,
        payload: SubmitQuizPayload,
    ): Promise<SubmitQuizResponse> => {
        const answersList = payload.answers || payload.responses || [];
        const time = payload.timeSpentSeconds ?? payload.timeTakenSeconds ?? 0;
        return request<SubmitQuizResponse>(
            `/quiz/attempts/${attemptId}/submit`,
            {
                method: "POST",
                body: JSON.stringify({
                    attemptId,
                    answers: answersList,
                    responses: answersList,
                    timeSpentSeconds: time,
                    timeTakenSeconds: time,
                }),
            },
        );
    },

    getQuizReview: (attemptId: number): Promise<SubmitQuizResponse> =>
        request<SubmitQuizResponse>(`/quiz/attempts/${attemptId}/review`),

    getQuizHistory: (page = 1, limit = 10): Promise<QuizHistoryResponse> =>
        request<QuizHistoryResponse>(
            `/quiz/attempts/history?page=${page}&limit=${limit}`,
        ),
};

// --- Quiz Revision Types ---

export type QuizQuestionType = "MCQ" | "FILLUPS" | "TRUE_FALSE";
export type QuizDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface QuizTopicMeta {
    topicId: number;
    topicName: string;
}

export interface QuizChapterMeta {
    chapterId: number;
    chapterNo: number;
    chapterName: string;
    subjectKey: number;
    topics: QuizTopicMeta[];
}

export interface QuizSubjectMeta {
    subjectKey: number;
    subjectName: string;
    semester: number;
    questionCount?: number;
    chapters: QuizChapterMeta[];
}

export interface QuizFiltersResponse {
    subjects: QuizSubjectMeta[];
    chapters: QuizChapterMeta[];
    topics: QuizTopicMeta[];
    subjectQuestionCounts?: Record<number, number>;
}

export interface QuizCountsResponse {
    total: number;
    availableQuestions?: number;
    breakdown?: {
        EASY: number;
        MEDIUM: number;
        HARD: number;
    };
    typeBreakdown?: {
        MCQ: number;
        FILLUPS: number;
        TRUE_FALSE: number;
    };
    subjectName?: string;
    chapterName?: string;
    topicsCount?: number;
}

export interface StartQuizPayload {
    subjectKey: number;
    chapterId?: number;
    topicIds?: number[];
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    questionType?: "MCQ" | "FILLUPS" | "TRUE_FALSE" | "ALL";
    count?: number;
    limit?: number;
    retryAttemptId?: number;
}

export interface QuizSessionQuestion {
    quizQuesId: number;
    quesText: string;
    questionType: QuizQuestionType;
    options?: Record<string, string> | null;
    difficulty: QuizDifficulty;
    chapterId: number;
    topics?: { topicId: number; topicName: string }[];
}

export interface StartQuizResponse {
    attemptId: number;
    totalQuestions: number;
    mode: "PRACTICE" | "TOPIC_TEST";
    subjectName: string;
    chapterName?: string;
    questions: QuizSessionQuestion[];
}

export interface SubmitQuizResponseItem {
    quizQuesId: number;
    quesText: string;
    questionType: QuizQuestionType;
    options?: Record<string, string> | null;
    difficulty: QuizDifficulty;
    studentAnswer: string | null;
    correctAnswer: string;
    acceptedAnswers?: string[] | null;
    isCorrect: boolean;
    explanation: string;
    topics?: { topicId: number; topicName: string }[];
}

export interface TopicPerformanceItem {
    topicId: number;
    topicName: string;
    total: number;
    correct: number;
    accuracy: number;
}

export interface SubmitQuizPayload {
    responses?: {
        quizQuesId: number;
        selectedAnswer?: string | null;
        timeSpentSeconds?: number;
    }[];
    answers?: {
        quizQuesId: number;
        selectedAnswer?: string | null;
        timeSpentSeconds?: number;
    }[];
    timeSpentSeconds?: number;
    timeTakenSeconds?: number;
}

export interface SubmitQuizResponse {
    attemptId: number;
    status: "COMPLETED" | "ABANDONED";
    score: number;
    accuracyPercentage: number;
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    timeSpentSeconds: number;
    createdAt: string;
    topicPerformance: TopicPerformanceItem[];
    questions: SubmitQuizResponseItem[];
}

export interface QuizHistoryAttempt {
    attemptId: number;
    mode: string;
    subjectName: string;
    chapterName?: string;
    totalQuestions: number;
    score: number;
    accuracyPercentage: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    timeSpentSeconds: number;
    status: string;
    createdAt: string;
}

export interface QuizHistoryResponse {
    items: QuizHistoryAttempt[];
    total: number;
    page: number;
    limit: number;
}
