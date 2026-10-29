import { useId, useMemo, useState } from "react";
import {
    useApiList,
    type DepartmentOption,
    type SubjectOption,
    type UpcomingExamOption,
} from "../hooks/useApiList";
import { fetchApi } from "../services/api";
import SearchableSelect, { type ComboOption } from "./SearchableSelect";

export default function UpcomingExamManagement() {
    const {
        data: exams,
        loading,
        error,
        retry,
    } = useApiList<UpcomingExamOption>("/api/upcoming-exams");
    const { data: departments } =
        useApiList<DepartmentOption>("/api/departments");

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form state
    const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
    const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | null>(
        null,
    );
    const [semester, setSemester] = useState<number | "">("");
    const [title, setTitle] = useState("");
    const [examDate, setExamDate] = useState("");
    const [durationMinutes, setDurationMinutes] = useState<number>(120);
    const [venue, setVenue] = useState("");
    const [instructions, setInstructions] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState<number | null>(null);

    const [notice, setNotice] = useState<{
        kind: "success" | "error";
        message: string;
    } | null>(null);

    // Fetch subjects dynamically based on selected department in form
    const subjectsPath = selectedDeptId
        ? `/api/subjects?deptId=${selectedDeptId}`
        : null;
    const { data: subjects, loading: subjectsLoading } =
        useApiList<SubjectOption>(subjectsPath);

    const subjectComboOptions: ComboOption[] = useMemo(() => {
        return subjects.map((s) => ({
            id: s.subjectKey,
            label: `${s.subjectId}   ${s.subjectName || "Untitled"} (Sem ${s.semester ?? 1})`,
        }));
    }, [subjects]);

    const selectedSubjectOption = useMemo(() => {
        if (!selectedSubjectKey) return null;
        return (
            subjectComboOptions.find((o) => o.id === selectedSubjectKey) ?? null
        );
    }, [selectedSubjectKey, subjectComboOptions]);

    const handleSubjectChange = (opt: ComboOption | null) => {
        setSelectedSubjectKey(opt ? opt.id : null);
        if (opt) {
            const found = subjects.find((s) => s.subjectKey === opt.id);
            if (found && typeof found.semester === "number") {
                setSemester(found.semester);
            }
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setSelectedDeptId(null);
        setSelectedSubjectKey(null);
        setSemester("");
        setTitle("");
        setExamDate("");
        setDurationMinutes(120);
        setVenue("");
        setInstructions("");
        setNotice(null);
    };

    const openEditModal = (exam: UpcomingExamOption) => {
        setEditingId(exam.examId);
        setSelectedDeptId(exam.deptId);
        setSelectedSubjectKey(exam.subjectKey ?? null);
        setSemester(exam.semester ?? "");
        setTitle(exam.title);
        // Format ISO date string to YYYY-MM-DDThh:mm for datetime-local input
        const dateObj = new Date(exam.examDate);
        dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
        setExamDate(dateObj.toISOString().slice(0, 16));
        setDurationMinutes(exam.durationMinutes);
        setVenue(exam.venue ?? "");
        setInstructions(exam.instructions ?? "");
        setNotice(null);
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeptId || !title.trim() || !examDate) {
            setNotice({
                kind: "error",
                message: "Please fill in all required fields.",
            });
            return;
        }

        setSubmitting(true);
        setNotice(null);

        try {
            const payload = {
                deptId: selectedDeptId,
                subjectKey: selectedSubjectKey || undefined,
                semester: semester === "" ? undefined : Number(semester),
                title: title.trim(),
                examDate: new Date(examDate).toISOString(),
                durationMinutes: Number(durationMinutes),
                venue: venue.trim() || undefined,
                instructions: instructions.trim() || undefined,
            };

            if (editingId) {
                await fetchApi(`/api/upcoming-exams/${editingId}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                });
                setNotice({
                    kind: "success",
                    message: "Upcoming exam updated successfully.",
                });
            } else {
                await fetchApi("/api/upcoming-exams", {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                setNotice({
                    kind: "success",
                    message: "Upcoming exam scheduled successfully.",
                });
            }

            setModalOpen(false);
            resetForm();
            retry();
        } catch (err) {
            setNotice({
                kind: "error",
                message:
                    err instanceof Error ? err.message : "Failed to save exam.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (
            !window.confirm(
                "Are you sure you want to delete this upcoming exam?",
            )
        )
            return;
        try {
            await fetchApi(`/api/upcoming-exams/${id}`, { method: "DELETE" });
            retry();
        } catch (err) {
            alert(
                err instanceof Error ? err.message : "Failed to delete exam.",
            );
        }
    };

    const filteredExams = useMemo(() => {
        return exams.filter((e) => {
            if (deptFilter && e.deptId !== deptFilter) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                e.title.toLowerCase().includes(q) ||
                (e.subject?.subjectName &&
                    e.subject.subjectName.toLowerCase().includes(q)) ||
                (e.venue && e.venue.toLowerCase().includes(q))
            );
        });
    }, [exams, deptFilter, searchQuery]);

    const subjectComboId = useId();

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-semibold text-neutral-100">
                        Upcoming Exams
                    </h3>
                    <p className="text-neutral-400 mt-1">
                        Schedule and manage temporary upcoming exams. Expired
                        exams are automatically purged.
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
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
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Schedule Exam
                </button>
            </div>

            {/* Notification Banner */}
            {notice && (
                <div
                    role="alert"
                    className={`flex items-center justify-between gap-3 px-5 py-4 rounded-xl border ${notice.kind === "success" ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" : "bg-red-950/20 border-red-500/30 text-red-400"}`}
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
                            setDeptFilter(
                                e.target.value ? Number(e.target.value) : null,
                            )
                        }
                        className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none"
                    >
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                            <option key={d.deptId} value={d.deptId}>
                                {d.deptName}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 sm:w-64">
                        <input
                            type="text"
                            placeholder="Search by title, subject, venue..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                    <button
                        onClick={retry}
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
                {loading ? (
                    <div className="p-12 text-center text-neutral-400 space-y-3">
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm">Loading upcoming exams...</p>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center space-y-3">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button
                            onClick={retry}
                            className="px-3 py-1.5 bg-neutral-800 text-xs font-medium text-neutral-200 rounded-md border border-neutral-700 hover:bg-neutral-700"
                        >
                            Retry
                        </button>
                    </div>
                ) : filteredExams.length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                        <p className="text-neutral-300 font-medium">
                            No upcoming exams
                        </p>
                        <p className="text-neutral-500 text-xs max-w-sm mx-auto">
                            {searchQuery || deptFilter
                                ? "No exams matched your filters."
                                : "No upcoming exams scheduled."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-950/60 text-neutral-400 border-b border-neutral-800 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5 font-medium">
                                        Title
                                    </th>
                                    <th className="px-6 py-3.5 font-medium">
                                        Date & Time
                                    </th>
                                    <th className="px-6 py-3.5 font-medium">
                                        Subject
                                    </th>
                                    <th className="px-6 py-3.5 font-medium">
                                        Venue
                                    </th>
                                    <th className="px-6 py-3.5 font-medium text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800 text-neutral-200">
                                {filteredExams.map((e) => (
                                    <tr
                                        key={e.examId}
                                        className="hover:bg-neutral-800/40 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-medium text-neutral-100">
                                            {e.title}
                                            {e.department && (
                                                <div className="text-xs text-neutral-500 font-normal">
                                                    {e.department.deptName}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-emerald-400 font-medium">
                                            {new Date(
                                                e.examDate,
                                            ).toLocaleString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                            <div className="text-xs text-neutral-500 font-normal">
                                                {e.durationMinutes} mins
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-300">
                                            {e.subject ? (
                                                e.subject.subjectName
                                            ) : (
                                                <span className="text-neutral-500 italic">
                                                    None
                                                </span>
                                            )}
                                            {e.semester && (
                                                <div className="text-xs text-neutral-500">
                                                    Semester {e.semester}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-neutral-400">
                                            {e.venue || "TBA"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() =>
                                                        openEditModal(e)
                                                    }
                                                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg border border-neutral-700 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDelete(e.examId)
                                                    }
                                                    className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-300 text-xs rounded-lg border border-red-500/30 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Create/Edit Exam */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                            <h4 className="text-lg font-semibold text-neutral-100">
                                {editingId
                                    ? "Edit Upcoming Exam"
                                    : "Schedule New Exam"}
                            </h4>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-neutral-400 hover:text-neutral-200 p-1"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                    Exam Title{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    maxLength={150}
                                    required
                                    placeholder="e.g., Data Structures Mid-Term"
                                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                        Department{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedDeptId ?? ""}
                                        onChange={(e) => {
                                            setSelectedDeptId(
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : null,
                                            );
                                            setSelectedSubjectKey(null);
                                        }}
                                        required
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none"
                                    >
                                        <option value="">
                                            Select Department
                                        </option>
                                        {departments.map((d) => (
                                            <option
                                                key={d.deptId}
                                                value={d.deptId}
                                            >
                                                {d.deptName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                        Subject (Optional)
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
                                                ? "Search subject..."
                                                : "Select department first"
                                        }
                                        noun="subjects"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                        Date & Time{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={examDate}
                                        onChange={(e) =>
                                            setExamDate(e.target.value)
                                        }
                                        required
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                        Duration (Mins)
                                    </label>
                                    <input
                                        type="number"
                                        min={15}
                                        max={600}
                                        value={durationMinutes}
                                        onChange={(e) =>
                                            setDurationMinutes(
                                                Number(e.target.value),
                                            )
                                        }
                                        required
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                        Semester (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={semester}
                                        onChange={(e) =>
                                            setSemester(
                                                e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value),
                                            )
                                        }
                                        placeholder="e.g., 3"
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                        Venue (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={venue}
                                        onChange={(e) =>
                                            setVenue(e.target.value)
                                        }
                                        maxLength={100}
                                        placeholder="e.g., Room 402"
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                    Special Instructions (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    value={instructions}
                                    onChange={(e) =>
                                        setInstructions(e.target.value)
                                    }
                                    placeholder="Any specific instructions for students..."
                                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
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
                                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
                                >
                                    {submitting
                                        ? "Saving..."
                                        : editingId
                                          ? "Update Exam"
                                          : "Schedule Exam"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
