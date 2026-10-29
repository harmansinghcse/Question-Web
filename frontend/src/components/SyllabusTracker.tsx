import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWebAuth } from "../services/auth";
import {
    formatCalendarDate,
    getLocalDateString,
    isValidDateString,
    shiftDateString,
    webSyllabusTrackerApi,
    type CoverageEventItem,
    type TrackerChapter,
    type TrackerChapterStatus,
    type TrackerContextResponse,
    type TrackerSubjectOverview,
    type TrackerTreeResponse,
    type WeeklyActivityBucket,
} from "../services/syllabusTracker";

// ---------------------------------------------------------------------------
// Visual Subcomponents (Knowledge-Web SVG Motifs & Progress Visuals)
// ---------------------------------------------------------------------------

function KnowledgeConstellationSvg() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 260 120"
            className="pointer-events-none absolute right-2 top-1 h-28 w-60 opacity-35"
            fill="none"
        >
            <line x1="34" y1="88" x2="96" y2="38" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.45" />
            <line x1="96" y1="38" x2="168" y2="64" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="96" y1="38" x2="150" y2="18" stroke="#52525b" strokeWidth="1" />
            <line x1="168" y1="64" x2="232" y2="30" stroke="#10b981" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="168" y1="64" x2="218" y2="96" stroke="#52525b" strokeWidth="1" />
            <circle cx="34" cy="88" r="4" fill="#27272a" stroke="#71717a" strokeWidth="1.5" />
            <circle cx="96" cy="38" r="5.5" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
            <circle cx="150" cy="18" r="3.5" fill="#27272a" stroke="#71717a" strokeWidth="1.5" />
            <circle cx="168" cy="64" r="5" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
            <circle cx="232" cy="30" r="4.5" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
            <circle cx="218" cy="96" r="3.5" fill="#27272a" stroke="#71717a" strokeWidth="1.5" />
        </svg>
    );
}

function CircularCoverageRing({
    percent,
    covered,
    total,
}: {
    percent: number;
    covered: number;
    total: number;
}) {
    const clamped = Math.max(0, Math.min(100, percent));
    const size = 124;
    const strokeWidth = 9;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;
    const ringColor = clamped >= 100 ? "#10b981" : "#ef4444";

    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#262626"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={ringColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    fill="transparent"
                    className="transition-all duration-500 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold tracking-tight text-neutral-100">
                    {Math.round(clamped)}%
                </span>
                <span className="text-[11px] font-medium text-neutral-400">
                    {covered}/{total} topics
                </span>
            </div>
        </div>
    );
}

function ChapterNodeBadge({ status }: { status: TrackerChapterStatus }) {
    if (status === "COVERED") {
        return (
            <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/70 bg-emerald-500/20 text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
        );
    }
    if (status === "PARTIAL") {
        return (
            <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/70 bg-amber-500/15 text-amber-400">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            </span>
        );
    }
    return (
        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
        </span>
    );
}

