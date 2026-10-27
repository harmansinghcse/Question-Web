import { useEffect, useMemo, useState } from "react";
import {
    fetchFilteredQuestions,
    INITIAL_QUESTION_FILTERS,
    type QuestionFilters,
    type QuestionItem,
} from "../../services/questionSelection";
import {
    useApiList,
    type DepartmentOption,
    type SubjectOption,
    type ChapterOption,
    type TopicOption,
} from "../../hooks/useApiList";

interface Props {
    selectedQuestions: Map<number, QuestionItem>;
    onToggleSelect: (question: QuestionItem) => void;
    onSelectAll: (questions: QuestionItem[]) => void;
    onDeselectAll: () => void;
    onProceed: () => void;
}

const QUESTION_TYPES = [
    { label: "All Types", value: "ALL" },
    { label: "Subjective", value: "SUBJECTIVE" },
    { label: "MCQ", value: "MCQ" },
    { label: "Fill in Blanks", value: "FILLUPS" },
    { label: "True / False", value: "TRUE/FALSE" },
];

const SOURCE_TYPES = [
    { label: "All Sources", value: "ALL" },
    { label: "Exams", value: "EXAM" },
    { label: "Books", value: "BOOK" },
];

export default function QuestionSelector({
    selectedQuestions,
    onToggleSelect,
    onSelectAll,
    onDeselectAll,
    onProceed,
}: Props) {
    const [filters, setFilters] = useState<QuestionFilters>(INITIAL_QUESTION_FILTERS);

    // Cascading Hierarchy API calls
    const departments = useApiList<DepartmentOption>("/api/departments");

    const subjectUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (filters.deptId) params.set("deptId", String(filters.deptId));
        if (filters.semester) params.set("semester", String(filters.semester));
        const qs = params.toString();
        return qs ? `/api/subjects?${qs}` : "/api/subjects";
    }, [filters.deptId, filters.semester]);

    const subjects = useApiList<SubjectOption>(subjectUrl);
    const chapters = useApiList<ChapterOption>(
        filters.subjectKey ? `/api/chapters?subjectKey=${filters.subjectKey}` : null,
    );
    const topics = useApiList<TopicOption>(
        filters.chapterId ? `/api/topics?chapterId=${filters.chapterId}` : null,
    );

    // Question loading state
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadCounter, setReloadCounter] = useState(0);

    useEffect(() => {
        let cancelled = false;

        fetchFilteredQuestions(filters)
            .then((data) => {
                if (!cancelled) {
                    setQuestions(data);
                    setLoading(false);
                    setError(null);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Failed to load questions");
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        filters.deptId,
        filters.semester,
        filters.subjectKey,
        filters.chapterId,
        filters.topicIds,
        filters.quesType,
        filters.sourceType,
        filters.search,
        reloadCounter,
    ]);

    const handleRetry = () => {
        setLoading(true);
        setError(null);
        setReloadCounter((c) => c + 1);
    };

    const handleDepartmentChange = (deptId: number | null) => {
        setFilters((prev) => ({
            ...prev,
            deptId,
            subjectKey: null,
            chapterId: null,
            topicIds: [],
        }));
    };

    const handleSemesterChange = (semester: number | null) => {
        setFilters((prev) => ({
            ...prev,
            semester,
            subjectKey: null,
            chapterId: null,
            topicIds: [],
        }));
    };

    const handleSubjectChange = (subjectKey: number | null) => {
        setFilters((prev) => ({
            ...prev,
            subjectKey,
            chapterId: null,
            topicIds: [],
        }));
    };

    const handleChapterChange = (chapterId: number | null) => {
        setFilters((prev) => ({
            ...prev,
            chapterId,
            topicIds: [],
        }));
    };

    const handleToggleTopic = (topicId: number) => {
        setFilters((prev) => {
            const current = prev.topicIds || [];
            const exists = current.includes(topicId);
            return {
                ...prev,
                topicIds: exists
                    ? current.filter((id) => id !== topicId)
                    : [...current, topicId],
            };
        });
    };

    const handleClearFilters = () => {
        setFilters(INITIAL_QUESTION_FILTERS);
    };

    // Check if all currently displayed questions are selected
    const areAllDisplayedSelected = useMemo(() => {
        if (questions.length === 0) return false;
        return questions.every((q) => selectedQuestions.has(q.quesId));
    }, [questions, selectedQuestions]);

    return (
        <div className="space-y-6">
            {/* Hierarchy & Filter Panel */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                    <div>
                        <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                            Academic Hierarchy & Filters
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                            Filter real questions from the examination and textbook database
                        </p>
                    </div>

                    <button
                        onClick={handleClearFilters}
                        className="text-xs font-medium text-neutral-400 hover:text-white transition-colors bg-neutral-800 hover:bg-neutral-750 px-3 py-1.5 rounded-lg border border-neutral-700 flex items-center gap-1.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        Reset Filters
                    </button>
                </div>

                {/* Dependent Cascading Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* 1. Department */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                            Department
                        </label>
                        <select
                            value={filters.deptId ?? ""}
                            onChange={(e) =>
                                handleDepartmentChange(
                                    e.target.value ? Number(e.target.value) : null,
                                )
                            }
                            className="w-full bg-neutral-950 border border-neutral-750 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-neutral-100 transition-colors"
                        >
                            <option value="">All Departments</option>
                            {departments.data.map((d) => (
                                <option key={d.deptId} value={d.deptId}>
                                    {d.deptName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Semester */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                            Semester
                        </label>
                        <select
                            value={filters.semester ?? ""}
                            onChange={(e) =>
                                handleSemesterChange(
                                    e.target.value ? Number(e.target.value) : null,
                                )
                            }
                            className="w-full bg-neutral-950 border border-neutral-750 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-neutral-100 transition-colors"
                        >
                            <option value="">All Semesters</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                <option key={sem} value={sem}>
                                    Semester {sem}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Subject */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                            Subject
                        </label>
                        <select
                            value={filters.subjectKey ?? ""}
                            onChange={(e) =>
                                handleSubjectChange(
                                    e.target.value ? Number(e.target.value) : null,
                                )
                            }
                            className="w-full bg-neutral-950 border border-neutral-750 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-neutral-100 transition-colors"
                        >
                            <option value="">All Subjects</option>
                            {subjects.data.map((s) => (
                                <option key={s.subjectKey} value={s.subjectKey}>
                                    {s.subjectName || s.subjectId}
                                    {s.semester ? ` (Sem ${s.semester})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Chapter */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                            Chapter
                        </label>
                        <select
                            value={filters.chapterId ?? ""}
                            onChange={(e) =>
                                handleChapterChange(
                                    e.target.value ? Number(e.target.value) : null,
                                )
                            }
                            disabled={!filters.subjectKey}
                            className="w-full bg-neutral-950 border border-neutral-750 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-3 py-2 text-sm text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <option value="">
                                {!filters.subjectKey
                                    ? "Select a subject first"
                                    : "All Chapters"}
                            </option>
                            {chapters.data.map((c) => (
                                <option key={c.chapterId} value={c.chapterId}>
                                    {c.chapterNo ? `Ch ${c.chapterNo}: ` : ""}
                                    {c.chapterName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Topics Filter (Multi-select when chapter is selected) */}
                {filters.chapterId && topics.data.length > 0 && (
                    <div className="pt-2">
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                            Specific Topics (Multi-select)
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-neutral-950 rounded-lg border border-neutral-800">
                            {topics.data.map((t) => {
                                const isSelected = filters.topicIds.includes(t.topicId);
                                return (
                                    <button
                                        key={t.topicId}
                                        type="button"
                                        onClick={() => handleToggleTopic(t.topicId)}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                                            isSelected
                                                ? "bg-red-600 text-white shadow-sm"
                                                : "bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border border-neutral-750"
                                        }`}
                                    >
                                        {isSelected && "✓ "}
                                        {t.topicName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Question Type, Source & Text Search */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
                    {/* Question Type Filter */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                            Question Type
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {QUESTION_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() =>
                                        setFilters((prev) => ({ ...prev, quesType: type.value }))
                                    }
                                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                                        filters.quesType === type.value
                                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                            : "bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800"
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Source Filter */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                            Source Format
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {SOURCE_TYPES.map((src) => (
                                <button
                                    key={src.value}
                                    type="button"
                                    onClick={() =>
                                        setFilters((prev) => ({ ...prev, sourceType: src.value }))
                                    }
                                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                                        filters.sourceType === src.value
                                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                            : "bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800"
                                    }`}
                                >
                                    {src.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Question Text */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                            Search Question Text
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={filters.search ?? ""}
                                onChange={(e) =>
                                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                                }
                                placeholder="Search keywords..."
                                className="w-full bg-neutral-950 border border-neutral-750 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg pl-8 pr-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors"
                            />
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="absolute left-2.5 top-2.5 text-neutral-500"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Selection Toolbar & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3.5 sticky top-0 z-10 backdrop-blur-md bg-neutral-900/90 shadow-md">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-neutral-200">
                        Found <strong className="text-white">{questions.length}</strong> questions
                    </span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-sm font-semibold text-red-400 bg-red-950/40 border border-red-500/30 px-2.5 py-0.5 rounded-full">
                        {selectedQuestions.size} selected
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (areAllDisplayedSelected) {
                                onDeselectAll();
                            } else {
                                onSelectAll(questions);
                            }
                        }}
                        disabled={questions.length === 0}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 disabled:opacity-50 transition-colors"
                    >
                        {areAllDisplayedSelected ? "Deselect Displayed" : "Select All Displayed"}
                    </button>

                    {selectedQuestions.size > 0 && (
                        <button
                            type="button"
                            onClick={onDeselectAll}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition-colors"
                        >
                            Clear All
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onProceed}
                        disabled={selectedQuestions.size === 0}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-red-950/50 transition-all flex items-center gap-1.5"
                    >
                        <span>Configure Prompt</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
            </div>

            {/* Questions List */}
            {loading ? (
                <div className="space-y-3 py-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3 animate-pulse"
                        >
                            <div className="flex items-center justify-between">
                                <div className="h-4 w-40 bg-neutral-800 rounded"></div>
                                <div className="h-4 w-20 bg-neutral-800 rounded"></div>
                            </div>
                            <div className="h-4 w-full bg-neutral-800 rounded"></div>
                            <div className="h-4 w-3/4 bg-neutral-800 rounded"></div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-6 text-center space-y-3">
                    <p className="text-sm font-medium text-red-400">{error}</p>
                    <button
                        onClick={handleRetry}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                        Retry Loading Questions
                    </button>
                </div>
            ) : questions.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-10 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </div>
                    <h4 className="text-base font-medium text-neutral-200">No questions match the selected filters</h4>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto">
                        Try loosening your department, subject, chapter, or search filters to view more questions from the database.
                    </p>
                    <button
                        onClick={handleClearFilters}
                        className="px-3.5 py-1.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-200 rounded-lg transition-colors"
                    >
                        Clear All Filters
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {questions.map((q) => {
                        const isSelected = selectedQuestions.has(q.quesId);
                        return (
                            <div
                                key={q.quesId}
                                onClick={() => onToggleSelect(q)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                                    isSelected
                                        ? "bg-red-950/20 border-red-500/50 shadow-sm shadow-red-950/20"
                                        : "bg-neutral-900 hover:bg-neutral-850/80 border-neutral-800 hover:border-neutral-700"
                                }`}
                            >
                                <div className="flex items-start gap-3.5">
                                    {/* Selection Checkbox */}
                                    <div className="pt-0.5 shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}} // Handled by container click
                                            className="w-4 h-4 rounded border-neutral-700 text-red-600 focus:ring-red-500 focus:ring-offset-neutral-950 bg-neutral-950 cursor-pointer"
                                        />
                                    </div>

                                    {/* Main Question Content */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        {/* Metadata Pill Bar */}
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {/* Type Badge */}
                                            <span
                                                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                                    q.quesType === "MCQ"
                                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                        : q.quesType === "FILLUPS"
                                                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                                        : q.quesType === "TRUE/FALSE"
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                                                }`}
                                            >
                                                {q.quesType || "SUBJECTIVE"}
                                            </span>

                                            {/* Subject / Chapter Pills */}
                                            {q.subjectName && (
                                                <span className="text-[11px] text-neutral-300 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-750">
                                                    {q.subjectName}
                                                </span>
                                            )}
                                            {q.chapterName && (
                                                <span className="text-[11px] text-neutral-400 bg-neutral-850 px-2 py-0.5 rounded border border-neutral-800">
                                                    {q.chapterNo ? `Ch ${q.chapterNo}: ` : ""}
                                                    {q.chapterName}
                                                </span>
                                            )}

                                            {/* Source Tag */}
                                            {q.sourceLabel && (
                                                <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 ml-auto truncate max-w-[240px]">
                                                    {q.sourceLabel}
                                                </span>
                                            )}
                                        </div>

                                        {/* Question Text */}
                                        <p className="text-sm text-neutral-100 whitespace-pre-line leading-relaxed font-normal">
                                            {q.quesText}
                                        </p>

                                        {/* Associated Topics & Image notice */}
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            {q.topics && q.topics.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1">
                                                    {q.topics.map((t) => (
                                                        <span
                                                            key={t.topicId}
                                                            className="text-[10px] text-neutral-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800"
                                                        >
                                                            #{t.topicName}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {q.images && q.images.length > 0 && (
                                                <span className="text-[11px] text-neutral-400 flex items-center gap-1 ml-auto">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                                    {q.images.length} attachment(s)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
