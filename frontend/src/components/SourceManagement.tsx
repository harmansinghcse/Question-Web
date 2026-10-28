import { useMemo, useState } from "react";
import {
    useApiList,
    type DepartmentOption,
    type ExamOption,
    type BookOption,
    type SourceOption,
    type SubjectOption,
} from "../hooks/useApiList";
import { fetchApi } from "../services/api";
import SearchableSelect, { type ComboOption } from "./SearchableSelect";

const EXAM_TYPES = [
    "MIDSEM",
    "ENDSEM",
    "QUIZ",
    "ASSIGNMENT",
    "TUTORIAL",
] as const;

const MONTHS = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
] as const;

export default function SourceManagement() {
    const { data: sources, loading, error, retry } = useApiList<SourceOption>("/api/sources");

    const [selectedType, setSelectedType] = useState<"EXAM" | "BOOK">("EXAM");
    const [submitting, setSubmitting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "EXAM" | "BOOK">("ALL");

    // Exam-specific form state
    const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
    const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | null>(null);
    const [examType, setExamType] = useState<(typeof EXAM_TYPES)[number]>("MIDSEM");
    const [examYear, setExamYear] = useState<number>(new Date().getFullYear());
    const [semesterNo, setSemesterNo] = useState<number>(1);
    const [month, setMonth] = useState<string>("");

    // Book-specific form state
    const [bookName, setBookName] = useState("");
    const [authorName, setAuthorName] = useState("");

    const [notice, setNotice] = useState<{
        kind: "success" | "error";
        message: string;
    } | null>(null);

    // Dynamic department and subject loading for exam source creation
    const { data: departments, loading: deptsLoading } = useApiList<DepartmentOption>("/api/departments");
    const subjectsPath = selectedDeptId ? `/api/subjects?deptId=${selectedDeptId}` : null;
    const { data: subjects, loading: subjectsLoading } = useApiList<SubjectOption>(subjectsPath);

    const deptComboOptions: ComboOption[] = useMemo(
        () => departments.map((d) => ({ id: d.deptId, label: d.deptName })),
        [departments],
    );

    const subjectComboOptions: ComboOption[] = useMemo(
        () =>
            subjects.map((s) => ({
                id: s.subjectKey,
                label: `${s.subjectId} — ${s.subjectName || "Untitled"} (Sem ${s.semester ?? 1})`,
            })),
        [subjects],
    );

    const selectedDeptOption = useMemo(
        () => deptComboOptions.find((o) => o.id === selectedDeptId) ?? null,
        [deptComboOptions, selectedDeptId],
    );

    const selectedSubjectOption = useMemo(
        () => subjectComboOptions.find((o) => o.id === selectedSubjectKey) ?? null,
        [subjectComboOptions, selectedSubjectKey],
    );

    const resetModalFields = () => {
        setSelectedDeptId(null);
        setSelectedSubjectKey(null);
        setExamType("MIDSEM");
        setExamYear(new Date().getFullYear());
        setSemesterNo(1);
        setMonth("");
        setBookName("");
        setAuthorName("");
    };

    const handleCreateSource = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setNotice(null);

        try {
            if (selectedType === "EXAM") {
                if (!selectedSubjectKey) {
                    setNotice({
                        kind: "error",
                        message: "Please select a subject for the exam source.",
                    });
                    setSubmitting(false);
                    return;
                }

                const created = await fetchApi<ExamOption>("/api/exams", {
                    method: "POST",
                    body: JSON.stringify({
                        subjectKey: selectedSubjectKey,
                        examType,
                        examYear: Number(examYear),
                        semesterNo: Number(semesterNo),
                        month: month ? month : undefined,
                    }),
                });

                setNotice({
                    kind: "success",
                    message: `Exam Source #${created.sourceId} created successfully: ${created.label || `${created.examType} ${created.examYear}`}.`,
                });
            } else {
                const trimmedBook = bookName.trim();
                const trimmedAuthor = authorName.trim();

                if (!trimmedBook || !trimmedAuthor) {
                    setNotice({
                        kind: "error",
                        message: "Both book title and author name are required for a book source.",
                    });
                    setSubmitting(false);
                    return;
                }

                const created = await fetchApi<BookOption>("/api/books", {
                    method: "POST",
                    body: JSON.stringify({
                        bookName: trimmedBook,
                        authorName: trimmedAuthor,
                    }),
                });

                setNotice({
                    kind: "success",
                    message: `Book Source #${created.sourceId} created successfully: "${created.bookName}" by ${created.authorName}.`,
                });
            }

            setModalOpen(false);
            resetModalFields();
            retry();
        } catch (err) {
            setNotice({
                kind: "error",
                message: err instanceof Error ? err.message : "Failed to create source.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredSources = useMemo(() => {
        return sources.filter((s) => {
            if (typeFilter !== "ALL" && s.sourceType !== typeFilter) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                String(s.sourceId).includes(q) ||
                s.sourceType.toLowerCase().includes(q) ||
                (s.label && s.label.toLowerCase().includes(q))
            );
        });
    }, [sources, typeFilter, searchQuery]);

    const examCount = useMemo(() => sources.filter((s) => s.sourceType === "EXAM").length, [sources]);
    const bookCount = useMemo(() => sources.filter((s) => s.sourceType === "BOOK").length, [sources]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-semibold text-neutral-100">
                        Source Management
                    </h3>
                    <p className="text-neutral-400 mt-1">
                        Register and inspect global source identifiers (`Source` entity) for exams and books.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setNotice(null);
                        resetModalFields();
                        setModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12h8" />
                        <path d="M12 8v8" />
                    </svg>
                    New Source Record
                </button>
            </div>

            {/* Notification Banner */}
            {notice && (
                <div
                    role="alert"
                    className={`flex items-center justify-between gap-3 px-5 py-4 rounded-xl border ${
                        notice.kind === "success"
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                            : "bg-red-950/20 border-red-500/30 text-red-400"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <span>{notice.message}</span>
                    </div>
                    <button
                        onClick={() => setNotice(null)}
                        className="text-xs hover:text-white transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500/80" />
                    <p className="text-sm font-medium text-neutral-400 mb-1">Total Sources</p>
                    <p className="text-3xl font-semibold text-neutral-100">{sources.length}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/80" />
                    <p className="text-sm font-medium text-neutral-400 mb-1">Exam Sources</p>
                    <p className="text-3xl font-semibold text-neutral-100">{examCount}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/80" />
                    <p className="text-sm font-medium text-neutral-400 mb-1">Book Sources</p>
                    <p className="text-3xl font-semibold text-neutral-100">{bookCount}</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    {(["ALL", "EXAM", "BOOK"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                typeFilter === t
                                    ? "bg-neutral-800 text-neutral-100 border border-neutral-700"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                        >
                            {t === "ALL" ? "All Types" : t}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 sm:w-64">
                        <input
                            type="text"
                            placeholder="Filter sources…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <button
                        onClick={retry}
                        title="Refresh sources"
                        className="p-2 text-neutral-400 hover:text-neutral-100 bg-neutral-800 border border-neutral-700 rounded-lg transition-colors"
                    >
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
                        >
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                            <path d="M16 21h5v-5" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Sources Table / List */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                {loading && (
                    <div className="p-12 text-center text-neutral-400 space-y-3">
                        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm">Loading sources from database…</p>
                    </div>
                )}

                {error && (
                    <div className="p-8 text-center space-y-3">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button
                            onClick={retry}
                            className="px-3 py-1.5 bg-neutral-800 text-xs font-medium text-neutral-200 rounded-md border border-neutral-700 hover:bg-neutral-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && filteredSources.length === 0 && (
                    <div className="p-12 text-center space-y-2">
                        <p className="text-neutral-300 font-medium">No source records found</p>
                        <p className="text-neutral-500 text-xs max-w-sm mx-auto">
                            {searchQuery || typeFilter !== "ALL"
                                ? "No sources matched your filter criteria."
                                : "No sources currently exist in the database. Click 'New Source Record' above to create one."}
                        </p>
                    </div>
                )}

                {!loading && !error && filteredSources.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-950/60 text-neutral-400 border-b border-neutral-800 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5 font-medium">Source ID</th>
                                    <th className="px-6 py-3.5 font-medium">Type</th>
                                    <th className="px-6 py-3.5 font-medium">Associated Details</th>
                                    <th className="px-6 py-3.5 font-medium text-right">Questions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800 text-neutral-200">
                                {filteredSources.map((s) => (
                                    <tr
                                        key={s.sourceId}
                                        className="hover:bg-neutral-800/40 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-mono font-medium text-neutral-300">
                                            #{s.sourceId}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                    s.sourceType === "EXAM"
                                                        ? "bg-blue-950/30 text-blue-400 border-blue-500/30"
                                                        : "bg-amber-950/30 text-amber-400 border-amber-500/30"
                                                }`}
                                            >
                                                {s.sourceType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-neutral-200 font-medium">{s.label}</p>
                                            {s.sourceType === "EXAM" && s.subjectId && (
                                                <p className="text-xs text-neutral-400 mt-0.5">
                                                    {s.subjectId} {s.subjectName ? `· ${s.subjectName}` : ""}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-neutral-400">
                                            {s.questionCount ?? 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: New Source Record */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-source-title"
                >
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                            <h4 id="modal-source-title" className="text-lg font-semibold text-neutral-100">
                                Create Source Record
                            </h4>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-neutral-400 hover:text-neutral-200 p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSource} className="space-y-5">
                            {/* Source Type selector */}
                            <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-2">
                                    Source Type
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["EXAM", "BOOK"] as const).map((type) => (
                                        <button
                                            type="button"
                                            key={type}
                                            onClick={() => {
                                                setSelectedType(type);
                                                setNotice(null);
                                            }}
                                            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all text-center flex flex-col items-center gap-1 ${
                                                selectedType === type
                                                    ? "bg-red-950/40 border-red-500/60 text-red-200 ring-1 ring-red-500"
                                                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                                            }`}
                                        >
                                            <span className="font-semibold">{type}</span>
                                            <span className="text-[11px] text-neutral-400">
                                                {type === "EXAM" ? "Midsem, Endsem, Quiz" : "Textbook reference"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* EXAM fields */}
                            {selectedType === "EXAM" && (
                                <div className="space-y-4">
                                    {/* Department */}
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                            Department <span className="text-red-500">*</span>
                                        </label>
                                        {deptsLoading ? (
                                            <p className="text-xs text-neutral-500">Loading departments…</p>
                                        ) : (
                                            <SearchableSelect
                                                id="modal-source-dept"
                                                options={deptComboOptions}
                                                value={selectedDeptOption}
                                                onChange={(opt) => {
                                                    setSelectedDeptId(opt ? opt.id : null);
                                                    setSelectedSubjectKey(null);
                                                }}
                                                placeholder="Select department…"
                                            />
                                        )}
                                    </div>

                                    {/* Subject */}
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                            Subject <span className="text-red-500">*</span>
                                        </label>
                                        {subjectsLoading ? (
                                            <p className="text-xs text-neutral-500">Loading subjects…</p>
                                        ) : (
                                            <SearchableSelect
                                                id="modal-source-subject"
                                                options={subjectComboOptions}
                                                value={selectedSubjectOption}
                                                onChange={(opt) => {
                                                    setSelectedSubjectKey(opt ? opt.id : null);
                                                    if (opt) {
                                                        const found = subjects.find((s) => s.subjectKey === opt.id);
                                                        if (found && typeof found.semester === "number") {
                                                            setSemesterNo(found.semester);
                                                        }
                                                    }
                                                }}
                                                placeholder={selectedDeptId ? "Select subject…" : "Select department first"}
                                                disabled={!selectedDeptId}
                                            />
                                        )}
                                    </div>

                                    {/* Exam Type */}
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                            Exam Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={examType}
                                            onChange={(e) => setExamType(e.target.value as (typeof EXAM_TYPES)[number])}
                                            className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/60"
                                        >
                                            {EXAM_TYPES.map((t) => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Exam Year & Semester */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                                Year <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={1950}
                                                max={2100}
                                                value={examYear}
                                                onChange={(e) => setExamYear(Number(e.target.value))}
                                                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/60"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                                Semester <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={semesterNo}
                                                onChange={(e) => setSemesterNo(Number(e.target.value))}
                                                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/60"
                                            />
                                        </div>
                                    </div>

                                    {/* Month (optional) */}
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                            Month (optional)
                                        </label>
                                        <select
                                            value={month}
                                            onChange={(e) => setMonth(e.target.value)}
                                            className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/60"
                                        >
                                            <option value="">— None —</option>
                                            {MONTHS.map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* BOOK fields */}
                            {selectedType === "BOOK" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                            Book Title <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={bookName}
                                            onChange={(e) => setBookName(e.target.value)}
                                            placeholder="e.g. Introduction to Algorithms"
                                            className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/60"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                            Author Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={authorName}
                                            onChange={(e) => setAuthorName(e.target.value)}
                                            placeholder="e.g. Cormen, Leiserson, Rivest, Stein"
                                            className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/60"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Inline error notice */}
                            {notice && notice.kind === "error" && (
                                <p className="text-xs text-red-400 bg-red-950/20 border border-red-500/30 rounded-lg px-3 py-2">
                                    {notice.message}
                                </p>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 text-sm text-neutral-300 hover:text-white bg-neutral-800 border border-neutral-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {submitting && (
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    )}
                                    {selectedType === "EXAM" ? "Register Exam Source" : "Register Book Source"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
