import { useState, useEffect } from "react";
import { fetchApi } from "../services/api";

interface AdminQuizItem {
    quizQuesId: number;
    questionType: "MCQ" | "FILLUPS" | "TRUE_FALSE";
    quesText: string;
    options?: Record<string, string> | null;
    correctAnswer: string;
    acceptedAnswers?: string[] | null;
    explanation: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    chapterId: number;
    chapterName?: string;
    subjectName?: string;
    topics: { topicId: number; topicName: string }[];
    createdAt: string;
}

interface ChapterOption {
    chapterId: number;
    chapterNo: number;
    chapterName: string;
    subjectKey: number;
}

interface SubjectOption {
    subjectKey: number;
    subjectName: string;
    semester: number;
}

export default function QuizAdminManagement() {
    const [activeTab, setActiveTab] = useState<"browse" | "import">("browse");

    // Browser state
    const [questions, setQuestions] = useState<AdminQuizItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [filterDifficulty, setFilterDifficulty] = useState<string>("");
    const [filterType, setFilterType] = useState<string>("");

    // Metadata filters
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [chapters, setChapters] = useState<ChapterOption[]>([]);
    const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | "">("");
    const [selectedChapterId, setSelectedChapterId] = useState<number | "">("");

    // Edit modal
    const [editingQuestion, setEditingQuestion] = useState<AdminQuizItem | null>(null);
    const [editForm, setEditForm] = useState<{
        questionType: "MCQ" | "FILLUPS" | "TRUE_FALSE";
        quesText: string;
        options: Record<string, string>;
        correctAnswer: string;
        acceptedAnswersText: string;
        explanation: string;
        difficulty: "EASY" | "MEDIUM" | "HARD";
    }>({
        questionType: "MCQ",
        quesText: "",
        options: { A: "", B: "", C: "", D: "" },
        correctAnswer: "A",
        acceptedAnswersText: "",
        explanation: "",
        difficulty: "MEDIUM",
    });
    const [savingEdit, setSavingEdit] = useState(false);
    const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Batch Import state
    const [importJsonText, setImportJsonText] = useState("");
    const [importing, setImporting] = useState(false);
    const [importReport, setImportReport] = useState<{
        totalReceived: number;
        inserted: number;
        skippedDuplicates: number;
        failedValidation: number;
        errors: { index: number; reason: string; quesTextSnippet: string }[];
    } | null>(null);

    // 1. Load subjects and chapters for filtering
    useEffect(() => {
        async function loadMeta() {
            try {
                const res = await fetchApi<{ subjects: SubjectOption[]; chapters: ChapterOption[] }>("/api/quiz/filters");
                setSubjects(res.subjects || []);
                setChapters(res.chapters || []);
            } catch (err) {
                console.error("Failed to load metadata:", err);
            }
        }
        loadMeta();
    }, []);

    // 2. Fetch questions
    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("page", String(page));
            params.append("limit", "15");
            if (search.trim()) params.append("search", search.trim());
            if (selectedSubjectKey) params.append("subjectKey", String(selectedSubjectKey));
            if (selectedChapterId) params.append("chapterId", String(selectedChapterId));
            if (filterDifficulty) params.append("difficulty", filterDifficulty);
            if (filterType) params.append("questionType", filterType);

            const res = await fetchApi<{ items: AdminQuizItem[]; total: number }>(
                `/api/quiz/admin/questions?${params.toString()}`
            );
            setQuestions(res.items || []);
            setTotal(res.total || 0);
        } catch (err) {
            console.error("Failed to fetch admin questions:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "browse") {
            fetchQuestions();
        }
    }, [page, search, selectedSubjectKey, selectedChapterId, filterDifficulty, filterType, activeTab]);

    // Handle Edit Click
    const handleOpenEdit = (q: AdminQuizItem) => {
        setEditingQuestion(q);
        setEditForm({
            questionType: q.questionType || "MCQ",
            quesText: q.quesText,
            options: q.options ? { ...q.options } : { A: "", B: "", C: "", D: "" },
            correctAnswer: q.correctAnswer || "A",
            acceptedAnswersText: (q.acceptedAnswers || []).join(", "),
            explanation: q.explanation || "",
            difficulty: q.difficulty || "MEDIUM",
        });
        setActionMsg(null);
    };

    // Save Edit
    const handleSaveEdit = async () => {
        if (!editingQuestion) return;
        setSavingEdit(true);
        setActionMsg(null);
        try {
            const payload: Record<string, unknown> = {
                questionType: editForm.questionType,
                quesText: editForm.quesText,
                explanation: editForm.explanation,
                difficulty: editForm.difficulty,
            };

            if (editForm.questionType === "MCQ") {
                payload.options = editForm.options;
                payload.correctAnswer = editForm.correctAnswer;
                payload.acceptedAnswers = null;
            } else if (editForm.questionType === "FILLUPS") {
                payload.options = null;
                payload.correctAnswer = editForm.correctAnswer.trim();
                const alts = editForm.acceptedAnswersText
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                payload.acceptedAnswers = alts.length > 0 ? alts : [editForm.correctAnswer.trim()];
            } else if (editForm.questionType === "TRUE_FALSE") {
                payload.options = null;
                payload.correctAnswer = editForm.correctAnswer.toUpperCase() === "TRUE" ? "TRUE" : "FALSE";
                payload.acceptedAnswers = null;
            }

            await fetchApi(`/api/quiz/admin/questions/${editingQuestion.quizQuesId}`, {
                method: "PATCH",
                body: JSON.stringify(payload),
            });
            setActionMsg({ type: "success", text: "Question updated successfully!" });
            setEditingQuestion(null);
            fetchQuestions();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to update question.";
            setActionMsg({ type: "error", text: msg });
        } finally {
            setSavingEdit(false);
        }
    };

    // Delete Question
    const handleDelete = async (id: number) => {
        if (!window.confirm(`Are you sure you want to delete Quiz Question #${id}? This cannot be undone.`)) {
            return;
        }
        try {
            await fetchApi(`/api/quiz/admin/questions/${id}`, { method: "DELETE" });
            fetchQuestions();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to delete question.");
        }
    };

    // Execute Batch Import
    const handleExecuteImport = async () => {
        if (!importJsonText.trim()) return;
        setImporting(true);
        setImportReport(null);
        setActionMsg(null);

        try {
            let parsed: any;
            try {
                parsed = JSON.parse(importJsonText);
            } catch {
                throw new Error("Invalid JSON format. Please check your syntax.");
            }

            const payload = Array.isArray(parsed)
                ? { questions: parsed }
                : parsed.questions
                ? parsed
                : { questions: [parsed] };

            const report = await fetchApi<{
                totalReceived: number;
                inserted: number;
                skippedDuplicates: number;
                failedValidation: number;
                errors: { index: number; reason: string; quesTextSnippet: string }[];
            }>("/api/quiz/admin/import", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            setImportReport(report);
            if (report.inserted > 0) {
                fetchQuestions();
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Import failed.";
            setActionMsg({ type: "error", text: msg });
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Quiz Question Management</h2>
                    <p className="text-xs text-neutral-400 mt-1">
                        Inspect, edit, delete, and batch-import MCQs, Fill-in-the-Blanks, and True/False questions.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                    <button
                        type="button"
                        onClick={() => setActiveTab("browse")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            activeTab === "browse"
                                ? "bg-red-600 text-white font-semibold"
                                : "text-neutral-400 hover:text-white"
                        }`}
                    >
                        Browse & Edit ({total})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("import")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            activeTab === "import"
                                ? "bg-red-600 text-white font-semibold"
                                : "text-neutral-400 hover:text-white"
                        }`}
                    >
                        AI Batch Importer
                    </button>
                </div>
            </div>

            {/* Notification messages */}
            {actionMsg && (
                <div
                    className={`p-4 rounded-xl text-xs flex items-center justify-between ${
                        actionMsg.type === "success"
                            ? "bg-emerald-950/30 border border-emerald-500/30 text-emerald-300"
                            : "bg-red-950/30 border border-red-500/30 text-red-300"
                    }`}
                >
                    <span>{actionMsg.text}</span>
                    <button onClick={() => setActionMsg(null)} className="underline ml-4">
                        Dismiss
                    </button>
                </div>
            )}

            {/* TAB 1: BROWSER */}
            {activeTab === "browse" && (
                <div className="space-y-4">
                    {/* Filters bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                        <div>
                            <input
                                type="text"
                                placeholder="Search text..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none focus:border-red-500"
                            />
                        </div>

                        <div>
                            <select
                                value={selectedSubjectKey}
                                onChange={(e) => {
                                    setSelectedSubjectKey(e.target.value ? Number(e.target.value) : "");
                                    setSelectedChapterId("");
                                }}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none focus:border-red-500"
                            >
                                <option value="">All Subjects</option>
                                {subjects.map((s) => (
                                    <option key={s.subjectKey} value={s.subjectKey}>
                                        {s.subjectName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select
                                value={selectedChapterId}
                                onChange={(e) => setSelectedChapterId(e.target.value ? Number(e.target.value) : "")}
                                disabled={!selectedSubjectKey}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none focus:border-red-500 disabled:opacity-50"
                            >
                                <option value="">All Chapters</option>
                                {chapters
                                    .filter((c) => !selectedSubjectKey || c.subjectKey === selectedSubjectKey)
                                    .map((c) => (
                                        <option key={c.chapterId} value={c.chapterId}>
                                            Ch {c.chapterNo}: {c.chapterName}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none focus:border-red-500"
                            >
                                <option value="">All Question Types</option>
                                <option value="MCQ">MCQ</option>
                                <option value="FILLUPS">Fill in the Blanks</option>
                                <option value="TRUE_FALSE">True / False</option>
                            </select>
                        </div>

                        <div>
                            <select
                                value={filterDifficulty}
                                onChange={(e) => setFilterDifficulty(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none focus:border-red-500"
                            >
                                <option value="">All Difficulties</option>
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                            </select>
                        </div>
                    </div>

                    {/* Questions Table */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-xs text-neutral-500 animate-pulse">
                                Loading questions...
                            </div>
                        ) : questions.length === 0 ? (
                            <div className="p-8 text-center text-xs text-neutral-500">
                                No questions found matching current filters.
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-800">
                                {questions.map((q) => (
                                    <div
                                        key={q.quizQuesId}
                                        className="p-4 hover:bg-neutral-850 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-xs text-red-400 font-bold">
                                                    #{q.quizQuesId}
                                                </span>
                                                <span
                                                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                                        q.questionType === "FILLUPS"
                                                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                                            : q.questionType === "TRUE_FALSE"
                                                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                    }`}
                                                >
                                                    {q.questionType === "FILLUPS"
                                                        ? "Fill-in"
                                                        : q.questionType === "TRUE_FALSE"
                                                        ? "T/F"
                                                        : "MCQ"}
                                                </span>
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                                                        q.difficulty === "EASY"
                                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                            : q.difficulty === "HARD"
                                                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                    }`}
                                                >
                                                    {q.difficulty}
                                                </span>
                                                <span className="text-xs text-neutral-400 font-medium truncate">
                                                    {q.chapterName}
                                                </span>
                                                <span className="text-xs text-emerald-400 font-mono">
                                                    (Ans: {q.correctAnswer})
                                                </span>
                                            </div>

                                            <p className="text-sm text-neutral-200 line-clamp-2">
                                                {q.quesText}
                                            </p>

                                            {/* Type-specific details */}
                                            {q.questionType === "MCQ" && q.options && (
                                                <div className="text-xs text-neutral-500 flex flex-wrap gap-2 pt-1">
                                                    {Object.entries(q.options).map(([k, text]) => (
                                                        <span key={k} className="bg-neutral-950 px-2 py-0.5 rounded text-[11px] text-neutral-400">
                                                            <strong className={k === q.correctAnswer ? "text-emerald-400" : "text-neutral-500"}>
                                                                {k}:
                                                            </strong>{" "}
                                                            {text.substring(0, 30)}
                                                            {text.length > 30 ? "..." : ""}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {q.questionType === "FILLUPS" && q.acceptedAnswers && (
                                                <div className="text-xs text-neutral-400 flex items-center gap-1.5 pt-1">
                                                    <span className="text-[11px] text-neutral-500 font-medium">Accepted:</span>
                                                    {q.acceptedAnswers.map((ans, i) => (
                                                        <span key={i} className="bg-neutral-950 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-[11px] font-mono">
                                                            {ans}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(q)}
                                                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(q.quizQuesId)}
                                                className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-300 text-xs font-medium rounded-lg border border-red-500/30 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {total > 15 && (
                        <div className="flex items-center justify-between text-xs text-neutral-400 pt-2">
                            <span>
                                Showing {questions.length} of {total} questions
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={page === 1}
                                    onClick={() => setPage((p) => p - 1)}
                                    className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded disabled:opacity-30"
                                >
                                    Previous
                                </button>
                                <span className="font-mono">Page {page}</span>
                                <button
                                    type="button"
                                    disabled={page * 15 >= total}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded disabled:opacity-30"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: AI BATCH IMPORTER */}
            {activeTab === "import" && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6">
                    <div>
                        <h3 className="text-base font-semibold text-white">Import Multi-Format Questions via JSON</h3>
                        <p className="text-xs text-neutral-400 mt-1">
                            Paste validated questions in JSON format. Supports <strong>MCQ</strong>, <strong>FILLUPS</strong>, and <strong>TRUE_FALSE</strong> formats. The importer verifies hierarchy, validates schemas, and skips duplicates.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <textarea
                            rows={14}
                            value={importJsonText}
                            onChange={(e) => setImportJsonText(e.target.value)}
                            placeholder={`{\n  "modelName": "Claude-3.5-Sonnet",\n  "batchId": "BATCH-002",\n  "questions": [\n    {\n      "questionType": "MCQ",\n      "quesText": "Which data structure follows FIFO?",\n      "options": { "A": "Stack", "B": "Queue", "C": "Tree", "D": "Graph" },\n      "correctAnswer": "B",\n      "explanation": "A queue follows First-In First-Out.",\n      "difficulty": "EASY",\n      "chapterId": 1\n    },\n    {\n      "questionType": "FILLUPS",\n      "quesText": "The worst-case time complexity of quicksort is ____.",\n      "acceptedAnswers": ["O(n^2)", "O(n2)", "quadratic"],\n      "explanation": "Quicksort degrades to O(n^2) when poor pivots are chosen.",\n      "difficulty": "MEDIUM",\n      "chapterId": 1\n    },\n    {\n      "questionType": "TRUE_FALSE",\n      "quesText": "Every tree is a connected graph.",\n      "correctAnswer": true,\n      "explanation": "A tree is by definition a connected acyclic graph.",\n      "difficulty": "EASY",\n      "chapterId": 1\n    }\n  ]\n}`}
                            className="w-full bg-neutral-950 font-mono text-xs text-neutral-200 border border-neutral-800 focus:border-red-500 rounded-xl p-4 outline-none transition-colors"
                        ></textarea>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">
                            Safe import: Invalid rows are reported and valid rows are committed transactionally.
                        </span>
                        <button
                            type="button"
                            disabled={importing || !importJsonText.trim()}
                            onClick={handleExecuteImport}
                            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors disabled:opacity-40"
                        >
                            {importing ? "Importing & Validating..." : "Execute Batch Import"}
                        </button>
                    </div>

                    {/* Import Report Results */}
                    {importReport && (
                        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
                            <h4 className="text-sm font-semibold text-white">Import Execution Summary</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div className="p-3 bg-neutral-900 rounded-lg">
                                    <span className="block text-xs text-neutral-400">Total Received</span>
                                    <span className="text-lg font-bold text-white">{importReport.totalReceived}</span>
                                </div>
                                <div className="p-3 bg-neutral-900 rounded-lg border border-emerald-500/20">
                                    <span className="block text-xs text-emerald-400">Inserted</span>
                                    <span className="text-lg font-bold text-emerald-400">{importReport.inserted}</span>
                                </div>
                                <div className="p-3 bg-neutral-900 rounded-lg border border-amber-500/20">
                                    <span className="block text-xs text-amber-400">Duplicates Skipped</span>
                                    <span className="text-lg font-bold text-amber-400">{importReport.skippedDuplicates}</span>
                                </div>
                                <div className="p-3 bg-neutral-900 rounded-lg border border-red-500/20">
                                    <span className="block text-xs text-red-400">Validation Failures</span>
                                    <span className="text-lg font-bold text-red-400">{importReport.failedValidation}</span>
                                </div>
                            </div>

                            {importReport.errors.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-neutral-800">
                                    <span className="text-xs font-semibold text-neutral-400">Error Details:</span>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {importReport.errors.map((err, i) => (
                                            <p key={i} className="text-xs text-neutral-400 bg-neutral-900 p-2 rounded">
                                                <strong className="text-red-400">#{err.index}:</strong> {err.reason}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* EDIT QUESTION MODAL */}
            {editingQuestion && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                            <h4 className="text-base font-bold text-white">
                                Edit Quiz Question #{editingQuestion.quizQuesId}
                            </h4>
                            <button
                                onClick={() => setEditingQuestion(null)}
                                className="text-neutral-500 hover:text-white text-xs"
                            >
                                ✕ Close
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                                        Question Type
                                    </label>
                                    <select
                                        value={editForm.questionType}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                questionType: e.target.value as "MCQ" | "FILLUPS" | "TRUE_FALSE",
                                                correctAnswer:
                                                    e.target.value === "TRUE_FALSE"
                                                        ? "TRUE"
                                                        : e.target.value === "MCQ"
                                                        ? "A"
                                                        : "",
                                            }))
                                        }
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 outline-none focus:border-red-500 font-semibold text-red-400"
                                    >
                                        <option value="MCQ">Multiple Choice (MCQ)</option>
                                        <option value="FILLUPS">Fill in the Blanks</option>
                                        <option value="TRUE_FALSE">True / False</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                                        Difficulty
                                    </label>
                                    <select
                                        value={editForm.difficulty}
                                        onChange={(e) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                difficulty: e.target.value as "EASY" | "MEDIUM" | "HARD",
                                            }))
                                        }
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 outline-none focus:border-red-500"
                                    >
                                        <option value="EASY">Easy</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HARD">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1">
                                    Question Text
                                </label>
                                <textarea
                                    rows={3}
                                    value={editForm.quesText}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, quesText: e.target.value }))}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 outline-none focus:border-red-500"
                                />
                            </div>

                            {/* Type Specific Fields */}
                            {editForm.questionType === "MCQ" && (
                                <>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-neutral-400">Options</label>
                                        {["A", "B", "C", "D"].map((key) => (
                                            <div key={key} className="flex items-center gap-2">
                                                <span className="w-6 text-xs font-bold text-neutral-400">{key}:</span>
                                                <input
                                                    type="text"
                                                    value={editForm.options[key] || ""}
                                                    onChange={(e) =>
                                                        setEditForm((prev) => ({
                                                            ...prev,
                                                            options: { ...prev.options, [key]: e.target.value },
                                                        }))
                                                    }
                                                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-red-500"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-neutral-400 mb-1">
                                            Correct Option
                                        </label>
                                        <select
                                            value={editForm.correctAnswer}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({ ...prev, correctAnswer: e.target.value }))
                                            }
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 outline-none focus:border-red-500"
                                        >
                                            {["A", "B", "C", "D"].map((k) => (
                                                <option key={k} value={k}>
                                                    Option {k}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {editForm.questionType === "FILLUPS" && (
                                <div className="space-y-3 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800">
                                    <div>
                                        <label className="block text-xs font-medium text-purple-300 mb-1">
                                            Primary Expected Answer
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.correctAnswer}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({ ...prev, correctAnswer: e.target.value }))
                                            }
                                            placeholder="e.g. Binary Search Tree"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none focus:border-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-purple-300 mb-1">
                                            Alternative Accepted Answers (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.acceptedAnswersText}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    acceptedAnswersText: e.target.value,
                                                }))
                                            }
                                            placeholder="e.g. BST, binary-search-tree"
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none focus:border-purple-500"
                                        />
                                        <span className="text-[10px] text-neutral-500 mt-1 block">
                                            Normalized grading matches case-insensitively and handles spacing around punctuation automatically.
                                        </span>
                                    </div>
                                </div>
                            )}

                            {editForm.questionType === "TRUE_FALSE" && (
                                <div className="space-y-2 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800">
                                    <label className="block text-xs font-medium text-amber-300 mb-1">
                                        Correct Statement Value
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setEditForm((prev) => ({ ...prev, correctAnswer: "TRUE" }))}
                                            className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                                                editForm.correctAnswer.toUpperCase() === "TRUE"
                                                    ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                                                    : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                                            }`}
                                        >
                                            TRUE
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditForm((prev) => ({ ...prev, correctAnswer: "FALSE" }))}
                                            className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                                                editForm.correctAnswer.toUpperCase() === "FALSE"
                                                    ? "bg-red-600 text-white border-red-500 shadow-md"
                                                    : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                                            }`}
                                        >
                                            FALSE
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1">
                                    Explanation
                                </label>
                                <textarea
                                    rows={3}
                                    value={editForm.explanation}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, explanation: e.target.value }))
                                    }
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 outline-none focus:border-red-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                            <button
                                type="button"
                                onClick={() => setEditingQuestion(null)}
                                className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={savingEdit}
                                onClick={handleSaveEdit}
                                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
                            >
                                {savingEdit ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
