import { useId, useMemo, useState } from "react";
import {
    useApiList,
    type DepartmentOption,
    type ExamOption,
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

export default function ExamManagement() {
    const { data: exams, loading, error, retry } = useApiList<ExamOption>("/api/exams");
    const { data: departments, loading: deptsLoading } = useApiList<DepartmentOption>("/api/departments");

    // Modal state for registering exam
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
    const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | null>(null);
    const [examType, setExamType] = useState<(typeof EXAM_TYPES)[number]>("MIDSEM");
    const [examYear, setExamYear] = useState<number>(new Date().getFullYear());
    const [semesterNo, setSemesterNo] = useState<number>(1);
    const [month, setMonth] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);

    // Filter states
    const [deptFilter, setDeptFilter] = useState<number | null>(null);
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    const [notice, setNotice] = useState<{
        kind: "success" | "error";
        message: string;
    } | null>(null);

    // Fetch subjects when department changes in registration modal
    const subjectsPath = selectedDeptId ? `/api/subjects?deptId=${selectedDeptId}` : null;
    const { data: subjects, loading: subjectsLoading } = useApiList<SubjectOption>(subjectsPath);

    // Subject dropdown options
    const subjectComboOptions: ComboOption[] = useMemo(() => {
        return subjects.map((s) => ({
            id: s.subjectKey,
            label: `${s.subjectId} — ${s.subjectName || "Untitled"} (Sem ${s.semester ?? 1})`,
        }));
    }, [subjects]);

    const selectedSubjectOption = useMemo(() => {
        if (!selectedSubjectKey) return null;
        return subjectComboOptions.find((o) => o.id === selectedSubjectKey) ?? null;
    }, [selectedSubjectKey, subjectComboOptions]);

    const handleSubjectChange = (opt: ComboOption | null) => {
        setSelectedSubjectKey(opt ? opt.id : null);
        if (opt) {
            const found = subjects.find((s) => s.subjectKey === opt.id);
            if (found && typeof found.semester === "number") {
                setSemesterNo(found.semester);
            }
        }
    };

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubjectKey) {
            setNotice({ kind: "error", message: "Please select a subject." });
            return;
        }

        setSubmitting(true);
        setNotice(null);

        try {
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
                message: `Exam registered successfully! Assigned Source ID: #${created.sourceId}.`,
            });
            setModalOpen(false);
            retry();
        } catch (err) {
            setNotice({
                kind: "error",
                message: err instanceof Error ? err.message : "Failed to register exam.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredExams = useMemo(() => {
        return exams.filter((e) => {
            if (deptFilter && e.deptId !== deptFilter) return false;
            if (typeFilter !== "ALL" && e.examType !== typeFilter) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                String(e.sourceId).includes(q) ||
                e.examType.toLowerCase().includes(q) ||
                String(e.examYear).includes(q) ||
                (e.subjectId && e.subjectId.toLowerCase().includes(q)) ||
                (e.subjectName && e.subjectName.toLowerCase().includes(q))
            );
        });
    }, [exams, deptFilter, typeFilter, searchQuery]);

    const subjectComboId = useId();

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-semibold text-neutral-100">
                        Exam Management
                    </h3>
                    <p className="text-neutral-400 mt-1">
                        Register academic examinations (`Exam` linked to `Source`) for subjects and question sets.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setNotice(null);
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
                    Register New Exam
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
                    <span>{notice.message}</span>
                    <button
                        onClick={() => setNotice(null)}
                        className="text-xs hover:text-white transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Filter / Search Bar */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={deptFilter ?? ""}
                        onChange={(e) =>
                            setDeptFilter(e.target.value ? Number(e.target.value) : null)
                        }
                        className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-3 py-2 focus:border-red-500 focus:outline-none"
                    >
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                            <option key={d.deptId} value={d.deptId}>
                                {d.deptName}
                            </option>
                        ))}
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-3 py-2 focus:border-red-500 focus:outline-none"
                    >
                        <option value="ALL">All Exam Types</option>
                        {EXAM_TYPES.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 sm:w-64">
                        <input
                            type="text"
                            placeholder="Search by code, subject, year…"
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
                        title="Refresh exams"
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

            {/* Exams Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                {loading && (
                    <div className="p-12 text-center text-neutral-400 space-y-3">
                        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm">Loading exams from database…</p>
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

                {!loading && !error && filteredExams.length === 0 && (
                    <div className="p-12 text-center space-y-2">
                        <p className="text-neutral-300 font-medium">No exams found</p>
                        <p className="text-neutral-500 text-xs max-w-sm mx-auto">
                            {searchQuery || deptFilter || typeFilter !== "ALL"
                                ? "No exams matched your filter criteria."
                                : "No exams currently registered in the database. Click 'Register New Exam' above to add one."}
                        </p>
                    </div>
                )}

                {!loading && !error && filteredExams.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-950/60 text-neutral-400 border-b border-neutral-800 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5 font-medium">Source ID</th>
                                    <th className="px-6 py-3.5 font-medium">Exam Type</th>
                                    <th className="px-6 py-3.5 font-medium">Subject</th>
                                    <th className="px-6 py-3.5 font-medium">Year & Sem</th>
                                    <th className="px-6 py-3.5 font-medium">Month</th>
                                    <th className="px-6 py-3.5 font-medium text-right">Questions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800 text-neutral-200">
                                {filteredExams.map((e) => (
                                    <tr
                                        key={e.sourceId}
                                        className="hover:bg-neutral-800/40 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-mono font-medium text-neutral-300">
                                            #{e.sourceId}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-950/40 text-red-400 border border-red-500/30">
                                                {e.examType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-neutral-100">
                                                {e.subjectId ? `${e.subjectId} — ` : ""}
                                                {e.subjectName ?? `Subject #${e.subjectKey}`}
                                            </div>
                                            {e.deptName && (
                                                <div className="text-xs text-neutral-500">
                                                    {e.deptName}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-neutral-300">
                                            {e.examYear} · Semester {e.semesterNo}
                                        </td>
                                        <td className="px-6 py-4 text-neutral-400">
                                            {e.month ?? "—"}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-neutral-400">
                                            {e.questionCount ?? 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Register Exam */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-exam-title"
                >
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                            <h4 id="modal-exam-title" className="text-lg font-semibold text-neutral-100">
                                Register New Exam
                            </h4>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-neutral-400 hover:text-neutral-200 p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateExam} className="space-y-4">
                            {/* Department Selection */}
                            <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                    Department <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedDeptId ?? ""}
                                    onChange={(e) => {
                                        const d = e.target.value ? Number(e.target.value) : null;
                                        setSelectedDeptId(d);
                                        setSelectedSubjectKey(null);
                                    }}
                                    required
                                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-red-500 focus:outline-none"
                                >
                                    <option value="">Select Department…</option>
                                    {departments.map((d) => (
                                        <option key={d.deptId} value={d.deptId}>
                                            {d.deptName}
                                        </option>
                                    ))}
                                </select>
                                {deptsLoading && (
                                    <p className="text-xs text-neutral-500 mt-1">Loading departments…</p>
                                )}
                            </div>

                            {/* Subject Selection */}
                            <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                    Subject <span className="text-red-500">*</span>
                                </label>
                                <SearchableSelect
                                    id={subjectComboId}
                                    options={subjectComboOptions}
                                    value={selectedSubjectOption}
                                    onChange={handleSubjectChange}
                                    loading={subjectsLoading}
                                    disabled={!selectedDeptId}
                                    placeholder={
                                        selectedDeptId
                                            ? "Search subject by code or name…"
                                            : "Select department first"
                                    }
                                    noun="subjects"
                                />
                            </div>

                            {/* Exam Type & Year */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                        Exam Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={examType}
                                        onChange={(e) =>
                                            setExamType(e.target.value as (typeof EXAM_TYPES)[number])
                                        }
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-red-500 focus:outline-none"
                                    >
                                        {EXAM_TYPES.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                        Exam Year <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min={1950}
                                        max={2100}
                                        value={examYear}
                                        onChange={(e) => setExamYear(Number(e.target.value))}
                                        required
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-red-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Semester & Month */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                        Semester Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={semesterNo}
                                        onChange={(e) => setSemesterNo(Number(e.target.value))}
                                        required
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                        Month (Optional)
                                    </label>
                                    <select
                                        value={month}
                                        onChange={(e) => setMonth(e.target.value)}
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-red-500 focus:outline-none"
                                    >
                                        <option value="">None / Not Specified</option>
                                        {MONTHS.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <p className="text-xs text-neutral-500 pt-1">
                                An associated `Source` record of type `EXAM` and the `Exam` record will be created safely in a single database transaction.
                            </p>

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
                                    disabled={submitting || !selectedSubjectKey}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {submitting && (
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    )}
                                    Register Exam
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
