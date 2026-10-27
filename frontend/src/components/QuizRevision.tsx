import { useState, useEffect, useMemo, useRef } from "react";
import { fetchApi } from "../services/api";

export interface DepartmentItem {
    deptId: number;
    deptName: string;
}

export interface SubjectItem {
    subjectKey: number;
    subjectId: string;
    deptId: number;
    subjectName: string;
    credits: number;
    semester: number;
    questionCount?: number;
}

export interface ChapterItem {
    chapterId: number;
    chapterNo: number;
    chapterName: string;
    subjectKey: number;
}

export interface TopicItem {
    topicId: number;
    topicName: string;
    chapterId: number;
}

export interface StudentProfile {
    isUndergraduate: boolean;
    admissionYear: number;
    deptCode: string;
    deptId?: number;
    rollNumber: string;
    currentSemester: number;
    isOddSemester: boolean;
}

export type QuizQuestionType = "MCQ" | "FILLUPS" | "TRUE_FALSE";

export interface QuestionCountsResponse {
    total: number;
    breakdown: {
        EASY: number;
        MEDIUM: number;
        HARD: number;
    };
    typeBreakdown?: {
        MCQ: number;
        FILLUPS: number;
        TRUE_FALSE: number;
    };
}

export interface StudentQuizQuestion {
    quizQuesId: number;
    questionType: QuizQuestionType;
    quesText: string;
    options?: Record<string, string> | null;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    chapterId: number;
    chapterName?: string;
    topics: { topicId: number; topicName: string }[];
}

export interface StartQuizResponse {
    attemptId: number;
    subjectKey: number;
    chapterId?: number;
    difficulty: string;
    totalQuestions: number;
    questions: StudentQuizQuestion[];
}

export interface ReviewQuestionItem {
    quizQuesId: number;
    questionType: QuizQuestionType;
    quesText: string;
    options?: Record<string, string> | null;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    selectedAnswer: string | null;
    correctAnswer: string;
    acceptedAnswers?: string[] | null;
    isCorrect: boolean;
    explanation: string;
    chapterId: number;
    chapterName?: string;
    topics: { topicId: number; topicName: string }[];
}

export interface TopicPerformanceStat {
    topicId: number;
    topicName: string;
    total: number;
    correct: number;
    accuracy: number;
}

export interface SubmitQuizResponse {
    attemptId: number;
    subjectKey: number;
    subjectName?: string;
    chapterId?: number;
    chapterName?: string;
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unanswered: number;
    accuracy: number;
    timeTakenSeconds: number;
    completedAt: string;
    topicBreakdown: TopicPerformanceStat[];
    questions: ReviewQuestionItem[];
}

export interface PastAttemptItem {
    attemptId: number;
    subjectKey: number;
    subjectName?: string;
    chapterId?: number;
    chapterName?: string;
    difficulty: string;
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unanswered: number;
    accuracy: number;
    timeTakenSeconds: number;
    completedAt: string;
    hasIncorrect: boolean;
}

type QuizViewMode = "setup" | "taking" | "results" | "history";

