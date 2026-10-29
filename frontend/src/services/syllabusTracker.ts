import { fetchAuthApi } from "./auth";

export type TrackerChapterStatus =
    | "COVERED"
    | "PARTIAL"
    | "UNCOVERED"
    | "EMPTY";

export interface TrackerAcademicContext {
    deptId: number | null;
    deptName: string | null;
    deptCode: string | null;
    currentSemester: number | null;
    academicYearLabel: string | null;
    admissionYear: number | null;
    rollNumber: string | null;
}

export interface TrackerSubjectOverview {
    subjectKey: number;
    subjectId: string;
    deptId: number;
    subjectName: string | null;
    credits: number;
    semester: number;
    totalChapters: number;
    totalTopics: number;
    coveredTopics: number;
    coveragePercent: number;
    eventCount: number;
    lastCoverageDate: string | null;
}

export interface TrackerContextResponse {
    user: {
        userId: number;
        email: string;
        displayName: string;
        role: "STUDENT" | "ADMIN";
    };
    academicContext: TrackerAcademicContext;
    subjects: TrackerSubjectOverview[];
}

export interface TrackerSubjectSummary {
    subjectKey: number;
    totalTopics: number;
    coveredTopics: number;
    coveragePercent: number;
}

export interface TrackerTopic {
    topicId: number;
    topicName: string;
    covered: boolean;
    firstCoveredDate: string | null;
    lastCoveredDate: string | null;
    timesCovered: number;
}

export interface TrackerChapter {
    chapterId: number;
    chapterNo: number;
    chapterName: string;
    totalTopics: number;
    coveredTopics: number;
    status: TrackerChapterStatus;
    topics: TrackerTopic[];
}

export interface TrackerStats {
    totalChapters: number;
    totalTopics: number;
    coveredTopics: number;
    remainingTopics: number;
    coveragePercent: number;
    chaptersCovered: number;
    chaptersPartial: number;
    chaptersUncovered: number;
    chaptersEmpty: number;
    eventCount: number;
    lastCoverageDate: string | null;
}

export interface WeeklyActivityBucket {
    weekStart: string;
    weekEnd: string;
    label: string;
    eventCount: number;
    uniqueTopicsTouched: number;
    newlyCoveredTopics: number;
}

export interface TrackerTreeResponse {
    subjectKey: number;
    subjectId: string;
    subjectName: string | null;
    semester: number;
    credits: number;
    deptId: number;
    deptName: string | null;
    asOf: string | null;
    stats: TrackerStats;
    weeklyActivity: WeeklyActivityBucket[];
    chapters: TrackerChapter[];
}

export interface CoverageEventTopicItem {
    topicId: number;
    topicName: string;
    chapterId: number;
    chapterNo: number;
    chapterName: string;
}

export interface CoverageEventItem {
    eventId: number;
    subjectKey: number;
    coverageDate: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    topics: CoverageEventTopicItem[];
}

export interface CreateCoverageEventPayload {
    subjectKey: number;
    coverageDate: string;
    notes?: string;
    topicIds: number[];
}

export interface UpdateCoverageEventPayload {
    coverageDate?: string;
    notes?: string;
    topicIds?: number[];
}

export interface UncoverTopicResponse {
    affected: {
        eventId: number;
        coverageDate: string;
        deleted: boolean;
    }[];
}

// --- Timezone-Safe Calendar Date Helpers ('YYYY-MM-DD') ---

export function getLocalDateString(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export function isValidDateString(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split("-").map(Number);
    if (y < 2000 || y > 2100) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return (
        dt.getUTCFullYear() === y &&
        dt.getUTCMonth() === m - 1 &&
        dt.getUTCDate() === d
    );
}

export function shiftDateString(dateStr: string, deltaDays: number): string {
    if (!isValidDateString(dateStr)) return dateStr;
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
    const ny = dt.getUTCFullYear();
    const nm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const nd = String(dt.getUTCDate()).padStart(2, "0");
    return `${ny}-${nm}-${nd}`;
}

const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

const FULL_MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

export function formatCalendarDate(
    dateStr: string | null | undefined,
    options?: { includeYear?: boolean; fullMonth?: boolean },
): string {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "—";
    const [y, m, d] = dateStr.split("-").map(Number);
    const includeYear = options?.includeYear ?? true;
    const names = options?.fullMonth ? FULL_MONTH_NAMES : MONTH_NAMES;
    const mon = names[m - 1] ?? "";
    return includeYear ? `${mon} ${d}, ${y}` : `${mon} ${d}`;
}

export const webSyllabusTrackerApi = {
    getContext: (): Promise<TrackerContextResponse> =>
        fetchAuthApi<TrackerContextResponse>("/api/syllabus-tracker/context"),

    getSummary: (): Promise<TrackerSubjectSummary[]> =>
        fetchAuthApi<TrackerSubjectSummary[]>("/api/syllabus-tracker/summary"),

    getTree: (
        subjectKey: number,
        asOf?: string | null,
    ): Promise<TrackerTreeResponse> =>
        fetchAuthApi<TrackerTreeResponse>(
            `/api/syllabus-tracker/subjects/${subjectKey}/tree${
                asOf ? `?asOf=${encodeURIComponent(asOf)}` : ""
            }`,
        ),

    listEvents: (subjectKey: number): Promise<CoverageEventItem[]> =>
        fetchAuthApi<CoverageEventItem[]>(
            `/api/syllabus-tracker/subjects/${subjectKey}/events`,
        ),

    getEvent: (eventId: number): Promise<CoverageEventItem> =>
        fetchAuthApi<CoverageEventItem>(
            `/api/syllabus-tracker/events/${eventId}`,
        ),

    createEvent: (
        payload: CreateCoverageEventPayload,
    ): Promise<CoverageEventItem> =>
        fetchAuthApi<CoverageEventItem>("/api/syllabus-tracker/events", {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    updateEvent: (
        eventId: number,
        payload: UpdateCoverageEventPayload,
    ): Promise<CoverageEventItem> =>
        fetchAuthApi<CoverageEventItem>(
            `/api/syllabus-tracker/events/${eventId}`,
            {
                method: "PATCH",
                body: JSON.stringify(payload),
            },
        ),

    deleteEvent: (eventId: number): Promise<{ deleted: true }> =>
        fetchAuthApi<{ deleted: true }>(
            `/api/syllabus-tracker/events/${eventId}`,
            {
                method: "DELETE",
            },
        ),

    uncoverTopic: (
        subjectKey: number,
        topicId: number,
    ): Promise<UncoverTopicResponse> =>
        fetchAuthApi<UncoverTopicResponse>(
            `/api/syllabus-tracker/subjects/${subjectKey}/topics/${topicId}/coverage`,
            {
                method: "DELETE",
            },
        ),
};