function WeeklyActivityChart({
    buckets,
    asOf,
}: {
    buckets: WeeklyActivityBucket[];
    asOf: string | null;
}) {
    const maxTopics = Math.max(
        1,
        ...buckets.map((b) =>
            Math.max(b.uniqueTopicsTouched, b.newlyCoveredTopics),
        ),
    );
    const totalSessions = buckets.reduce((sum, b) => sum + b.eventCount, 0);
    const totalNewlyCovered = buckets.reduce(
        (sum, b) => sum + b.newlyCoveredTopics,
        0,
    );

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/90 p-5 flex flex-col justify-between">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                        Weekly Coverage Activity
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                        {asOf
                            ? `6 weeks ending ${formatCalendarDate(asOf, { includeYear: false })}`
                            : "Trailing 6 weeks from recorded sessions"}
                    </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-neutral-300">
                        <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                        First-time ({totalNewlyCovered})
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-neutral-400">
                        <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/60" />
                        Touched / Revisited
                    </span>
                    <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-300 border border-neutral-700">
                        {totalSessions} {totalSessions === 1 ? "session" : "sessions"}
                    </span>
                </div>
            </div>

            {buckets.length === 0 ? (
                <p className="text-xs text-neutral-500 py-8 text-center">
                    Record lecture coverage to populate weekly pace analytics.
                </p>
            ) : (
                <div className="grid grid-cols-6 gap-2.5 items-end pt-2">
                    {buckets.map((bucket) => {
                        const touchedPct = Math.round(
                            (bucket.uniqueTopicsTouched / maxTopics) * 100,
                        );
                        const newPct = Math.round(
                            (bucket.newlyCoveredTopics / maxTopics) * 100,
                        );
                        return (
                            <div
                                key={bucket.weekStart}
                                className="flex flex-col items-center gap-1.5"
                                title={`${bucket.label}: ${bucket.newlyCoveredTopics} newly covered, ${bucket.uniqueTopicsTouched} unique topics touched across ${bucket.eventCount} session(s)`}
                            >
                                <span className="text-[11px] font-semibold text-neutral-300">
                                    {bucket.uniqueTopicsTouched > 0
                                        ? bucket.uniqueTopicsTouched
                                        : "0"}
                                </span>
                                <div className="w-full h-24 rounded-lg bg-neutral-950 border border-neutral-800/90 p-1.5 flex items-end justify-center gap-1">
                                    <div
                                        className="w-2.5 rounded-sm bg-red-500 transition-all duration-300"
                                        style={{
                                            height:
                                                bucket.newlyCoveredTopics > 0
                                                    ? `${Math.max(14, newPct)}%`
                                                    : "3px",
                                            opacity:
                                                bucket.newlyCoveredTopics > 0
                                                    ? 1
                                                    : 0.25,
                                        }}
                                    />
                                    <div
                                        className="w-2.5 rounded-sm bg-amber-500/75 transition-all duration-300"
                                        style={{
                                            height:
                                                bucket.uniqueTopicsTouched > 0
                                                    ? `${Math.max(14, touchedPct)}%`
                                                    : "3px",
                                            opacity:
                                                bucket.uniqueTopicsTouched > 0
                                                    ? 1
                                                    : 0.2,
                                        }}
                                    />
                                </div>
                                <span className="text-[10px] font-medium text-neutral-400 truncate max-w-full">
                                    {bucket.label}
                                </span>
                                <span className="text-[10px] text-neutral-500">
                                    {bucket.eventCount}s
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            <p className="text-[11px] text-neutral-500 mt-3 pt-2.5 border-t border-neutral-800/80">
                Overall syllabus completion counts unique topics only — revisiting a topic on later dates never inflates coverage %.
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Student Sign-In / Registration Card (Scoped to Student Tracker)
// ---------------------------------------------------------------------------

function StudentAuthGate({
    onLogin,
    onRegister,
}: {
    onLogin: (params: { email: string; password: string }) => Promise<unknown>;
    onRegister: (params: {
        email: string;
        password: string;
        displayName: string;
    }) => Promise<unknown>;
}) {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password) {
            setError("Please enter your institutional email and password.");
            return;
        }
        if (mode === "register" && !displayName.trim()) {
            setError("Please enter your full name to create an account.");
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            if (mode === "login") {
                await onLogin({ email: trimmedEmail, password });
            } else {
                await onRegister({
                    email: trimmedEmail,
                    password,
                    displayName: displayName.trim(),
                });
            }
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Authentication failed. Please check your credentials.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto my-8">
            <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-7 shadow-2xl">
                <KnowledgeConstellationSvg />

                <div className="relative z-10">
                    <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Personal Academic Workspace
                    </span>
                    <h3 className="mt-3 text-2xl font-bold text-neutral-100">
                        Sign in to Syllabus Tracker
                    </h3>
                    <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">
                        Record dated lecture coverage, reconstruct quiz portions as of any past date, and sync seamlessly with the Question Web mobile app.
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-neutral-950 p-1 border border-neutral-800">
                        <button
                            type="button"
                            onClick={() => {
                                setMode("login");
                                setError(null);
                            }}
                            className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                                mode === "login"
                                    ? "bg-neutral-800 text-white shadow-sm"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                        >
                            Student Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMode("register");
                                setError(null);
                            }}
                            className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                                mode === "register"
                                    ? "bg-neutral-800 text-white shadow-sm"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                        >
                            Create Account
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/50 px-3.5 py-2.5 text-xs text-red-200">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                        {mode === "register" && (
                            <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) =>
                                        setDisplayName(e.target.value)
                                    }
                                    placeholder="e.g. Aarav Patel"
                                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                Institutional Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="e.g. u25cs044@coed.svnit.ac.in"
                                autoComplete="email"
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={
                                    mode === "register"
                                        ? "Min 8 chars, upper/lower/number/symbol"
                                        : "Enter your password"
                                }
                                autoComplete={
                                    mode === "login"
                                        ? "current-password"
                                        : "new-password"
                                }
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-red-950/40"
                        >
                            {submitting
                                ? mode === "login"
                                    ? "Signing in..."
                                    : "Creating account..."
                                : mode === "login"
                                  ? "Sign In to Tracker"
                                  : "Create Account & Continue"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Record / Edit Coverage Modal
// ---------------------------------------------------------------------------

function RecordCoverageWebModal({
    open,
    editingEvent,
    subjectLabel,
    chapters,
    selectedTopicIds,
    onToggleTopic,
    onClose,
    onSubmit,
}: {
    open: boolean;
    editingEvent: CoverageEventItem | null;
    subjectLabel: string;
    chapters: TrackerChapter[];
    selectedTopicIds: Set<number>;
    onToggleTopic: (topicId: number) => void;
    onClose: () => void;
    onSubmit: (payload: {
        coverageDate: string;
        notes: string;
        topicIds: number[];
        editingEventId?: number;
    }) => Promise<void>;
}) {
    const todayStr = useMemo(() => getLocalDateString(), []);
    const [coverageDate, setCoverageDate] = useState(todayStr);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const syncKey = open ? `open:${editingEvent?.eventId ?? "new"}` : "closed";
    const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
    if (syncKey !== prevSyncKey) {
        setPrevSyncKey(syncKey);
        if (open) {
            setError(null);
            setSaving(false);
            if (editingEvent) {
                setCoverageDate(editingEvent.coverageDate);
                setNotes(editingEvent.notes ?? "");
            } else {
                setCoverageDate(getLocalDateString());
                setNotes("");
            }
        }
    }

    const groupedTopics = useMemo(() => {
        const groups: {
            chapterId: number;
            chapterNo: number;
            chapterName: string;
            topics: { topicId: number; topicName: string; covered: boolean }[];
        }[] = [];
        for (const ch of chapters) {
            const picked = ch.topics.filter((t) =>
                selectedTopicIds.has(t.topicId),
            );
            if (picked.length > 0) {
                groups.push({
                    chapterId: ch.chapterId,
                    chapterNo: ch.chapterNo,
                    chapterName: ch.chapterName,
                    topics: picked.map((t) => ({
                        topicId: t.topicId,
                        topicName: t.topicName,
                        covered: t.covered,
                    })),
                });
            }
        }
        return groups;
    }, [chapters, selectedTopicIds]);

    if (!open) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;

        const trimmedDate = coverageDate.trim();
        if (!isValidDateString(trimmedDate)) {
            setError("Please select a valid date in YYYY-MM-DD format.");
            return;
        }
        if (trimmedDate > shiftDateString(getLocalDateString(), 1)) {
            setError("Coverage date cannot be in the future.");
            return;
        }
        if (selectedTopicIds.size === 0) {
            setError("Select at least one topic before saving coverage.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await onSubmit({
                coverageDate: trimmedDate,
                notes: notes.trim(),
                topicIds: Array.from(selectedTopicIds),
                editingEventId: editingEvent?.eventId,
            });
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to save coverage session.",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-coverage-modal-title"
        >
            <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
                            {editingEvent
                                ? "Edit Recorded Session"
                                : "Record Lecture Coverage"}
                        </p>
                        <h3
                            id="record-coverage-modal-title"
                            className="text-lg font-bold text-neutral-100 mt-0.5"
                        >
                            {subjectLabel}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => !saving && onClose()}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>

                <form
                    onSubmit={handleSave}
                    className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
                >
                    {error && (
                        <div className="rounded-lg border border-red-500/40 bg-red-950/50 px-3.5 py-2.5 text-xs text-red-200">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                Coverage Date
                            </label>
                            <input
                                type="date"
                                value={coverageDate}
                                max={getLocalDateString()}
                                onChange={(e) =>
                                    setCoverageDate(e.target.value)
                                }
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-red-500 focus:outline-none"
                            />
                            <div className="mt-2 flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCoverageDate(getLocalDateString())
                                    }
                                    className="rounded border border-neutral-700 bg-neutral-800/80 px-2 py-0.5 text-[11px] text-neutral-300 hover:border-neutral-600"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCoverageDate(
                                            shiftDateString(
                                                getLocalDateString(),
                                                -1,
                                            ),
                                        )
                                    }
                                    className="rounded border border-neutral-700 bg-neutral-800/80 px-2 py-0.5 text-[11px] text-neutral-300 hover:border-neutral-600"
                                >
                                    Yesterday
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 flex flex-col justify-center">
                            <span className="text-xs text-neutral-400">
                                Selected Scope
                            </span>
                            <span className="text-xl font-bold text-neutral-100 mt-0.5">
                                {selectedTopicIds.size}{" "}
                                {selectedTopicIds.size === 1
                                    ? "Topic"
                                    : "Topics"}
                            </span>
                            <span className="text-[11px] text-neutral-500 mt-0.5">
                                Across {groupedTopics.length}{" "}
                                {groupedTopics.length === 1
                                    ? "chapter"
                                    : "chapters"}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                            Selected Topics by Chapter
                        </label>
                        {groupedTopics.length === 0 ? (
                            <p className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-xs text-neutral-500 text-center">
                                All topics unchecked. Select at least one topic to save.
                            </p>
                        ) : (
                            <div className="max-h-52 overflow-y-auto space-y-2.5 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                {groupedTopics.map((group) => (
                                    <div
                                        key={group.chapterId}
                                        className="space-y-1.5"
                                    >
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                                            Ch {group.chapterNo}:{" "}
                                            {group.chapterName}
                                        </p>
                                        <div className="space-y-1 pl-2 border-l border-neutral-800">
                                            {group.topics.map((t) => (
                                                <label
                                                    key={t.topicId}
                                                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs hover:bg-neutral-900 cursor-pointer"
                                                >
                                                    <span className="flex items-center gap-2 text-neutral-200">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTopicIds.has(
                                                                t.topicId,
                                                            )}
                                                            onChange={() =>
                                                                onToggleTopic(
                                                                    t.topicId,
                                                                )
                                                            }
                                                            className="accent-red-500 rounded"
                                                        />
                                                        {t.topicName}
                                                    </span>
                                                    {t.covered &&
                                                        !editingEvent && (
                                                            <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                                                Revisit
                                                            </span>
                                                        )}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                            Lecture Notes{" "}
                            <span className="text-neutral-500 font-normal">
                                (optional, max 500 chars)
                            </span>
                        </label>
                        <textarea
                            rows={2}
                            maxLength={500}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Finished derivations and SQL join examples; quiz next week."
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onClose}
                            className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || selectedTopicIds.size === 0}
                            className="rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-red-950/40"
                        >
                            {saving
                                ? "Saving..."
                                : editingEvent
                                  ? "Save Changes"
                                  : "Save Coverage"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Delete Event Confirmation Modal
// ---------------------------------------------------------------------------

function DeleteCoverageEventModal({
    event,
    deleting,
    error,
    onCancel,
    onConfirm,
}: {
    event: CoverageEventItem | null;
    deleting: boolean;
    error: string | null;
    onCancel: () => void;
    onConfirm: (eventId: number) => void;
}) {
    if (!event) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4">
                <div>
                    <span className="inline-flex rounded-full bg-red-950/60 border border-red-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
                        Confirm Removal
                    </span>
                    <h4 className="mt-2 text-lg font-bold text-neutral-100">
                        Delete session from{" "}
                        {formatCalendarDate(event.coverageDate, {
                            fullMonth: true,
                        })}
                        ?
                    </h4>
                    <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">
                        This removes coverage session{" "}
                        <span className="text-neutral-200 font-semibold">
                            #{event.eventId}
                        </span>{" "}
                        ({event.topics.length}{" "}
                        {event.topics.length === 1 ? "topic" : "topics"}) and
                        recalculates your historical progress. Underlying
                        subjects, chapters, and topics are never deleted.
                    </p>
                </div>

                <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs space-y-1 max-h-36 overflow-y-auto">
                    {event.topics.map((t) => (
                        <div key={t.topicId} className="text-neutral-300">
                            • Ch {t.chapterNo}: {t.topicName}
                        </div>
                    ))}
                    {event.notes && (
                        <p className="pt-1.5 mt-1.5 border-t border-neutral-800 text-neutral-400 italic">
                            Note: {event.notes}
                        </p>
                    )}
                </div>

                {error && (
                    <div className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
                        {error}
                    </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={onCancel}
                        className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
                    >
                        Keep Session
                    </button>
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={() => onConfirm(event.eventId)}
                        className="rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white"
                    >
                        {deleting ? "Deleting..." : "Delete Session"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Responsive Website Syllabus Tracker Component
// ---------------------------------------------------------------------------

export default function SyllabusTracker() {
    const auth = useWebAuth();

    // Academic Context & Subjects
    const [contextData, setContextData] =
        useState<TrackerContextResponse | null>(null);
    const [contextLoading, setContextLoading] = useState(false);
    const [contextError, setContextError] = useState<string | null>(null);

    // Sidebar & Subject Filters
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSubjectsOpen, setMobileSubjectsOpen] = useState(false);
    const [semesterFilter, setSemesterFilter] = useState<number | null>(null);
    const [subjectSearch, setSubjectSearch] = useState("");
    const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | null>(
        null,
    );

    // Subject Tree, Timeline Events & Historical Cutoff
    const [asOfDate, setAsOfDate] = useState<string | null>(null);
    const [treeData, setTreeData] = useState<TrackerTreeResponse | null>(null);
    const [events, setEvents] = useState<CoverageEventItem[]>([]);
    const [subjectLoading, setSubjectLoading] = useState(false);
    const [subjectError, setSubjectError] = useState<string | null>(null);

    // Hierarchy & Timeline Interactive State
    const [uncoveredOnly, setUncoveredOnly] = useState(false);
    const [topicSearch, setTopicSearch] = useState("");
    const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
        new Set(),
    );
    const [selectedTopicIds, setSelectedTopicIds] = useState<Set<number>>(
        new Set(),
    );
    const [expandedEventIds, setExpandedEventIds] = useState<Set<number>>(
        new Set(),
    );

    // Modals & Banner Feedback
    const [recordModalOpen, setRecordModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CoverageEventItem | null>(
        null,
    );
    const [eventPendingDelete, setEventPendingDelete] =
        useState<CoverageEventItem | null>(null);
    const [deletingEvent, setDeletingEvent] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [notice, setNotice] = useState<{
        tone: "success" | "info";
        text: string;
    } | null>(null);

    const contextReqRef = useRef(0);
    const subjectReqRef = useRef(0);
    const timelineSectionRef = useRef<HTMLDivElement | null>(null);

    const canFetch = auth.isAuthenticated && !auth.isRestoring;

    // 1. Load Academic Context + Department-Scoped Subjects
    const loadContext = useCallback(
        async (preserveSelection = true) => {
            if (!canFetch) return;
            const reqId = ++contextReqRef.current;
            setContextLoading(true);
            setContextError(null);
            try {
                const res = await webSyllabusTrackerApi.getContext();
                if (reqId !== contextReqRef.current) return;
                setContextData(res);

                const sem = res.academicContext.currentSemester;
                setSemesterFilter((prev) => {
                    if (prev !== null) return prev;
                    if (sem && res.subjects.some((s) => s.semester === sem)) {
                        return sem;
                    }
                    return null;
                });

                setSelectedSubjectKey((prev) => {
                    if (
                        preserveSelection &&
                        prev !== null &&
                        res.subjects.some((s) => s.subjectKey === prev)
                    ) {
                        return prev;
                    }
                    const semMatch = sem
                        ? res.subjects.find((s) => s.semester === sem)
                        : null;
                    return (
                        semMatch?.subjectKey ??
                        res.subjects[0]?.subjectKey ??
                        null
                    );
                });
            } catch (err: unknown) {
                if (reqId !== contextReqRef.current) return;
                setContextError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load academic context.",
                );
            } finally {
                if (reqId === contextReqRef.current) {
                    setContextLoading(false);
                }
            }
        },
        [canFetch],
    );

    // 2. Load Subject Tree (with optional asOf cutoff) + Chronological Events
    const loadSubjectTracker = useCallback(
        async (subjectKey: number, cutoff: string | null) => {
            if (!canFetch) return;
            const reqId = ++subjectReqRef.current;
            setSubjectLoading(true);
            setSubjectError(null);
            try {
                const [tree, evts] = await Promise.all([
                    webSyllabusTrackerApi.getTree(subjectKey, cutoff),
                    webSyllabusTrackerApi.listEvents(subjectKey),
                ]);
                if (reqId !== subjectReqRef.current) return;
                setTreeData(tree);
                setEvents(evts);
                setExpandedChapters((prev) => {
                    if (prev.size > 0) return prev;
                    const initial =
                        tree.chapters.find((c) => c.status !== "COVERED") ??
                        tree.chapters[0];
                    return initial ? new Set([initial.chapterId]) : new Set();
                });
            } catch (err: unknown) {
                if (reqId !== subjectReqRef.current) return;
                setSubjectError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load syllabus coverage.",
                );
            } finally {
                if (reqId === subjectReqRef.current) {
                    setSubjectLoading(false);
                }
            }
        },
        [canFetch],
    );

    useEffect(() => {
        if (!canFetch) return;
        let cancelled = false;
        Promise.resolve().then(() => {
            if (!cancelled) void loadContext(false);
        });
        return () => {
            cancelled = true;
        };
    }, [canFetch, loadContext]);

    useEffect(() => {
        if (!canFetch || selectedSubjectKey === null) return;
        let cancelled = false;
        const key = selectedSubjectKey;
        const cutoff = asOfDate;
        Promise.resolve().then(() => {
            if (!cancelled) void loadSubjectTracker(key, cutoff);
        });
        return () => {
            cancelled = true;
        };
    }, [canFetch, selectedSubjectKey, asOfDate, loadSubjectTracker]);

    // Auto-sync when window regains focus (e.g. after recording on mobile)
    useEffect(() => {
        if (!canFetch) return;
        const onFocus = () => {
            void loadContext(true);
            if (selectedSubjectKey !== null) {
                void loadSubjectTracker(selectedSubjectKey, asOfDate);
            }
        };
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [canFetch, selectedSubjectKey, asOfDate, loadContext, loadSubjectTracker]);

    // --- Derived Collections ---
    const semesters = useMemo(() => {
        if (!contextData) return [];
        return Array.from(
            new Set(contextData.subjects.map((s) => s.semester)),
        ).sort((a, b) => a - b);
    }, [contextData]);

    const filteredSubjects = useMemo<TrackerSubjectOverview[]>(() => {
        if (!contextData) return [];
        const q = subjectSearch.trim().toLowerCase();
        return contextData.subjects.filter((s) => {
            if (semesterFilter !== null && s.semester !== semesterFilter) {
                return false;
            }
            if (!q) return true;
            return (
                s.subjectId.toLowerCase().includes(q) ||
                (s.subjectName ?? "").toLowerCase().includes(q)
            );
        });
    }, [contextData, semesterFilter, subjectSearch]);

    const activeSubject = useMemo(
        () =>
            contextData?.subjects.find(
                (s) => s.subjectKey === selectedSubjectKey,
            ) ?? null,
        [contextData, selectedSubjectKey],
    );

    const visibleChapters = useMemo(() => {
        if (!treeData) return [];
        const q = topicSearch.trim().toLowerCase();
        return treeData.chapters
            .map((ch) => {
                const topics = ch.topics.filter((t) => {
                    if (uncoveredOnly && t.covered) return false;
                    if (!q) return true;
                    return (
                        t.topicName.toLowerCase().includes(q) ||
                        ch.chapterName.toLowerCase().includes(q)
                    );
                });
                return { ...ch, visibleTopics: topics };
            })
            .filter((ch) => {
                if (uncoveredOnly && ch.status === "COVERED") return false;
                if (q && ch.visibleTopics.length === 0) return false;
                return true;
            });
    }, [treeData, uncoveredOnly, topicSearch]);

    const selectedGroups = useMemo(() => {
        if (!treeData) return [];
        const groups: {
            chapterId: number;
            chapterNo: number;
            chapterName: string;
            topics: { topicId: number; topicName: string }[];
        }[] = [];
        for (const ch of treeData.chapters) {
            const picked = ch.topics.filter((t) =>
                selectedTopicIds.has(t.topicId),
            );
            if (picked.length > 0) {
                groups.push({
                    chapterId: ch.chapterId,
                    chapterNo: ch.chapterNo,
                    chapterName: ch.chapterName,
                    topics: picked.map((t) => ({
                        topicId: t.topicId,
                        topicName: t.topicName,
                    })),
                });
            }
        }
        return groups;
    }, [treeData, selectedTopicIds]);

    const recordedDates = useMemo(
        () => Array.from(new Set(events.map((e) => e.coverageDate))).slice(0, 8),
        [events],
    );

    const timelineGroups = useMemo(() => {
        const grouped = new Map<string, CoverageEventItem[]>();
        for (const ev of events) {
            if (asOfDate && ev.coverageDate > asOfDate) continue;
            const bucket = grouped.get(ev.coverageDate) ?? [];
            bucket.push(ev);
            grouped.set(ev.coverageDate, bucket);
        }
        return Array.from(grouped.entries()).sort(([a], [b]) =>
            b.localeCompare(a),
        );
    }, [events, asOfDate]);

    // --- Handlers ---
    const handleSelectSubject = (subjectKey: number) => {
        setMobileSubjectsOpen(false);
        if (subjectKey === selectedSubjectKey) return;
        setSelectedSubjectKey(subjectKey);
        setSelectedTopicIds(new Set());
        setEditingEvent(null);
        setExpandedChapters(new Set());
        setNotice(null);
    };

    const toggleChapter = (chapterId: number) => {
        setExpandedChapters((prev) => {
            const next = new Set(prev);
            if (next.has(chapterId)) next.delete(chapterId);
            else next.add(chapterId);
            return next;
        });
    };

    const toggleTopicSelection = (topicId: number) => {
        if (asOfDate) {
            setNotice({
                tone: "info",
                text: "Switch back to Live View to select topics and record new coverage.",
            });
            return;
        }
        setSelectedTopicIds((prev) => {
            const next = new Set(prev);
            if (next.has(topicId)) next.delete(topicId);
            else next.add(topicId);
            return next;
        });
    };

    const handleBulkChapterSelection = (
        ids: number[],
        chapterId: number,
        mode: "select" | "deselect",
    ) => {
        if (asOfDate) {
            setNotice({
                tone: "info",
                text: "Switch back to Live View to bulk-select chapter topics.",
            });
            return;
        }
        setSelectedTopicIds((prev) => {
            const next = new Set(prev);
            for (const id of ids) {
                if (mode === "select") next.add(id);
                else next.delete(id);
            }
            return next;
        });
        if (mode === "select") {
            setExpandedChapters((prev) => new Set(prev).add(chapterId));
        }
    };

    const clearSelection = () => {
        setSelectedTopicIds(new Set());
        setEditingEvent(null);
    };

    const handleSaveCoverage = async (payload: {
        coverageDate: string;
        notes: string;
        topicIds: number[];
        editingEventId?: number;
    }) => {
        if (selectedSubjectKey === null) return;
        if (payload.editingEventId) {
            await webSyllabusTrackerApi.updateEvent(payload.editingEventId, {
                coverageDate: payload.coverageDate,
                notes: payload.notes,
                topicIds: payload.topicIds,
            });
            setNotice({
                tone: "success",
                text: `Updated coverage session on ${formatCalendarDate(payload.coverageDate)} (${payload.topicIds.length} topics).`,
            });
        } else {
            await webSyllabusTrackerApi.createEvent({
                subjectKey: selectedSubjectKey,
                coverageDate: payload.coverageDate,
                notes: payload.notes || undefined,
                topicIds: payload.topicIds,
            });
            setNotice({
                tone: "success",
                text: `Recorded ${payload.topicIds.length} ${payload.topicIds.length === 1 ? "topic" : "topics"} for ${formatCalendarDate(payload.coverageDate)}.`,
            });
        }

        setRecordModalOpen(false);
        setEditingEvent(null);
        setSelectedTopicIds(new Set());
        await Promise.all([
            loadSubjectTracker(selectedSubjectKey, asOfDate),
            loadContext(true),
        ]);
    };

    const handleStartEditEvent = (ev: CoverageEventItem) => {
        setAsOfDate(null);
        setEditingEvent(ev);
        setSelectedTopicIds(new Set(ev.topics.map((t) => t.topicId)));
        setRecordModalOpen(true);
    };

    const handleConfirmDelete = async (eventId: number) => {
        if (selectedSubjectKey === null) return;
        setDeletingEvent(true);
        setDeleteError(null);
        try {
            await webSyllabusTrackerApi.deleteEvent(eventId);
            setEventPendingDelete(null);
            setNotice({
                tone: "info",
                text: `Deleted session #${eventId}. Coverage history and progress recalculated.`,
            });
            await Promise.all([
                loadSubjectTracker(selectedSubjectKey, asOfDate),
                loadContext(true),
            ]);
        } catch (err: unknown) {
            setDeleteError(
                err instanceof Error
                    ? err.message
                    : "Unable to delete coverage session.",
            );
        } finally {
            setDeletingEvent(false);
        }
    };

    const handleCopyPortionSummary = async () => {
        if (!treeData) return;
        const lines: string[] = [
            `${treeData.subjectId} — ${treeData.subjectName ?? "Subject"}`,
            asOfDate
                ? `Recorded Syllabus Portion as of ${formatCalendarDate(asOfDate)}`
                : "Current Recorded Syllabus Portion",
            `Coverage: ${treeData.stats.coveragePercent}% (${treeData.stats.coveredTopics}/${treeData.stats.totalTopics} unique topics)`,
            "",
        ];
        for (const ch of treeData.chapters) {
            const coveredList = ch.topics.filter((t) => t.covered);
            if (coveredList.length === 0) continue;
            lines.push(
                `Ch ${ch.chapterNo}: ${ch.chapterName} (${coveredList.length}/${ch.totalTopics})`,
            );
            for (const t of coveredList) {
                lines.push(`  • ${t.topicName}`);
            }
        }
        try {
            await navigator.clipboard.writeText(lines.join("\n"));
            setNotice({
                tone: "success",
                text: "Copied covered syllabus portion summary to clipboard.",
            });
        } catch {
            setNotice({
                tone: "info",
                text: "Clipboard permission unavailable in this browser context.",
            });
        }
    };

    // --- Render Auth States ---
    if (auth.isRestoring) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="flex items-center gap-3 text-sm text-neutral-400">
                    <span className="h-4 w-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                    Restoring student session...
                </div>
            </div>
        );
    }

    if (!auth.isAuthenticated) {
        return (
            <StudentAuthGate
                onLogin={auth.login}
                onRegister={auth.registerAndLogin}
            />
        );
    }

    const academic = contextData?.academicContext;
    const stats = treeData?.stats;

    return (
        <div className="max-w-[1440px] mx-auto space-y-6 pb-20">
            {/* 1. ACADEMIC CONTEXT & HISTORICAL CUTOFF HEADER */}
            <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6">
                <KnowledgeConstellationSvg />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-950/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-red-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                Syllabus Tracker
                            </span>
                            {academic?.deptName && (
                                <span className="rounded-md border border-neutral-700/80 bg-neutral-950 px-2.5 py-0.5 text-xs font-medium text-neutral-200">
                                    {academic.deptCode
                                        ? `${academic.deptCode} — ${academic.deptName}`
                                        : academic.deptName}
                                </span>
                            )}
                            {academic?.currentSemester && (
                                <span className="rounded-md border border-neutral-700/80 bg-neutral-950 px-2.5 py-0.5 text-xs font-medium text-neutral-300">
                                    Semester {academic.currentSemester}
                                </span>
                            )}
                            {academic?.academicYearLabel && (
                                <span className="rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-0.5 text-xs text-neutral-400">
                                    Session {academic.academicYearLabel}
                                </span>
                            )}
                            {academic?.rollNumber && (
                                <span className="rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-0.5 text-xs text-neutral-400">
                                    Roll #{academic.rollNumber}
                                </span>
                            )}
                        </div>

                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-100">
                            {treeData
                                ? `${treeData.subjectId} — ${treeData.subjectName ?? "Selected Subject"}`
                                : activeSubject
                                  ? `${activeSubject.subjectId} — ${activeSubject.subjectName ?? "Selected Subject"}`
                                  : "Select a Subject to Track Coverage"}
                        </h3>
                        <p className="text-xs text-neutral-400">
                            Reconstructs your recorded lecture coverage history across mobile and web. Topics only appear covered when recorded in a session.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() =>
                                setSidebarCollapsed((prev) => !prev)
                            }
                            className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs font-medium text-neutral-300 hover:border-neutral-600 hover:text-white"
                        >
                            {sidebarCollapsed
                                ? "Show Subjects"
                                : "Hide Subjects"}
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setMobileSubjectsOpen((prev) => !prev)
                            }
                            className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs font-medium text-neutral-200"
                        >
                            {mobileSubjectsOpen
                                ? "Close Subject List"
                                : `Subjects (${contextData?.subjects.length ?? 0})`}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                void loadContext(true);
                                if (selectedSubjectKey !== null) {
                                    void loadSubjectTracker(
                                        selectedSubjectKey,
                                        asOfDate,
                                    );
                                }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs font-medium text-neutral-200 hover:border-neutral-600 hover:text-white"
                            title="Sync latest coverage records from database"
                        >
                            ↻ Sync
                        </button>

                        <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5">
                            <div className="text-right">
                                <p className="text-xs font-semibold text-neutral-200 leading-tight">
                                    {auth.user?.displayName || "Student"}
                                </p>
                                <p className="text-[11px] text-neutral-500 leading-tight">
                                    {auth.user?.email}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => void auth.logout()}
                                className="ml-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] font-medium text-neutral-300 hover:border-red-500/50 hover:text-red-300"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* Historical Date Cutoff Selector Bar */}
                <div className="relative z-10 mt-4 pt-4 border-t border-neutral-800/90 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <label
                            htmlFor="tracker-asof-date"
                            className="text-xs font-semibold text-neutral-300"
                        >
                            View Syllabus as of Date:
                        </label>
                        <input
                            id="tracker-asof-date"
                            type="date"
                            value={asOfDate ?? ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedTopicIds(new Set());
                                setEditingEvent(null);
                                setAsOfDate(val ? val : null);
                            }}
                            className="rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-100 focus:border-amber-500 focus:outline-none"
                        />
                        {asOfDate && (
                            <button
                                type="button"
                                onClick={() => setAsOfDate(null)}
                                className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30"
                            >
                                Reset to Live View
                            </button>
                        )}

                        {recordedDates.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-neutral-500 ml-1">
                                    Recorded dates:
                                </span>
                                {recordedDates.map((d) => {
                                    const active = asOfDate === d;
                                    return (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => {
                                                setSelectedTopicIds(new Set());
                                                setEditingEvent(null);
                                                setAsOfDate(active ? null : d);
                                            }}
                                            className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${
                                                active
                                                    ? "border-amber-500 bg-amber-500/20 text-amber-200"
                                                    : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                                            }`}
                                        >
                                            {formatCalendarDate(d, {
                                                includeYear: false,
                                            })}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {treeData && (
                        <button
                            type="button"
                            onClick={() => void handleCopyPortionSummary()}
                            className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-600 hover:text-white"
                        >
                            Copy Covered Portion
                        </button>
                    )}
                </div>
            </div>

            {/* Feedback Banner */}
            {notice && (
                <div
                    className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-xs ${
                        notice.tone === "success"
                            ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
                            : "border-amber-500/40 bg-amber-950/30 text-amber-200"
                    }`}
                >
                    <span>{notice.text}</span>
                    <button
                        type="button"
                        onClick={() => setNotice(null)}
                        className="text-neutral-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Historical Cutoff Active Banner */}
            {asOfDate && stats && treeData && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/25 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                                Historical Cutoff View
                            </span>
                            <span className="text-sm font-bold text-amber-100">
                                {treeData.subjectId} as of{" "}
                                {formatCalendarDate(asOfDate, {
                                    fullMonth: true,
                                })}
                            </span>
                        </div>
                        <p className="text-xs text-amber-200/80">
                            Showing {stats.coveredTopics} of {stats.totalTopics}{" "}
                            topics covered ({stats.coveragePercent}%) •{" "}
                            {stats.chaptersCovered} fully covered,{" "}
                            {stats.chaptersPartial} partial,{" "}
                            {stats.chaptersUncovered} uncovered chapters. Events
                            recorded after {formatCalendarDate(asOfDate)} are
                            excluded.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAsOfDate(null)}
                        className="shrink-0 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-neutral-950 hover:bg-amber-400"
                    >
                        Return to Live View
                    </button>
                </div>
            )}

            {/* Context Error / Loading */}
            {contextLoading && !contextData ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-12 text-center text-sm text-neutral-400">
                    Loading your department curriculum and coverage history...
                </div>
            ) : contextError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-red-200">
                            Failed to load Syllabus Tracker context
                        </p>
                        <p className="text-xs text-red-300/80 mt-1">
                            {contextError}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void loadContext(true)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                /* 2. RESPONSIVE MULTI-COLUMN WORKSPACE */
                <div className="flex flex-col lg:flex-row items-start gap-6">
                    {/* LEFT SUBJECT SELECTOR RAIL */}
                    <aside
                        className={`w-full lg:w-72 shrink-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-4 ${
                            mobileSubjectsOpen ? "block" : "hidden"
                        } ${sidebarCollapsed ? "lg:hidden" : "lg:block"}`}
                    >
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                                Subjects ({filteredSubjects.length})
                            </h4>
                            {semesterFilter !== null && (
                                <button
                                    type="button"
                                    onClick={() => setSemesterFilter(null)}
                                    className="text-[11px] text-red-400 hover:underline"
                                >
                                    Show all sems
                                </button>
                            )}
                        </div>

                        {semesters.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setSemesterFilter(null)}
                                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                                        semesterFilter === null
                                            ? "border-red-500 bg-red-600 text-white"
                                            : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200"
                                    }`}
                                >
                                    All
                                </button>
                                {semesters.map((sem) => (
                                    <button
                                        key={sem}
                                        type="button"
                                        onClick={() =>
                                            setSemesterFilter(
                                                semesterFilter === sem
                                                    ? null
                                                    : sem,
                                            )
                                        }
                                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                                            semesterFilter === sem
                                                ? "border-red-500 bg-red-600 text-white"
                                                : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200"
                                        }`}
                                    >
                                        Sem {sem}
                                    </button>
                                ))}
                            </div>
                        )}

                        <input
                            type="text"
                            value={subjectSearch}
                            onChange={(e) => setSubjectSearch(e.target.value)}
                            placeholder="Filter subjects..."
                            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                        />

                        {filteredSubjects.length === 0 ? (
                            <p className="py-6 text-center text-xs text-neutral-500">
                                No subjects match the current filter.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                                {filteredSubjects.map((sub) => {
                                    const active =
                                        sub.subjectKey === selectedSubjectKey;
                                    return (
                                        <button
                                            key={sub.subjectKey}
                                            type="button"
                                            onClick={() =>
                                                handleSelectSubject(
                                                    sub.subjectKey,
                                                )
                                            }
                                            className={`w-full text-left rounded-xl border p-3 transition-all ${
                                                active
                                                    ? "border-red-500/70 bg-red-950/25 shadow-md"
                                                    : "border-neutral-800 bg-neutral-950/70 hover:border-neutral-700"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                                                    {sub.subjectId}
                                                </span>
                                                <span className="text-[11px] font-bold text-neutral-200">
                                                    {sub.coveragePercent}%
                                                </span>
                                            </div>
                                            <p className="mt-1.5 text-xs font-semibold text-neutral-100 line-clamp-2">
                                                {sub.subjectName ??
                                                    sub.subjectId}
                                            </p>
                                            <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        sub.coveragePercent >=
                                                        100
                                                            ? "bg-emerald-500"
                                                            : "bg-red-500"
                                                    }`}
                                                    style={{
                                                        width: `${Math.min(100, sub.coveragePercent)}%`,
                                                    }}
                                                />
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500">
                                                <span>
                                                    {sub.coveredTopics}/
                                                    {sub.totalTopics} topics •
                                                    Sem {sub.semester}
                                                </span>
                                                {sub.lastCoverageDate && (
                                                    <span>
                                                        {formatCalendarDate(
                                                            sub.lastCoverageDate,
                                                            {
                                                                includeYear: false,
                                                            },
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </aside>

                    {/* CENTER PROGRESS + HIERARCHY + TIMELINE COLUMN */}
                    <div className="flex-1 min-w-0 space-y-6">
                        {subjectLoading && !treeData ? (
                            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-12 text-center text-sm text-neutral-400">
                                Reconstructing syllabus tree and dated sessions...
                            </div>
                        ) : subjectError ? (
                            <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-6 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-red-200">
                                        Couldn't load subject coverage
                                    </p>
                                    <p className="text-xs text-red-300/80 mt-1">
                                        {subjectError}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedSubjectKey !== null) {
                                            void loadSubjectTracker(
                                                selectedSubjectKey,
                                                asOfDate,
                                            );
                                        }
                                    }}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : treeData && stats ? (
                            <>
                                {/* PROGRESS OVERVIEW + WEEKLY ACTIVITY */}
                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                                    <div className="xl:col-span-7 rounded-xl border border-neutral-800 bg-neutral-900/90 p-5 flex flex-col sm:flex-row items-center gap-6">
                                        <CircularCoverageRing
                                            percent={stats.coveragePercent}
                                            covered={stats.coveredTopics}
                                            total={stats.totalTopics}
                                        />

                                        <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                                <p className="text-[11px] text-neutral-400">
                                                    Topics Covered
                                                </p>
                                                <p className="text-lg font-bold text-neutral-100 mt-0.5">
                                                    {stats.coveredTopics}
                                                    <span className="text-xs font-normal text-neutral-500">
                                                        /{stats.totalTopics}
                                                    </span>
                                                </p>
                                                <p className="text-[10px] text-neutral-500 mt-0.5">
                                                    {stats.remainingTopics}{" "}
                                                    remaining
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                                                <p className="text-[11px] text-emerald-400">
                                                    Chapters Done
                                                </p>
                                                <p className="text-lg font-bold text-neutral-100 mt-0.5">
                                                    {stats.chaptersCovered}
                                                    <span className="text-xs font-normal text-neutral-500">
                                                        /
                                                        {stats.totalChapters -
                                                            stats.chaptersEmpty}
                                                    </span>
                                                </p>
                                                <p className="text-[10px] text-neutral-500 mt-0.5">
                                                    Fully covered
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 col-span-2 sm:col-span-1">
                                                <p className="text-[11px] text-amber-400">
                                                    Chapter Split
                                                </p>
                                                <p className="text-sm font-bold text-neutral-100 mt-1">
                                                    {stats.chaptersPartial}{" "}
                                                    partial •{" "}
                                                    {stats.chaptersUncovered}{" "}
                                                    open
                                                </p>
                                                <p className="text-[10px] text-neutral-500 mt-1">
                                                    {stats.eventCount} recorded{" "}
                                                    {stats.eventCount === 1
                                                        ? "session"
                                                        : "sessions"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="xl:col-span-5">
                                        <WeeklyActivityChart
                                            buckets={treeData.weeklyActivity}
                                            asOf={asOfDate}
                                        />
                                    </div>
                                </div>

                                {/* INTERACTIVE CHAPTER -> TOPIC HIERARCHY */}
                                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-base font-bold text-neutral-100">
                                                Syllabus Knowledge Map
                                            </h4>
                                            <p className="text-xs text-neutral-400">
                                                Expand chapters to inspect coverage dates or select topics across multiple chapters for a new session.
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <input
                                                type="text"
                                                value={topicSearch}
                                                onChange={(e) =>
                                                    setTopicSearch(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Search chapter or topic..."
                                                className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setUncoveredOnly(
                                                        (prev) => !prev,
                                                    )
                                                }
                                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                    uncoveredOnly
                                                        ? "border-red-500 bg-red-600/20 text-red-300"
                                                        : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-600"
                                                }`}
                                            >
                                                {uncoveredOnly
                                                    ? "✓ Uncovered Only"
                                                    : "Uncovered Only"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (
                                                        expandedChapters.size ===
                                                        treeData.chapters.length
                                                    ) {
                                                        setExpandedChapters(
                                                            new Set(),
                                                        );
                                                    } else {
                                                        setExpandedChapters(
                                                            new Set(
                                                                treeData.chapters.map(
                                                                    (c) =>
                                                                        c.chapterId,
                                                                ),
                                                            ),
                                                        );
                                                    }
                                                }}
                                                className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-600"
                                            >
                                                {expandedChapters.size ===
                                                treeData.chapters.length
                                                    ? "Collapse All"
                                                    : "Expand All"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    timelineSectionRef.current?.scrollIntoView(
                                                        { behavior: "smooth" },
                                                    )
                                                }
                                                className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-600"
                                            >
                                                Timeline ({events.length}) ↓
                                            </button>
                                        </div>
                                    </div>

                                    {visibleChapters.length === 0 ? (
                                        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-10 text-center space-y-2">
                                            <p className="text-sm font-semibold text-neutral-200">
                                                {uncoveredOnly
                                                    ? "Every topic in this view is already covered!"
                                                    : "No chapters match your search"}
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                {uncoveredOnly
                                                    ? "Turn off 'Uncovered Only' to review covered dates and revisit indicators."
                                                    : "Clear the search filter to view the full syllabus hierarchy."}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="relative space-y-3">
                                            {visibleChapters.map((ch, idx) => {
                                                const expanded =
                                                    expandedChapters.has(
                                                        ch.chapterId,
                                                    );
                                                const pct =
                                                    ch.totalTopics > 0
                                                        ? Math.round(
                                                              (ch.coveredTopics /
                                                                  ch.totalTopics) *
                                                                  100,
                                                          )
                                                        : 0;
                                                const allIds = ch.topics.map(
                                                    (t) => t.topicId,
                                                );
                                                const uncoveredIds = ch.topics
                                                    .filter((t) => !t.covered)
                                                    .map((t) => t.topicId);
                                                const allSelected =
                                                    allIds.length > 0 &&
                                                    allIds.every((id) =>
                                                        selectedTopicIds.has(
                                                            id,
                                                        ),
                                                    );
                                                const selectedInChCount =
                                                    allIds.filter((id) =>
                                                        selectedTopicIds.has(
                                                            id,
                                                        ),
                                                    ).length;

                                                return (
                                                    <div
                                                        key={ch.chapterId}
                                                        className="relative flex gap-3"
                                                    >
                                                        {/* Connected Vertical Spine */}
                                                        <div className="flex flex-col items-center pt-4">
                                                            <ChapterNodeBadge
                                                                status={
                                                                    ch.status
                                                                }
                                                            />
                                                            {idx <
                                                                visibleChapters.length -
                                                                    1 && (
                                                                <div className="w-px flex-1 bg-neutral-800 mt-1" />
                                                            )}
                                                        </div>

                                                        {/* Chapter Card */}
                                                        <div
                                                            className={`flex-1 min-w-0 rounded-xl border transition-colors ${
                                                                ch.status ===
                                                                "COVERED"
                                                                    ? "border-emerald-500/30 bg-neutral-950/90"
                                                                    : ch.status ===
                                                                        "PARTIAL"
                                                                      ? "border-amber-500/35 bg-neutral-950/90"
                                                                      : "border-neutral-800 bg-neutral-950/75"
                                                            }`}
                                                        >
                                                            <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        toggleChapter(
                                                                            ch.chapterId,
                                                                        )
                                                                    }
                                                                    className="flex-1 min-w-[200px] text-left flex items-center gap-3"
                                                                >
                                                                    <span className="rounded-md bg-neutral-800 px-2 py-1 text-[11px] font-bold text-neutral-200">
                                                                        CH{" "}
                                                                        {
                                                                            ch.chapterNo
                                                                        }
                                                                    </span>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="text-sm font-semibold text-neutral-100">
                                                                                {
                                                                                    ch.chapterName
                                                                                }
                                                                            </span>
                                                                            <span
                                                                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                                                                    ch.status ===
                                                                                    "COVERED"
                                                                                        ? "bg-emerald-500/15 text-emerald-400"
                                                                                        : ch.status ===
                                                                                            "PARTIAL"
                                                                                          ? "bg-amber-500/15 text-amber-400"
                                                                                          : ch.status ===
                                                                                              "EMPTY"
                                                                                            ? "bg-neutral-800 text-neutral-500"
                                                                                            : "bg-neutral-800 text-neutral-400"
                                                                                }`}
                                                                            >
                                                                                {ch.status ===
                                                                                "COVERED"
                                                                                    ? "Covered"
                                                                                    : ch.status ===
                                                                                        "PARTIAL"
                                                                                      ? "Partial"
                                                                                      : ch.status ===
                                                                                          "EMPTY"
                                                                                        ? "No Topics"
                                                                                        : "Uncovered"}
                                                                            </span>
                                                                            {selectedInChCount >
                                                                                0 && (
                                                                                <span className="rounded bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                                                                                    {
                                                                                        selectedInChCount
                                                                                    }{" "}
                                                                                    selected
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-1.5 flex items-center gap-3">
                                                                            <div className="h-1.5 w-28 rounded-full bg-neutral-800 overflow-hidden">
                                                                                <div
                                                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                                                        ch.status ===
                                                                                        "COVERED"
                                                                                            ? "bg-emerald-500"
                                                                                            : ch.status ===
                                                                                                "PARTIAL"
                                                                                              ? "bg-amber-500"
                                                                                              : "bg-neutral-600"
                                                                                    }`}
                                                                                    style={{
                                                                                        width: `${pct}%`,
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <span className="text-[11px] text-neutral-400">
                                                                                {
                                                                                    ch.coveredTopics
                                                                                }
                                                                                /
                                                                                {
                                                                                    ch.totalTopics
                                                                                }{" "}
                                                                                topics
                                                                                ({pct}
                                                                                %)
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-xs text-neutral-400">
                                                                        {expanded
                                                                            ? "▲"
                                                                            : "▼"}
                                                                    </span>
                                                                </button>

                                                                {/* Explicit Chapter Bulk Selection Actions */}
                                                                {!asOfDate &&
                                                                    allIds.length >
                                                                        0 && (
                                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                                            {uncoveredIds.length >
                                                                                0 &&
                                                                                uncoveredIds.length <
                                                                                    allIds.length && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            handleBulkChapterSelection(
                                                                                                uncoveredIds,
                                                                                                ch.chapterId,
                                                                                                "select",
                                                                                            )
                                                                                        }
                                                                                        className="rounded-lg border border-red-500/40 bg-red-950/30 px-2.5 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-950/60"
                                                                                    >
                                                                                        Select{" "}
                                                                                        {
                                                                                            uncoveredIds.length
                                                                                        }{" "}
                                                                                        remaining
                                                                                    </button>
                                                                                )}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleBulkChapterSelection(
                                                                                        allIds,
                                                                                        ch.chapterId,
                                                                                        allSelected
                                                                                            ? "deselect"
                                                                                            : "select",
                                                                                    )
                                                                                }
                                                                                className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:border-neutral-600 hover:text-white"
                                                                            >
                                                                                {allSelected
                                                                                    ? `Deselect ${allIds.length}`
                                                                                    : `Select all ${allIds.length}`}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                            </div>

                                                            {/* Topic Nodes */}
                                                            {expanded && (
                                                                <div className="border-t border-neutral-800/80 px-4 py-3 space-y-1.5">
                                                                    {ch
                                                                        .visibleTopics
                                                                        .length ===
                                                                    0 ? (
                                                                        <p className="text-xs text-neutral-500 italic py-2">
                                                                            No topics listed in this chapter.
                                                                        </p>
                                                                    ) : (
                                                                        ch.visibleTopics.map(
                                                                            (
                                                                                topic,
                                                                            ) => {
                                                                                const selected =
                                                                                    selectedTopicIds.has(
                                                                                        topic.topicId,
                                                                                    );
                                                                                return (
                                                                                    <div
                                                                                        key={
                                                                                            topic.topicId
                                                                                        }
                                                                                        onClick={() =>
                                                                                            toggleTopicSelection(
                                                                                                topic.topicId,
                                                                                            )
                                                                                        }
                                                                                        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                                                                                            asOfDate
                                                                                                ? "cursor-default"
                                                                                                : "cursor-pointer"
                                                                                        } ${
                                                                                            selected
                                                                                                ? "border-red-500/60 bg-red-950/25"
                                                                                                : "border-neutral-800/70 bg-neutral-900/60 hover:border-neutral-700"
                                                                                        }`}
                                                                                    >
                                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                                            <span
                                                                                                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                                                                                    topic.covered
                                                                                                        ? "bg-emerald-400"
                                                                                                        : "bg-neutral-600"
                                                                                                }`}
                                                                                            />
                                                                                            <span
                                                                                                className={`text-xs sm:text-sm ${
                                                                                                    topic.covered
                                                                                                        ? "text-neutral-100 font-medium"
                                                                                                        : "text-neutral-300"
                                                                                                }`}
                                                                                            >
                                                                                                {
                                                                                                    topic.topicName
                                                                                                }
                                                                                            </span>
                                                                                        </div>

                                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                                            {topic.covered ? (
                                                                                                <>
                                                                                                    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                                                                                                        Covered{" "}
                                                                                                        {formatCalendarDate(
                                                                                                            topic.firstCoveredDate,
                                                                                                            {
                                                                                                                includeYear: false,
                                                                                                            },
                                                                                                        )}
                                                                                                    </span>
                                                                                                    {topic.timesCovered >
                                                                                                        1 && (
                                                                                                        <span
                                                                                                            className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300"
                                                                                                            title={`Revisited ${topic.timesCovered} times; most recently on ${formatCalendarDate(topic.lastCoveredDate)}`}
                                                                                                        >
                                                                                                            ↻{" "}
                                                                                                            {
                                                                                                                topic.timesCovered
                                                                                                            }
                                                                                                            × • last{" "}
                                                                                                            {formatCalendarDate(
                                                                                                                topic.lastCoveredDate,
                                                                                                                {
                                                                                                                    includeYear: false,
                                                                                                                },
                                                                                                            )}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </>
                                                                                            ) : (
                                                                                                <span className="text-[11px] text-neutral-500">
                                                                                                    Uncovered
                                                                                                </span>
                                                                                            )}

                                                                                            {!asOfDate && (
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={
                                                                                                        selected
                                                                                                    }
                                                                                                    onChange={() =>
                                                                                                        toggleTopicSelection(
                                                                                                            topic.topicId,
                                                                                                        )
                                                                                                    }
                                                                                                    onClick={(
                                                                                                        e,
                                                                                                    ) =>
                                                                                                        e.stopPropagation()
                                                                                                    }
                                                                                                    aria-label={`Select ${topic.topicName}`}
                                                                                                    className="h-4 w-4 accent-red-500 rounded cursor-pointer"
                                                                                                />
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            },
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* CHRONOLOGICAL COVERAGE TIMELINE */}
                                <div
                                    ref={timelineSectionRef}
                                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <h4 className="text-base font-bold text-neutral-100">
                                                Chronological Coverage Timeline
                                            </h4>
                                            <p className="text-xs text-neutral-400">
                                                Grouped by recorded lecture date. Click any session to inspect topics, view syllabus as of that date, edit, or delete.
                                            </p>
                                        </div>
                                        <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs font-medium text-neutral-300">
                                            {timelineGroups.reduce(
                                                (sum, [, list]) =>
                                                    sum + list.length,
                                                0,
                                            )}{" "}
                                            sessions shown
                                        </span>
                                    </div>

                                    {timelineGroups.length === 0 ? (
                                        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-10 text-center space-y-2">
                                            <p className="text-sm font-semibold text-neutral-200">
                                                {asOfDate
                                                    ? `No coverage sessions recorded on or before ${formatCalendarDate(asOfDate)}`
                                                    : "No coverage sessions recorded yet"}
                                            </p>
                                            <p className="text-xs text-neutral-500 max-w-md mx-auto">
                                                {asOfDate
                                                    ? "Choose a later cutoff date or reset to Live View."
                                                    : "Select topics in the Syllabus Knowledge Map above and click 'Record Coverage' to log your first lecture."}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {timelineGroups.map(
                                                ([dateStr, dayEvents]) => (
                                                    <div
                                                        key={dateStr}
                                                        className="relative pl-5 border-l-2 border-neutral-800 space-y-2.5"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="-ml-[25px] h-3 w-3 rounded-full border-2 border-red-500 bg-neutral-950" />
                                                                <h5 className="text-sm font-bold text-neutral-100">
                                                                    {formatCalendarDate(
                                                                        dateStr,
                                                                        {
                                                                            fullMonth: true,
                                                                        },
                                                                    )}
                                                                </h5>
                                                                <span className="text-[11px] text-neutral-500">
                                                                    (
                                                                    {
                                                                        dayEvents.length
                                                                    }{" "}
                                                                    {dayEvents.length ===
                                                                    1
                                                                        ? "session"
                                                                        : "sessions"}
                                                                    )
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedTopicIds(
                                                                        new Set(),
                                                                    );
                                                                    setEditingEvent(
                                                                        null,
                                                                    );
                                                                    setAsOfDate(
                                                                        asOfDate ===
                                                                            dateStr
                                                                            ? null
                                                                            : dateStr,
                                                                    );
                                                                }}
                                                                className="text-[11px] font-medium text-amber-400 hover:underline"
                                                            >
                                                                {asOfDate ===
                                                                dateStr
                                                                    ? "Viewing cutoff ✓"
                                                                    : "View syllabus as of this date"}
                                                            </button>
                                                        </div>

                                                        {dayEvents.map((ev) => {
                                                            const open =
                                                                expandedEventIds.has(
                                                                    ev.eventId,
                                                                );
                                                            return (
                                                                <div
                                                                    key={
                                                                        ev.eventId
                                                                    }
                                                                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3"
                                                                >
                                                                    <div
                                                                        onClick={() =>
                                                                            setExpandedEventIds(
                                                                                (
                                                                                    prev,
                                                                                ) => {
                                                                                    const next =
                                                                                        new Set(
                                                                                            prev,
                                                                                        );
                                                                                    if (
                                                                                        next.has(
                                                                                            ev.eventId,
                                                                                        )
                                                                                    ) {
                                                                                        next.delete(
                                                                                            ev.eventId,
                                                                                        );
                                                                                    } else {
                                                                                        next.add(
                                                                                            ev.eventId,
                                                                                        );
                                                                                    }
                                                                                    return next;
                                                                                },
                                                                            )
                                                                        }
                                                                        className="flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                                                                    >
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="rounded bg-red-950/50 border border-red-500/30 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                                                                                {
                                                                                    ev
                                                                                        .topics
                                                                                        .length
                                                                                }{" "}
                                                                                {ev
                                                                                    .topics
                                                                                    .length ===
                                                                                1
                                                                                    ? "topic"
                                                                                    : "topics"}
                                                                            </span>
                                                                            <span className="text-xs text-neutral-400">
                                                                                Session
                                                                                #
                                                                                {
                                                                                    ev.eventId
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-xs text-neutral-400 hover:text-neutral-200">
                                                                            {open
                                                                                ? "Hide details ▲"
                                                                                : "Inspect / Edit ▼"}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {ev.topics.map(
                                                                            (
                                                                                t,
                                                                            ) => (
                                                                                <span
                                                                                    key={
                                                                                        t.topicId
                                                                                    }
                                                                                    className="rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200"
                                                                                >
                                                                                    <span className="text-neutral-500 mr-1">
                                                                                        Ch{" "}
                                                                                        {
                                                                                            t.chapterNo
                                                                                        }
                                                                                        :
                                                                                    </span>
                                                                                    {
                                                                                        t.topicName
                                                                                    }
                                                                                </span>
                                                                            ),
                                                                        )}
                                                                    </div>

                                                                    {ev.notes && (
                                                                        <p className="text-xs text-neutral-300 bg-neutral-900/80 border-l-2 border-red-500/60 px-3 py-2 rounded-r-md">
                                                                            <span className="font-semibold text-neutral-400">
                                                                                Note:{" "}
                                                                            </span>
                                                                            {
                                                                                ev.notes
                                                                            }
                                                                        </p>
                                                                    )}

                                                                    {open && (
                                                                        <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                                                                            <span className="text-[11px] text-neutral-500">
                                                                                Saved{" "}
                                                                                {new Date(
                                                                                    ev.createdAt,
                                                                                ).toLocaleString()}
                                                                            </span>
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        handleStartEditEvent(
                                                                                            ev,
                                                                                        )
                                                                                    }
                                                                                    className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:border-neutral-500 hover:text-white"
                                                                                >
                                                                                    Edit Session
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setDeleteError(
                                                                                            null,
                                                                                        );
                                                                                        setEventPendingDelete(
                                                                                            ev,
                                                                                        );
                                                                                    }}
                                                                                    className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-950/60"
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </div>

                    {/* RIGHT CONTEXTUAL SELECTION DRAWER (Wide Desktop) */}
                    {treeData && stats && (
                        <aside className="hidden 2xl:block w-80 shrink-0 sticky top-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-4">
                            {selectedTopicIds.size > 0 && !asOfDate ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                                                Unsaved Selection
                                            </p>
                                            <h4 className="text-base font-bold text-neutral-100">
                                                {selectedTopicIds.size}{" "}
                                                {selectedTopicIds.size === 1
                                                    ? "Topic"
                                                    : "Topics"}{" "}
                                                Selected
                                            </h4>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={clearSelection}
                                            className="text-xs text-neutral-400 hover:text-white"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                                        {selectedGroups.map((g) => (
                                            <div
                                                key={g.chapterId}
                                                className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 space-y-1.5"
                                            >
                                                <p className="text-[11px] font-semibold text-neutral-400">
                                                    Ch {g.chapterNo}:{" "}
                                                    {g.chapterName}
                                                </p>
                                                {g.topics.map((t) => (
                                                    <div
                                                        key={t.topicId}
                                                        className="flex items-center justify-between gap-2 text-xs text-neutral-200"
                                                    >
                                                        <span className="truncate">
                                                            {t.topicName}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleTopicSelection(
                                                                    t.topicId,
                                                                )
                                                            }
                                                            className="text-neutral-500 hover:text-red-400"
                                                            aria-label={`Remove ${t.topicName}`}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setRecordModalOpen(true)}
                                        className="w-full rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/40"
                                    >
                                        {editingEvent
                                            ? "Update Coverage Session"
                                            : "Record Coverage"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                                            Chapter Progress Summary
                                        </p>
                                        <p className="text-xs text-neutral-500 mt-0.5">
                                            Select topics in the map to log a new lecture session.
                                        </p>
                                    </div>

                                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                                        {treeData.chapters.map((ch) => {
                                            const pct =
                                                ch.totalTopics > 0
                                                    ? Math.round(
                                                          (ch.coveredTopics /
                                                              ch.totalTopics) *
                                                              100,
                                                      )
                                                    : 0;
                                            return (
                                                <div
                                                    key={ch.chapterId}
                                                    className="space-y-1"
                                                >
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-neutral-300 truncate pr-2">
                                                            Ch {ch.chapterNo}.{" "}
                                                            {ch.chapterName}
                                                        </span>
                                                        <span className="text-neutral-400 font-semibold shrink-0">
                                                            {ch.coveredTopics}/
                                                            {ch.totalTopics}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                ch.status ===
                                                                "COVERED"
                                                                    ? "bg-emerald-500"
                                                                    : ch.status ===
                                                                        "PARTIAL"
                                                                      ? "bg-amber-500"
                                                                      : "bg-neutral-700"
                                                            }`}
                                                            style={{
                                                                width: `${pct}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </aside>
                    )}
                </div>
            )}

            {/* STICKY / FLOATING BOTTOM ACTION BAR WHEN TOPICS ARE SELECTED */}
            {selectedTopicIds.size > 0 && !asOfDate && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-red-500/50 bg-neutral-900/95 backdrop-blur-md px-5 py-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-neutral-100">
                            {selectedTopicIds.size}{" "}
                            {selectedTopicIds.size === 1 ? "topic" : "topics"}{" "}
                            selected
                        </p>
                        <p className="text-xs text-neutral-400">
                            {editingEvent
                                ? `Editing session from ${formatCalendarDate(editingEvent.coverageDate)}`
                                : `Spanning ${selectedGroups.length} ${selectedGroups.length === 1 ? "chapter" : "chapters"} • Unsaved selection`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={() => setRecordModalOpen(true)}
                            className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-950/50"
                        >
                            {editingEvent
                                ? "Update Session"
                                : "Record Coverage"}
                        </button>
                    </div>
                </div>
            )}

            {/* MODALS */}
            <RecordCoverageWebModal
                open={recordModalOpen}
                editingEvent={editingEvent}
                subjectLabel={
                    treeData
                        ? `${treeData.subjectId} — ${treeData.subjectName ?? ""}`
                        : "Selected Subject"
                }
                chapters={treeData?.chapters ?? []}
                selectedTopicIds={selectedTopicIds}
                onToggleTopic={toggleTopicSelection}
                onClose={() => setRecordModalOpen(false)}
                onSubmit={handleSaveCoverage}
            />

            <DeleteCoverageEventModal
                event={eventPendingDelete}
                deleting={deletingEvent}
                error={deleteError}
                onCancel={() => setEventPendingDelete(null)}
                onConfirm={(id) => void handleConfirmDelete(id)}
            />
        </div>
    );
}

