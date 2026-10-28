import { useId, useMemo, useState, useEffect } from "react";
import {
    useApiList,
    type DepartmentOption,
    type SubjectOption,
    type TimetableOption,
    type TimetableEntryOption,
} from "../hooks/useApiList";
import { fetchApi } from "../services/api";
import SearchableSelect, { type ComboOption } from "./SearchableSelect";

const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const CLASS_TYPES = ["LECTURE", "LAB", "TUTORIAL", "OTHER"] as const;

export default function TimetableManagement() {
    // API Hooks
    const {
        data: timetables,
        loading,
        error,
        retry,
    } = useApiList<TimetableOption>("/api/timetables");
    const { data: departments } =
        useApiList<DepartmentOption>("/api/departments");

    // Timetable (Parent) Modal State
    const [timetableModalOpen, setTimetableModalOpen] = useState(false);
    const [editingTtId, setEditingTtId] = useState<number | null>(null);
    const [ttDeptId, setTtDeptId] = useState<number | null>(null);
    const [ttSemester, setTtSemester] = useState<number | "">("");
    const [ttDivision, setTtDivision] = useState("A");
    const [ttAcademicYear, setTtAcademicYear] = useState("2025-2026");
    const [ttIsActive, setTtIsActive] = useState(true);

    // View/Entries State
    const [viewingTimetableId, setViewingTimetableId] = useState<number | null>(
        null,
    );
    const [entries, setEntries] = useState<TimetableEntryOption[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(false);

    // Entry Modal State
    const [entryModalOpen, setEntryModalOpen] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
    const [entrySubjectKey, setEntrySubjectKey] = useState<number | null>(null);
    const [entryDay, setEntryDay] =
        useState<(typeof DAYS_OF_WEEK)[number]>("MON");
    const [entryStartTime, setEntryStartTime] = useState("09:00");
    const [entryEndTime, setEntryEndTime] = useState("10:00");
    const [entryClassroom, setEntryClassroom] = useState("");
    const [entryTeacher, setEntryTeacher] = useState("");
    const [entryClassType, setEntryClassType] =
        useState<(typeof CLASS_TYPES)[number]>("LECTURE");

    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [notice, setNotice] = useState<{
        kind: "success" | "error";
        message: string;
    } | null>(null);

    // Fetch subjects dynamically based on the timetable's department
    const viewingTt = useMemo(
        () => timetables.find((t) => t.timetableId === viewingTimetableId),
        [timetables, viewingTimetableId],
    );
    const subjectsPath = viewingTt
        ? `/api/subjects?deptId=${viewingTt.deptId}`
        : null;
    const { data: subjects, loading: subjectsLoading } =
        useApiList<SubjectOption>(subjectsPath);

    const subjectComboOptions: ComboOption[] = useMemo(() => {
        return subjects.map((s) => ({
            id: s.subjectKey,
            label: `${s.subjectId}   ${s.subjectName || "Untitled"}`,
        }));
    }, [subjects]);

    const selectedSubjectOption = useMemo(() => {
        if (!entrySubjectKey) return null;
        return (
            subjectComboOptions.find((o) => o.id === entrySubjectKey) ?? null
        );
    }, [entrySubjectKey, subjectComboOptions]);

    // Fetch entries when viewing a timetable
    useEffect(() => {
        if (!viewingTimetableId) {
            setEntries([]);
            return;
        }
        setLoadingEntries(true);
        fetchApi<any>(`/api/timetables/${viewingTimetableId}`)
            .then((res) => {
                setEntries(res.entries || []);
            })
            .catch((err) => {
                console.error(err);
                setNotice({
                    kind: "error",
                    message: "Failed to load timetable entries.",
                });
            })
            .finally(() => setLoadingEntries(false));
    }, [viewingTimetableId]);

    // ================= TIMETABLE HANDLERS =================
    const openTimetableModal = (tt?: TimetableOption) => {
        if (tt) {
            setEditingTtId(tt.timetableId);
            setTtDeptId(tt.deptId);
            setTtSemester(tt.semester);
            setTtDivision(tt.division);
            setTtAcademicYear(tt.academicYear);
            setTtIsActive(tt.isActive);
        } else {
            setEditingTtId(null);
            setTtDeptId(null);
            setTtSemester("");
            setTtDivision("A");
            setTtAcademicYear("2025-2026");
            setTtIsActive(true);
        }
        setNotice(null);
        setTimetableModalOpen(true);
    };

    const handleTimetableSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (
            !ttDeptId ||
            !ttSemester ||
            !ttDivision.trim() ||
            !ttAcademicYear.trim()
        ) {
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
                deptId: ttDeptId,
                semester: Number(ttSemester),
                division: ttDivision.trim(),
                academicYear: ttAcademicYear.trim(),
                isActive: ttIsActive,
            };

            if (editingTtId) {
                await fetchApi(`/api/timetables/${editingTtId}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                });
                setNotice({
                    kind: "success",
                    message: "Timetable updated successfully.",
                });
            } else {
                await fetchApi("/api/timetables", {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                setNotice({
                    kind: "success",
                    message: "Timetable created successfully.",
                });
            }
            setTimetableModalOpen(false);
            retry();
        } catch (err) {
            setNotice({
                kind: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "Failed to save timetable.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleTimetableDelete = async (id: number) => {
        if (
            !window.confirm(
                "Are you sure you want to delete this timetable and all its entries?",
            )
        )
            return;
        try {
            await fetchApi(`/api/timetables/${id}`, { method: "DELETE" });
            if (viewingTimetableId === id) setViewingTimetableId(null);
            retry();
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Failed to delete timetable.",
            );
        }
    };

    // ================= ENTRY HANDLERS =================
    const openEntryModal = (entry?: TimetableEntryOption) => {
        if (entry) {
            setEditingEntryId(entry.entryId);
            setEntrySubjectKey(entry.subjectKey);
            setEntryDay(entry.dayOfWeek);
            setEntryStartTime(entry.startTime);
            setEntryEndTime(entry.endTime);
            setEntryClassroom(entry.classroom || "");
            setEntryTeacher(entry.teacher || "");
            setEntryClassType(entry.classType);
        } else {
            setEditingEntryId(null);
            setEntrySubjectKey(null);
            setEntryDay("MON");
            setEntryStartTime("09:00");
            setEntryEndTime("10:00");
            setEntryClassroom("");
            setEntryTeacher("");
            setEntryClassType("LECTURE");
        }
        setNotice(null);
        setEntryModalOpen(true);
    };

    const handleEntrySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!viewingTimetableId) return;
        if (!entrySubjectKey || !entryStartTime || !entryEndTime) {
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
                subjectKey: entrySubjectKey,
                dayOfWeek: entryDay,
                startTime: entryStartTime,
                endTime: entryEndTime,
                classroom: entryClassroom.trim() || undefined,
                teacher: entryTeacher.trim() || undefined,
                classType: entryClassType,
            };

            if (editingEntryId) {
                await fetchApi(
                    `/api/timetables/${viewingTimetableId}/entries/${editingEntryId}`,
                    {
                        method: "PATCH",
                        body: JSON.stringify(payload),
                    },
                );
            } else {
                await fetchApi(
                    `/api/timetables/${viewingTimetableId}/entries`,
                    {
                        method: "POST",
                        body: JSON.stringify(payload),
                    },
                );
            }

            // Refetch entries manually
            const res = await fetchApi<any>(
                `/api/timetables/${viewingTimetableId}`,
            );
            setEntries(res.entries || []);
            setEntryModalOpen(false);
            setNotice({
                kind: "success",
                message: "Class entry saved successfully.",
            });
        } catch (err) {
            setNotice({
                kind: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "Failed to save entry.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEntryDelete = async (entryId: number) => {
        if (!viewingTimetableId || !window.confirm("Delete this class entry?"))
            return;
        try {
            await fetchApi(
                `/api/timetables/${viewingTimetableId}/entries/${entryId}`,
                { method: "DELETE" },
            );
            setEntries((prev) => prev.filter((e) => e.entryId !== entryId));
        } catch (err) {
            alert(
                err instanceof Error ? err.message : "Failed to delete entry.",
            );
        }
    };

    const filteredTimetables = useMemo(() => {
        if (!searchQuery.trim()) return timetables;
        const q = searchQuery.toLowerCase();
        return timetables.filter(
            (t) =>
                t.department?.deptName.toLowerCase().includes(q) ||
                t.academicYear.toLowerCase().includes(q) ||
                t.division.toLowerCase().includes(q),
        );
    }, [timetables, searchQuery]);

    const subjectComboId = useId();

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-semibold text-neutral-100">
                        Timetable Management
                    </h3>
                    <p className="text-neutral-400 mt-1">
                        Manage departmental semester schedules and weekly
                        classes.
                    </p>
                </div>
                {!viewingTimetableId ? (
                    <button
                        onClick={() => openTimetableModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
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
                            <rect
                                x="3"
                                y="4"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                            />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Create Timetable
                    </button>
                ) : (
                    <button
                        onClick={() => setViewingTimetableId(null)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        ← Back to Timetables
                    </button>
                )}
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

            {!viewingTimetableId ? (
                <>
                    {/* Timetables List View */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative flex-1 w-full">
                            <input
                                type="text"
                                placeholder="Search by department, year, division..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={retry}
                            className="p-2 text-neutral-400 hover:text-neutral-100 bg-neutral-800 border border-neutral-700 rounded-lg transition-colors"
                        >
                            Refresh
                        </button>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                        {loading ? (
                            <div className="p-12 text-center text-neutral-400">
                                Loading timetables...
                            </div>
                        ) : error ? (
                            <div className="p-8 text-center text-red-400">
                                {error}
                            </div>
                        ) : filteredTimetables.length === 0 ? (
                            <div className="p-12 text-center text-neutral-400">
                                No timetables found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-neutral-950/60 text-neutral-400 border-b border-neutral-800 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3.5 font-medium">
                                                Department
                                            </th>
                                            <th className="px-6 py-3.5 font-medium">
                                                Sem & Div
                                            </th>
                                            <th className="px-6 py-3.5 font-medium">
                                                Year
                                            </th>
                                            <th className="px-6 py-3.5 font-medium">
                                                Status
                                            </th>
                                            <th className="px-6 py-3.5 font-medium text-right">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800 text-neutral-200">
                                        {filteredTimetables.map((t) => (
                                            <tr
                                                key={t.timetableId}
                                                className="hover:bg-neutral-800/40"
                                            >
                                                <td className="px-6 py-4 font-medium text-neutral-100">
                                                    {t.department?.deptName ||
                                                        `Dept #${t.deptId}`}
                                                </td>
                                                <td className="px-6 py-4 text-neutral-300">
                                                    Sem {t.semester} - Div{" "}
                                                    {t.division}
                                                </td>
                                                <td className="px-6 py-4 text-neutral-400">
                                                    {t.academicYear}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.isActive ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30" : "bg-neutral-800 text-neutral-400 border border-neutral-700"}`}
                                                    >
                                                        {t.isActive
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() =>
                                                                setViewingTimetableId(
                                                                    t.timetableId,
                                                                )
                                                            }
                                                            className="px-3 py-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 text-xs rounded-lg border border-indigo-500/30 transition-colors"
                                                        >
                                                            Schedule
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                openTimetableModal(
                                                                    t,
                                                                )
                                                            }
                                                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg border border-neutral-700 transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleTimetableDelete(
                                                                    t.timetableId,
                                                                )
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
                </>
            ) : (
                <>
                    {/* Entries View for Selected Timetable */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6 flex items-center justify-between">
                        <div>
                            <h4 className="text-lg font-bold text-white">
                                Weekly Schedule
                            </h4>
                            <p className="text-xs text-neutral-400 mt-1">
                                {viewingTt?.department?.deptName} | Semester{" "}
                                {viewingTt?.semester} | Division{" "}
                                {viewingTt?.division}
                            </p>
                        </div>
                        <button
                            onClick={() => openEntryModal()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            + Add Class
                        </button>
                    </div>

                    <div className="space-y-6">
                        {loadingEntries ? (
                            <div className="text-center text-neutral-400 py-12">
                                Loading entries...
                            </div>
                        ) : entries.length === 0 ? (
                            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center text-neutral-400">
                                No classes scheduled yet. Click "+ Add Class" to
                                begin.
                            </div>
                        ) : (
                            DAYS_OF_WEEK.map((day) => {
                                const dayEntries = entries
                                    .filter((e) => e.dayOfWeek === day)
                                    .sort((a, b) =>
                                        a.startTime.localeCompare(b.startTime),
                                    );
                                if (dayEntries.length === 0) return null;
                                return (
                                    <div
                                        key={day}
                                        className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
                                    >
                                        <div className="bg-neutral-950/60 px-4 py-2 border-b border-neutral-800">
                                            <h5 className="font-semibold text-indigo-400">
                                                {day}
                                            </h5>
                                        </div>
                                        <div className="divide-y divide-neutral-800">
                                            {dayEntries.map((entry) => (
                                                <div
                                                    key={entry.entryId}
                                                    className="p-4 flex items-center justify-between hover:bg-neutral-800/40"
                                                >
                                                    <div className="flex gap-4">
                                                        <div className="text-neutral-400 font-mono text-sm pt-0.5 w-24">
                                                            {entry.startTime} -{" "}
                                                            {entry.endTime}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-neutral-100 flex items-center gap-2">
                                                                {entry.subject
                                                                    ?.subjectName ||
                                                                    `Subject #${entry.subjectKey}`}
                                                                <span className="text-[10px] uppercase font-bold text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                                                                    {
                                                                        entry.classType
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-neutral-400 mt-1 flex items-center gap-3">
                                                                {entry.classroom && (
                                                                    <span>
                                                                        🏫{" "}
                                                                        {
                                                                            entry.classroom
                                                                        }
                                                                    </span>
                                                                )}
                                                                {entry.teacher && (
                                                                    <span>
                                                                        👨‍🏫{" "}
                                                                        {
                                                                            entry.teacher
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <button
                                                            onClick={() =>
                                                                openEntryModal(
                                                                    entry,
                                                                )
                                                            }
                                                            className="p-1.5 text-neutral-500 hover:text-neutral-300"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleEntryDelete(
                                                                    entry.entryId,
                                                                )
                                                            }
                                                            className="p-1.5 text-red-500 hover:text-red-400"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {/* Modal: Create/Edit Timetable */}
            {timetableModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                            <h4 className="text-lg font-semibold text-neutral-100">
                                {editingTtId
                                    ? "Edit Timetable"
                                    : "New Timetable"}
                            </h4>
                            <button
                                onClick={() => setTimetableModalOpen(false)}
                                className="text-neutral-400 hover:text-neutral-200"
                            >
                                ✕
                            </button>
                        </div>
                        <form
                            onSubmit={handleTimetableSubmit}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-1">
                                    Department *
                                </label>
                                <select
                                    value={ttDeptId ?? ""}
                                    onChange={(e) =>
                                        setTtDeptId(
                                            e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                        )
                                    }
                                    required
                                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3 py-2 outline-none"
                                >
                                    <option value="">Select Dept</option>
                                    {departments.map((d) => (
                                        <option key={d.deptId} value={d.deptId}>
                                            {d.deptName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                                        Semester *
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={ttSemester}
                                        onChange={(e) =>
                                            setTtSemester(
                                                e.target.value === ""
                                                    ? ""
                                                    : Number(e.target.value),
                                            )
                                        }
                                        required
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3 py-2 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                                        Division *
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={10}
                                        value={ttDivision}
                                        onChange={(e) =>
                                            setTtDivision(e.target.value)
                                        }
                                        required
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3 py-2 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-1">
                                    Academic Year *
                                </label>
                                <input
                                    type="text"
                                    maxLength={20}
                                    value={ttAcademicYear}
                                    onChange={(e) =>
                                        setTtAcademicYear(e.target.value)
                                    }
                                    placeholder="e.g. 2025-2026"
                                    required
                                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3 py-2 outline-none"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={ttIsActive}
                                    onChange={(e) =>
                                        setTtIsActive(e.target.checked)
                                    }
                                    className="accent-indigo-500"
                                />
                                <span className="text-sm text-neutral-300">
                                    Set as Active Timetable
                                </span>
                            </label>
                            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setTimetableModalOpen(false)}
                                    className="px-4 py-2 text-sm text-neutral-300 bg-neutral-800 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg"
                                >
                                    {submitting ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Create/Edit Timetable Entry */}
            {entryModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl overflow-visible">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                            <h4 className="text-lg font-semibold text-neutral-100">
                                {editingEntryId ? "Edit Class" : "Add Class"}
                            </h4>
                            <button
                                onClick={() => setEntryModalOpen(false)}
                                className="text-neutral-400 hover:text-neutral-200"
                            >
                                ✕
                            </button>
                        </div>
                        <form
                            onSubmit={handleEntrySubmit}
                            className="space-y-4 overflow-visible"
                        >
                            <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-1">
                                    Subject *
                                </label>
                                <SearchableSelect
                                    id={subjectComboId}
                                    options={subjectComboOptions}
                                    value={selectedSubjectOption}
                                    onChange={(opt) =>
                                        setEntrySubjectKey(opt ? opt.id : null)
                                    }
                                    loading={subjectsLoading}
                                    placeholder="Select subject..."
                                    noun="subjects"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                                        Day *
                                    </label>
                                    <select
                                        value={entryDay}
                                        onChange={(e) =>
                                            setEntryDay(e.target.value as any)
                                        }
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3 py-2 outline-none"
                                    >
                                        {DAYS_OF_WEEK.map((d) => (
                                            <option key={d} value={d}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                                        Type *
                                    </label>
                                    <select
                                        value={entryClassType}
                                        onChange={(e) =>
                                            setEntryClassType(
                                                e.target.value as any,
                                            )
                                        }
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3 py-2 outline-none"
                                    >
                                        {CLASS_TYPES.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                                        Start Time *
                                    </label>
                                    <input
                                        type="time"
                                        value={entryStartTime}
                                        onChange={(e) =>
                                            setEntryStartTime(e.target.value)
                                        }
                                        required
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3 py-2 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                                        End Time *
                                    </label>
                                    <input
                                        type="time"
                                        value={entryEndTime}
                                        onChange={(e) =>
                                            setEntryEndTime(e.target.value)
                                        }
                                        required
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3 py-2 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                                        Classroom
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={50}
                                        value={entryClassroom}
                                        onChange={(e) =>
                                            setEntryClassroom(e.target.value)
                                        }
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3 py-2 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                                        Teacher
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={100}
                                        value={entryTeacher}
                                        onChange={(e) =>
                                            setEntryTeacher(e.target.value)
                                        }
                                        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3 py-2 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setEntryModalOpen(false)}
                                    className="px-4 py-2 text-sm text-neutral-300 bg-neutral-800 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg"
                                >
                                    {submitting ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