export default function QuizRevision() {
    // Mode state
    const [viewMode, setViewMode] = useState<QuizViewMode>("setup");

    // Hierarchy data
    const [departments, setDepartments] = useState<DepartmentItem[]>([]);
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [chapters, setChapters] = useState<ChapterItem[]>([]);
    const [topics, setTopics] = useState<TopicItem[]>([]);
    const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
    const [loadingFilters, setLoadingFilters] = useState(true);

    // Filter selections
    const [selectedDeptId, setSelectedDeptId] = useState<number | "">("");
    const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | "">("");
    const [selectedChapterId, setSelectedChapterId] = useState<number | "">("");
    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
    const [selectedType, setSelectedType] = useState<string>("ALL");
    const [questionCount, setQuestionCount] = useState<number>(10);

    // Live counts
    const [counts, setCounts] = useState<QuestionCountsResponse>({
        total: 0,
        breakdown: { EASY: 0, MEDIUM: 0, HARD: 0 },
        typeBreakdown: { MCQ: 0, FILLUPS: 0, TRUE_FALSE: 0 },
    });
    const [loadingCounts, setLoadingCounts] = useState(false);

    // Active Quiz session
    const [activeAttempt, setActiveAttempt] = useState<StartQuizResponse | null>(null);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [quizError, setQuizError] = useState<string | null>(null);

    // Results state
    const [results, setResults] = useState<SubmitQuizResponse | null>(null);

    // Attempt history
    const [history, setHistory] = useState<PastAttemptItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Timer ref
    const timerRef = useRef<number | null>(null);

    // 1. Load Hierarchy Filters on mount
    useEffect(() => {
        async function loadFilters() {
            setLoadingFilters(true);
            try {
                const data = await fetchApi<{
                    departments: DepartmentItem[];
                    subjects: SubjectItem[];
                    chapters: ChapterItem[];
                    topics: TopicItem[];
                    studentProfile: StudentProfile | null;
                }>("/api/quiz/filters");

                setDepartments(data.departments || []);
                setSubjects(data.subjects || []);
                setChapters(data.chapters || []);
                setTopics(data.topics || []);
                setStudentProfile(data.studentProfile || null);

                if (data.studentProfile?.deptId) {
                    setSelectedDeptId(data.studentProfile.deptId);
                }
                if (data.subjects && data.subjects.length > 0) {
                    const sem = data.studentProfile?.currentSemester;
                    const subjectsWithQs = data.subjects.filter((s) => (s.questionCount || 0) > 0);
                    const matchedSemWithQs = sem
                        ? subjectsWithQs.find((s) => s.semester === sem)
                        : null;
                    const initialSubject = matchedSemWithQs || subjectsWithQs[0] || data.subjects[0];
                    setSelectedSubjectKey(initialSubject.subjectKey);
                }
            } catch (err) {
                console.error("Failed to load quiz filters:", err);
            } finally {
                setLoadingFilters(false);
            }
        }
        loadFilters();
    }, []);

    // 2. Fetch live question counts whenever filters change
    useEffect(() => {
        if (!selectedSubjectKey) {
            setCounts({
                total: 0,
                breakdown: { EASY: 0, MEDIUM: 0, HARD: 0 },
                typeBreakdown: { MCQ: 0, FILLUPS: 0, TRUE_FALSE: 0 },
            });
            return;
        }

        async function fetchCounts() {
            setLoadingCounts(true);
            try {
                const params = new URLSearchParams();
                params.append("subjectKey", String(selectedSubjectKey));
                if (selectedChapterId) params.append("chapterId", String(selectedChapterId));
                if (selectedTopicIds.length > 0) params.append("topicIds", selectedTopicIds.join(","));
                if (selectedDifficulty !== "ALL") params.append("difficulty", selectedDifficulty);
                if (selectedType !== "ALL") params.append("questionType", selectedType);

                const res = await fetchApi<QuestionCountsResponse>(`/api/quiz/counts?${params.toString()}`);
                setCounts(res);
            } catch (err) {
                console.error("Failed to fetch question counts:", err);
            } finally {
                setLoadingCounts(false);
            }
        }

        fetchCounts();
    }, [selectedSubjectKey, selectedChapterId, selectedTopicIds, selectedDifficulty, selectedType]);

    // 3. Timer management
    useEffect(() => {
        if (viewMode === "taking") {
            timerRef.current = window.setInterval(() => {
                setSecondsElapsed((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [viewMode]);

    // Filtered cascade lists
    const filteredSubjects = useMemo(() => {
        const pool = selectedDeptId
            ? subjects.filter((s) => s.deptId === selectedDeptId)
            : subjects;
        return [...pool].sort((a, b) => {
            const countA = a.questionCount || 0;
            const countB = b.questionCount || 0;
            if (countA > 0 && countB === 0) return -1;
            if (countA === 0 && countB > 0) return 1;
            return a.semester - b.semester || a.subjectName.localeCompare(b.subjectName);
        });
    }, [subjects, selectedDeptId]);

    const filteredChapters = useMemo(() => {
        if (!selectedSubjectKey) return [];
        return chapters.filter((c) => c.subjectKey === selectedSubjectKey);
    }, [chapters, selectedSubjectKey]);

    const filteredTopics = useMemo(() => {
        if (!selectedChapterId) return [];
        return topics.filter((t) => t.chapterId === selectedChapterId);
    }, [topics, selectedChapterId]);

    const formatTime = (totalSecs: number) => {
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Handler: Start Quiz Session
    const handleStartRevision = async (retryAttemptId?: number) => {
        setQuizError(null);
        try {
            const body = retryAttemptId
                ? { retryAttemptId }
                : {
                      subjectKey: Number(selectedSubjectKey),
                      chapterId: selectedChapterId ? Number(selectedChapterId) : undefined,
                      topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
                      difficulty: selectedDifficulty,
                      questionType: selectedType,
                      count: questionCount,
                  };

            const data = await fetchApi<StartQuizResponse>("/api/quiz/start", {
                method: "POST",
                body: JSON.stringify(body),
            });

            setActiveAttempt(data);
            setCurrentQIndex(0);
            setUserAnswers({});
            setSecondsElapsed(0);
            setViewMode("taking");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to start revision attempt.";
            setQuizError(msg);
        }
    };

    // Handler: Submit Quiz Session
    const handleSubmitQuiz = async () => {
        if (!activeAttempt) return;
        setIsSubmitting(true);
        setQuizError(null);

        try {
            const answerPayload = activeAttempt.questions.map((q) => ({
                quizQuesId: q.quizQuesId,
                selectedAnswer: userAnswers[q.quizQuesId]?.trim() || null,
            }));

            const resultData = await fetchApi<SubmitQuizResponse>("/api/quiz/submit", {
                method: "POST",
                body: JSON.stringify({
                    attemptId: activeAttempt.attemptId,
                    timeTakenSeconds: secondsElapsed,
                    answers: answerPayload,
                }),
            });

            setResults(resultData);
            setShowConfirmModal(false);
            setViewMode("results");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to submit revision.";
            setQuizError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handler: Load past history
    const handleLoadHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetchApi<{ attempts: PastAttemptItem[] }>("/api/quiz/attempts/history");
            setHistory(res.attempts || []);
            setViewMode("history");
        } catch (err) {
            console.error("Failed to load attempt history:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Handler: View previous review
    const handleViewPastReview = async (attemptId: number) => {
        try {
            const pastReview = await fetchApi<SubmitQuizResponse>(`/api/quiz/attempts/${attemptId}`);
            setResults(pastReview);
            setViewMode("results");
        } catch (err) {
            console.error("Failed to load past review:", err);
        }
    };

    const currentQuestion = activeAttempt?.questions[currentQIndex];
    const totalQuestionsInSession = activeAttempt?.questions.length || 0;
    const answeredCount = Object.keys(userAnswers).filter((k) => userAnswers[Number(k)]?.trim()).length;
    const unansweredCount = totalQuestionsInSession - answeredCount;

    // Helper to render type badge
    const renderTypeBadge = (type: QuizQuestionType) => {
        if (type === "FILLUPS") {
            return (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Fill in the Blanks
                </span>
            );
        }
        if (type === "TRUE_FALSE") {
            return (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    True / False
                </span>
            );
        }
        return (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                MCQ
            </span>
        );
    };

    // ================= RENDER: SETUP VIEW =================
    if (viewMode === "setup") {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header banner */}
                <div className="bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-900 border border-red-500/30 rounded-2xl p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                Multi-Type Revision Engine
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                Quiz-Based Revision
                            </h2>
                            <p className="text-neutral-400 text-sm mt-1 max-w-xl">
                                Practice topic-focused MCQs, Fill-in-the-Blanks, and True/False questions with instant server-side grading and explanations.
                            </p>
                        </div>

                        <button
                            onClick={handleLoadHistory}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium border border-neutral-700 hover:border-neutral-600 transition-colors shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            Revision History
                        </button>
                    </div>

                    {studentProfile && (
                        <div className="mt-4 pt-4 border-t border-neutral-800/80 flex flex-wrap items-center gap-3 text-xs text-neutral-300">
                            <span className="text-neutral-400">Authenticated Student:</span>
                            <span className="bg-neutral-800 px-2.5 py-1 rounded-md font-mono text-red-300 border border-neutral-700">
                                {studentProfile.deptCode} • Sem {studentProfile.currentSemester}
                            </span>
                            <span className="text-neutral-500">• Relevant curriculum subjects prioritized</span>
                        </div>
                    )}
                </div>

                {/* Error Banner */}
                {quizError && (
                    <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-sm flex items-center justify-between">
                        <span>{quizError}</span>
                        <button
                            onClick={() => setQuizError(null)}
                            className="text-neutral-400 hover:text-white text-xs underline ml-4"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Setup Configuration Form */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6">
                    <h3 className="text-base font-semibold text-neutral-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Configure Revision Scope
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {/* 1. Department */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                                Department
                            </label>
                            <select
                                value={selectedDeptId}
                                onChange={(e) => {
                                    const val = e.target.value ? Number(e.target.value) : "";
                                    setSelectedDeptId(val);
                                    setSelectedSubjectKey("");
                                    setSelectedChapterId("");
                                    setSelectedTopicIds([]);
                                }}
                                disabled={loadingFilters}
                                className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-sm text-neutral-200 outline-none transition-colors"
                            >
                                <option value="">All Departments</option>
                                {departments.map((d) => (
                                    <option key={d.deptId} value={d.deptId}>
                                        {d.deptName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 2. Subject */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                                Subject <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedSubjectKey}
                                onChange={(e) => {
                                    setSelectedSubjectKey(e.target.value ? Number(e.target.value) : "");
                                    setSelectedChapterId("");
                                    setSelectedTopicIds([]);
                                }}
                                disabled={loadingFilters}
                                className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-sm text-neutral-200 outline-none transition-colors"
                            >
                                <option value="">Select a Subject...</option>
                                {filteredSubjects.map((s) => (
                                    <option key={s.subjectKey} value={s.subjectKey}>
                                        Sem {s.semester} — {s.subjectName} ({s.subjectId}){s.questionCount && s.questionCount > 0 ? ` [${s.questionCount} Questions Available]` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 3. Chapter */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                                Chapter (Optional)
                            </label>
                            <select
                                value={selectedChapterId}
                                onChange={(e) => {
                                    setSelectedChapterId(e.target.value ? Number(e.target.value) : "");
                                    setSelectedTopicIds([]);
                                }}
                                disabled={!selectedSubjectKey}
                                className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-sm text-neutral-200 outline-none transition-colors disabled:opacity-50"
                            >
                                <option value="">All Chapters (Entire Subject)</option>
                                {filteredChapters.map((c) => (
                                    <option key={c.chapterId} value={c.chapterId}>
                                        Ch {c.chapterNo}: {c.chapterName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Topics multi-select pills */}
                    {selectedChapterId && filteredTopics.length > 0 && (
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-neutral-400">
                                    Target Topics (Select one or more, or leave empty for all):
                                </label>
                                {selectedTopicIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTopicIds([])}
                                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Clear topic selection
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                                {filteredTopics.map((t) => {
                                    const isSelected = selectedTopicIds.includes(t.topicId);
                                    return (
                                        <button
                                            key={t.topicId}
                                            type="button"
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedTopicIds((prev) =>
                                                        prev.filter((id) => id !== t.topicId),
                                                    );
                                                } else {
                                                    setSelectedTopicIds((prev) => [...prev, t.topicId]);
                                                }
                                            }}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                                isSelected
                                                    ? "bg-red-500/20 border-red-500 text-red-300 font-medium"
                                                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                                            }`}
                                        >
                                            {t.topicName}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Question Types Selector */}
                    <div className="pt-4 border-t border-neutral-800">
                        <label className="block text-xs font-medium text-neutral-400 mb-2">
                            Question Format
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { key: "ALL", label: "All Formats" },
                                { key: "MCQ", label: "MCQ (Options)" },
                                { key: "FILLUPS", label: "Fill in the Blanks" },
                                { key: "TRUE_FALSE", label: "True / False" },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setSelectedType(item.key)}
                                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                                        selectedType === item.key
                                            ? "bg-red-500/20 border-red-500 text-red-300 font-semibold"
                                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Parameters: Difficulty & Count */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-neutral-800">
                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-2">
                                Difficulty Level
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((diff) => (
                                    <button
                                        key={diff}
                                        type="button"
                                        onClick={() => setSelectedDifficulty(diff)}
                                        className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                                            selectedDifficulty === diff
                                                ? "bg-red-500/20 border-red-500 text-red-300"
                                                : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                                        }`}
                                    >
                                        {diff === "ALL" ? "All" : diff.charAt(0) + diff.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-2">
                                Questions to Attempt: <span className="text-white font-semibold">{questionCount}</span>
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {[5, 10, 15, 20].map((num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setQuestionCount(num)}
                                        className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                                            questionCount === num
                                                ? "bg-red-500/20 border-red-500 text-red-300 font-semibold"
                                                : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                                        }`}
                                    >
                                        {num} Qs
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Live Availability Badge & Start Action */}
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-800">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-neutral-400">Available:</span>
                            {loadingCounts ? (
                                <span className="h-5 w-20 bg-neutral-800 animate-pulse rounded"></span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`font-semibold px-2.5 py-0.5 rounded-full text-xs ${
                                            counts.total > 0
                                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                                : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                                        }`}
                                    >
                                        {counts.total} Questions
                                    </span>
                                    {counts.typeBreakdown && (
                                        <span className="text-xs text-neutral-500 hidden md:inline">
                                            (MCQ: {counts.typeBreakdown.MCQ} • Fillups: {counts.typeBreakdown.FILLUPS} • T/F: {counts.typeBreakdown.TRUE_FALSE})
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            disabled={!selectedSubjectKey || counts.total === 0}
                            onClick={() => handleStartRevision()}
                            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            Start Revision Session
                        </button>
                    </div>

                    {counts.total === 0 && selectedSubjectKey && !loadingCounts && (
                        <p className="text-xs text-amber-400 bg-amber-950/20 border border-amber-500/20 p-3 rounded-lg">
                            Notice: No questions currently exist matching this exact filter combination. Try selecting &quot;All Chapters&quot; or &quot;All Formats&quot;.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // ================= RENDER: ACTIVE TAKING VIEW =================
    if (viewMode === "taking" && activeAttempt && currentQuestion) {
        const rawAns = userAnswers[currentQuestion.quizQuesId] || "";
        const isLastQuestion = currentQIndex === totalQuestionsInSession - 1;

        return (
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header bar: Timer, Counter, Exit */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                                Question {currentQIndex + 1} of {totalQuestionsInSession}
                            </span>
                            {renderTypeBadge(currentQuestion.questionType)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-neutral-200">
                                {currentQuestion.chapterName || "Core Concepts"}
                            </span>
                            <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                    currentQuestion.difficulty === "EASY"
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : currentQuestion.difficulty === "HARD"
                                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                }`}
                            >
                                {currentQuestion.difficulty}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm font-mono text-neutral-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 animate-pulse"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {formatTime(secondsElapsed)}
                        </div>

                        <button
                            onClick={() => {
                                if (window.confirm("Are you sure you want to exit? Your revision attempt will not be saved.")) {
                                    setViewMode("setup");
                                }
                            }}
                            className="text-xs text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors"
                        >
                            Abort
                        </button>
                    </div>
                </div>

                {/* Question Palette Indicator */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                        {activeAttempt.questions.map((q, idx) => {
                            const isAnswered = Boolean(userAnswers[q.quizQuesId]?.trim());
                            const isCurrent = idx === currentQIndex;

                            return (
                                <button
                                    key={q.quizQuesId}
                                    onClick={() => setCurrentQIndex(idx)}
                                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                                        isCurrent
                                            ? "ring-2 ring-red-500 text-white bg-red-600"
                                            : isAnswered
                                            ? "bg-neutral-800 text-emerald-400 border border-emerald-500/40"
                                            : "bg-neutral-950 text-neutral-400 hover:bg-neutral-800 border border-neutral-800"
                                    }`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className="text-xs text-neutral-400">
                        <span className="text-emerald-400 font-semibold">{answeredCount}</span> answered •{" "}
                        <span className="text-neutral-400">{unansweredCount}</span> remaining
                    </div>
                </div>

                {/* Main Question Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6">
                    {/* Topics badges */}
                    {currentQuestion.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {currentQuestion.topics.map((t) => (
                                <span
                                    key={t.topicId}
                                    className="text-[11px] bg-neutral-950 border border-neutral-800 text-neutral-400 px-2.5 py-0.5 rounded-md"
                                >
                                    {t.topicName}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Question text */}
                    <h3 className="text-lg sm:text-xl font-medium text-neutral-100 leading-relaxed whitespace-pre-wrap">
                        {currentQuestion.quesText}
                    </h3>

                    {/* INTERACTION 1: MCQ Options */}
                    {currentQuestion.questionType === "MCQ" && currentQuestion.options && (
                        <div className="space-y-3 pt-2">
                            {Object.entries(currentQuestion.options).map(([key, optText]) => {
                                const isSelected = rawAns === key;
                                return (
                                    <div
                                        key={key}
                                        onClick={() => {
                                            setUserAnswers((prev) => ({
                                                ...prev,
                                                [currentQuestion.quizQuesId]: key,
                                            }));
                                        }}
                                        className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                                            isSelected
                                                ? "bg-red-950/30 border-red-500 text-white shadow-md shadow-red-950/30"
                                                : "bg-neutral-950/70 hover:bg-neutral-800/60 border-neutral-800 text-neutral-300"
                                        }`}
                                    >
                                        <div
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                                isSelected
                                                    ? "bg-red-600 text-white"
                                                    : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                                            }`}
                                        >
                                            {key}
                                        </div>
                                        <div className="text-sm font-normal pt-1 select-none flex-1">
                                            {optText}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* INTERACTION 2: Fill in the Blanks Text Input */}
                    {currentQuestion.questionType === "FILLUPS" && (
                        <div className="space-y-3 pt-2">
                            <label className="block text-xs font-medium text-neutral-400">
                                Enter your answer below:
                            </label>
                            <input
                                type="text"
                                autoFocus
                                value={rawAns}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setUserAnswers((prev) => ({
                                        ...prev,
                                        [currentQuestion.quizQuesId]: val,
                                    }));
                                }}
                                placeholder="Type your answer here..."
                                className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-4 py-3.5 text-base text-white outline-none transition-colors"
                            />
                            <p className="text-xs text-neutral-500">
                                Tip: Capitalization and minor spacing differences are automatically normalized during grading.
                            </p>
                        </div>
                    )}

                    {/* INTERACTION 3: True / False Choice Cards */}
                    {currentQuestion.questionType === "TRUE_FALSE" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            {[
                                { key: "TRUE", label: "True", icon: "✓" },
                                { key: "FALSE", label: "False", icon: "✗" },
                            ].map((choice) => {
                                const isSelected = rawAns === choice.key;
                                return (
                                    <div
                                        key={choice.key}
                                        onClick={() => {
                                            setUserAnswers((prev) => ({
                                                ...prev,
                                                [currentQuestion.quizQuesId]: choice.key,
                                            }));
                                        }}
                                        className={`flex items-center gap-3 p-5 rounded-xl border cursor-pointer transition-all ${
                                            isSelected
                                                ? "bg-red-950/30 border-red-500 text-white shadow-md shadow-red-950/30"
                                                : "bg-neutral-950/70 hover:bg-neutral-800/60 border-neutral-800 text-neutral-300"
                                        }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                                                isSelected
                                                    ? "bg-red-600 text-white"
                                                    : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                                            }`}
                                        >
                                            {choice.icon}
                                        </div>
                                        <div className="text-base font-semibold select-none flex-1">
                                            {choice.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Clear selection option */}
                    {rawAns && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setUserAnswers((prev) => {
                                        const copy = { ...prev };
                                        delete copy[currentQuestion.quizQuesId];
                                        return copy;
                                    });
                                }}
                                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                            >
                                Clear answer
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        disabled={currentQIndex === 0}
                        onClick={() => setCurrentQIndex((prev) => prev - 1)}
                        className="px-5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    >
                        ← Previous
                    </button>

                    <div className="flex items-center gap-3">
                        {!isLastQuestion ? (
                            <button
                                type="button"
                                onClick={() => setCurrentQIndex((prev) => prev + 1)}
                                className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-sm font-medium transition-colors"
                            >
                                Next →
                            </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => setShowConfirmModal(true)}
                            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold shadow-lg shadow-red-600/20 transition-all flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            Submit Revision
                        </button>
                    </div>
                </div>

                {/* Submission Confirmation Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
                            <h4 className="text-lg font-bold text-white">
                                Ready to submit revision?
                            </h4>

                            <div className="space-y-2 text-sm text-neutral-300 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                                <div className="flex justify-between">
                                    <span>Total Questions:</span>
                                    <span className="font-semibold text-white">{totalQuestionsInSession}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Answered:</span>
                                    <span className="font-semibold text-emerald-400">{answeredCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Unanswered:</span>
                                    <span className="font-semibold text-amber-400">{unansweredCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Time Elapsed:</span>
                                    <span className="font-mono text-neutral-300">{formatTime(secondsElapsed)}</span>
                                </div>
                            </div>

                            {unansweredCount > 0 && (
                                <p className="text-xs text-amber-400">
                                    Note: You have {unansweredCount} unanswered question(s). They will be evaluated as incorrect.
                                </p>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-sm transition-colors"
                                >
                                    Continue Revising
                                </button>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleSubmitQuiz}
                                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors flex items-center gap-2"
                                >
                                    {isSubmitting ? "Grading..." : "Confirm & Submit"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ================= RENDER: RESULTS & REVIEW VIEW =================
    if (viewMode === "results" && results) {
        const hasMissedQuestions = results.incorrectAnswers > 0 || results.unanswered > 0;

        return (
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Score Summary Card */}
                <div className="bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
                                Revision Complete
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                                Performance Overview
                            </h2>
                            <p className="text-xs text-neutral-400 mt-1">
                                {results.subjectName} {results.chapterName ? `• ${results.chapterName}` : ""}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className="text-3xl font-extrabold text-white">
                                    {results.accuracy}%
                                </span>
                                <span className="block text-xs text-neutral-400">Accuracy Rate</span>
                            </div>
                            <div
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border ${
                                    results.accuracy >= 75
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                        : results.accuracy >= 50
                                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                        : "bg-red-500/10 border-red-500/30 text-red-400"
                                }`}
                            >
                                {results.accuracy >= 75 ? "A" : results.accuracy >= 50 ? "B" : "C"}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-center">
                            <span className="text-xs text-neutral-400 block mb-1">Total Attempted</span>
                            <span className="text-2xl font-bold text-white">{results.totalQuestions}</span>
                        </div>
                        <div className="bg-neutral-950 p-4 rounded-xl border border-emerald-500/20 text-center">
                            <span className="text-xs text-emerald-400 block mb-1">Correct</span>
                            <span className="text-2xl font-bold text-emerald-400">{results.correctAnswers}</span>
                        </div>
                        <div className="bg-neutral-950 p-4 rounded-xl border border-red-500/20 text-center">
                            <span className="text-xs text-red-400 block mb-1">Incorrect</span>
                            <span className="text-2xl font-bold text-red-400">{results.incorrectAnswers}</span>
                        </div>
                        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-center">
                            <span className="text-xs text-neutral-400 block mb-1">Time Taken</span>
                            <span className="text-2xl font-bold text-neutral-200 font-mono">
                                {formatTime(results.timeTakenSeconds)}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        {hasMissedQuestions && (
                            <button
                                type="button"
                                onClick={() => handleStartRevision(results.attemptId)}
                                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-600/20 transition-all flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                Retry Missed Questions ({results.incorrectAnswers + results.unanswered})
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setViewMode("setup")}
                            className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-sm border border-neutral-700 transition-colors"
                        >
                            Start New Revision
                        </button>

                        <button
                            type="button"
                            onClick={handleLoadHistory}
                            className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-sm transition-colors ml-auto"
                        >
                            View Past Attempts
                        </button>
                    </div>
                </div>

                {/* Topic Breakdown Section */}
                {results.topicBreakdown && results.topicBreakdown.length > 0 && (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                        <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider">
                            Topic Performance Analysis
                        </h3>
                        <div className="space-y-3">
                            {results.topicBreakdown.map((t) => (
                                <div key={t.topicId} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-neutral-300 font-medium">{t.topicName}</span>
                                        <span className="text-neutral-400">
                                            {t.correct} / {t.total} ({t.accuracy}%)
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                t.accuracy >= 70 ? "bg-emerald-500" : t.accuracy >= 40 ? "bg-amber-500" : "bg-red-500"
                                            }`}
                                            style={{ width: `${t.accuracy}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Question by Question Review */}
                <div className="space-y-6">
                    <h3 className="text-base font-semibold text-neutral-200 flex items-center gap-2">
                        <span>Detailed Question Review</span>
                        <span className="text-xs font-normal text-neutral-400">
                            (With complete answer explanations)
                        </span>
                    </h3>

                    <div className="space-y-4">
                        {results.questions.map((q, idx) => {
                            const isCorrect = q.isCorrect;

                            return (
                                <div
                                    key={q.quizQuesId}
                                    className={`bg-neutral-900 border rounded-2xl p-6 space-y-4 transition-all ${
                                        isCorrect ? "border-emerald-500/30" : "border-red-500/30"
                                    }`}
                                >
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-neutral-400">
                                                Q{idx + 1}.
                                            </span>
                                            {renderTypeBadge(q.questionType)}
                                            <span
                                                className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase ${
                                                    isCorrect
                                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                                                }`}
                                            >
                                                {isCorrect ? "Correct" : "Incorrect"}
                                            </span>
                                        </div>

                                        <span className="text-xs text-neutral-500">
                                            {q.chapterName}
                                        </span>
                                    </div>

                                    {/* Question text */}
                                    <h4 className="text-base font-medium text-neutral-100">
                                        {q.quesText}
                                    </h4>

                                    {/* REVIEW 1: MCQ Display */}
                                    {q.questionType === "MCQ" && q.options && (
                                        <div className="space-y-2">
                                            {Object.entries(q.options).map(([key, optText]) => {
                                                const isSelected = q.selectedAnswer === key;
                                                const isTheRightAnswer = q.correctAnswer === key;

                                                let rowStyle = "bg-neutral-950/70 border-neutral-800 text-neutral-400";
                                                if (isTheRightAnswer) {
                                                    rowStyle = "bg-emerald-950/30 border-emerald-500/50 text-emerald-200 font-medium";
                                                } else if (isSelected && !isTheRightAnswer) {
                                                    rowStyle = "bg-red-950/30 border-red-500/50 text-red-200";
                                                }

                                                return (
                                                    <div
                                                        key={key}
                                                        className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${rowStyle}`}
                                                    >
                                                        <div
                                                            className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                                                                isTheRightAnswer
                                                                    ? "bg-emerald-600 text-white"
                                                                    : isSelected
                                                                    ? "bg-red-600 text-white"
                                                                    : "bg-neutral-800 text-neutral-400"
                                                            }`}
                                                        >
                                                            {key}
                                                        </div>
                                                        <div className="pt-0.5 flex-1">{optText}</div>
                                                        {isTheRightAnswer && (
                                                            <span className="text-xs text-emerald-400 font-semibold shrink-0">
                                                                ✓ Correct Answer
                                                            </span>
                                                        )}
                                                        {isSelected && !isTheRightAnswer && (
                                                            <span className="text-xs text-red-400 font-semibold shrink-0">
                                                                ✗ Your Choice
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* REVIEW 2: Fill in the Blanks Display */}
                                    {q.questionType === "FILLUPS" && (
                                        <div className="space-y-3 bg-neutral-950/60 p-4 rounded-xl border border-neutral-800">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                                                <div>
                                                    <span className="text-xs text-neutral-400 block">Your Answer:</span>
                                                    <span className={`font-semibold ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                                                        {q.selectedAnswer || "(Unanswered)"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-neutral-400 block">Accepted Answer:</span>
                                                    <span className="font-semibold text-emerald-400 font-mono">
                                                        {q.correctAnswer}
                                                    </span>
                                                </div>
                                            </div>

                                            {q.acceptedAnswers && q.acceptedAnswers.length > 1 && (
                                                <div className="pt-2 border-t border-neutral-800/80 text-xs text-neutral-400">
                                                    <span>Also accepted: </span>
                                                    <span className="text-neutral-300 font-mono">
                                                        {q.acceptedAnswers.filter((a) => a !== q.correctAnswer).join(", ")}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* REVIEW 3: True / False Display */}
                                    {q.questionType === "TRUE_FALSE" && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {["TRUE", "FALSE"].map((choice) => {
                                                const isCorrectChoice = q.correctAnswer === choice;
                                                const wasSelected = q.selectedAnswer?.toUpperCase() === choice;

                                                let style = "bg-neutral-950/70 border-neutral-800 text-neutral-400";
                                                if (isCorrectChoice) {
                                                    style = "bg-emerald-950/30 border-emerald-500/50 text-emerald-200 font-semibold";
                                                } else if (wasSelected && !isCorrectChoice) {
                                                    style = "bg-red-950/30 border-red-500/50 text-red-200";
                                                }

                                                return (
                                                    <div key={choice} className={`p-3 rounded-xl border text-sm text-center ${style}`}>
                                                        <span>{choice === "TRUE" ? "True" : "False"}</span>
                                                        {isCorrectChoice && <span className="block text-xs text-emerald-400">✓ Correct</span>}
                                                        {wasSelected && !isCorrectChoice && <span className="block text-xs text-red-400">✗ Your Choice</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Explanation Callout */}
                                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 text-sm space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                            Explanation:
                                        </div>
                                        <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed pl-5">
                                            {q.explanation}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ================= RENDER: ATTEMPT HISTORY VIEW =================
    if (viewMode === "history") {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Revision History</h2>
                        <p className="text-xs text-neutral-400 mt-1">
                            Your past completed revision sessions and performance records.
                        </p>
                    </div>

                    <button
                        onClick={() => setViewMode("setup")}
                        className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
                    >
                        ← Back to Revision
                    </button>
                </div>

                {loadingHistory ? (
                    <div className="p-8 text-center text-sm text-neutral-500 animate-pulse">
                        Loading revision attempts...
                    </div>
                ) : history.length === 0 ? (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-500 mx-auto flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <h3 className="text-base font-medium text-neutral-200">No attempts found</h3>
                        <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                            You have not completed any revision attempts yet. Select a subject and start your first session!
                        </p>
                        <button
                            onClick={() => setViewMode("setup")}
                            className="mt-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors"
                        >
                            Start Revision
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((a) => (
                            <div
                                key={a.attemptId}
                                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-semibold text-neutral-200">
                                            {a.subjectName || "Subject Revision"}
                                        </h4>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                                            {a.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-400">
                                        {a.chapterName ? `Chapter: ${a.chapterName} • ` : ""}
                                        {new Date(a.completedAt).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-white">
                                            {a.correctAnswers}/{a.totalQuestions}
                                        </span>
                                        <span className="block text-[11px] text-neutral-400">
                                            {a.accuracy}% Accuracy
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleViewPastReview(a.attemptId)}
                                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium border border-neutral-700 transition-colors"
                                        >
                                            Review
                                        </button>

                                        {a.hasIncorrect && (
                                            <button
                                                type="button"
                                                onClick={() => handleStartRevision(a.attemptId)}
                                                className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-medium transition-colors"
                                            >
                                                Retry Missed
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return null;
}
