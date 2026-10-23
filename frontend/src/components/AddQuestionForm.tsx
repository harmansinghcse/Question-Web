import { useMemo, useRef, useState } from "react";
import { fetchApi } from "../services/api";
import SearchableSelect, { type ComboOption } from "./SearchableSelect";
import {
    useApiList,
    type ChapterOption,
    type DepartmentOption,
    type SubjectOption,
    type TopicOption,
} from "../hooks/useApiList";

// NOTE: the backend does not expose a departments endpoint yet. The
// `Department` table (deptId, deptName) exists in the database, so this path
// is where the list is expected once the backend adds it.
const DEPARTMENTS_ENDPOINT = "/api/departments";

// Mirrors the `Question.QuesType` enum in the database schema.
const QUESTION_TYPES = ["MCQ", "FILLUPS", "SUBJECTIVE", "TRUE/FALSE"] as const;
type QuestionType = (typeof QUESTION_TYPES)[number];

const TYPE_LABELS: Record<QuestionType, string> = {
    MCQ: "MCQ",
    FILLUPS: "Fill in the blanks",
    SUBJECTIVE: "Subjective",
    "TRUE/FALSE": "True / False",
};

interface SourceOption {
    sourceId: number;
    sourceType: "EXAM" | "BOOK";
    label: string;
}

interface CreatedQuestion {
    quesId: number;
}

type Notice =
    | { kind: "success"; quesId: number }
    | { kind: "error"; message: string }
    | null;

interface Errors {
    department?: string;
    subject?: string;
    chapter?: string;
    topics?: string;
    text?: string;
    type?: string;
    source?: string;
}

const inputClass = (invalid: boolean) =>
    `w-full rounded-md bg-neutral-950 border px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
        invalid ? "border-red-500/70" : "border-neutral-700"
    }`;

function Field({
    label,
    htmlFor,
    error,
    hint,
    children,
}: {
    label: string;
    htmlFor?: string;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="block text-sm font-medium text-neutral-200 mb-1.5"
            >
                {label} <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            {children}
            {hint && !error && (
                <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>
            )}
            {error && (
                <p
                    id={htmlFor ? `${htmlFor}-error` : undefined}
                    className="mt-1.5 text-xs text-red-400"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

export default function AddQuestionForm() {
    const [department, setDepartment] = useState<ComboOption | null>(null);
    const [subject, setSubject] = useState<ComboOption | null>(null);
    const [chapterId, setChapterId] = useState("");
    const [topicIds, setTopicIds] = useState<number[]>([]);
    const [text, setText] = useState("");
    const [type, setType] = useState<QuestionType | "">("");
    const [submitted, setSubmitted] = useState(false);
    const [sourceId, setSourceId] = useState("");
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
    const [notice, setNotice] = useState<Notice>(null);
    const [resetKey, setResetKey] = useState(0);

    const departments = useApiList<DepartmentOption>(DEPARTMENTS_ENDPOINT);
    // Subjects are only requested once a department is chosen, then filtered
    // client-side by their `deptId`.
    const subjects = useApiList<SubjectOption>(
        department ? "/api/subjects" : null,
    );
    const chapters = useApiList<ChapterOption>(
        subject ? `/api/chapters?subjectKey=${subject.id}` : null,
    );
    const topics = useApiList<TopicOption>(
        chapterId ? `/api/topics?chapterId=${chapterId}` : null,
    );
    const sources = useApiList<SourceOption>("/api/sources");

    const departmentOptions = useMemo<ComboOption[]>(
        () =>
            departments.data.map((d) => ({
                id: d.deptId,
                label: d.deptName,
            })),
        [departments.data],
    );

    const subjectOptions = useMemo<ComboOption[]>(
        () =>
            subjects.data
                .filter((s) => s.deptId === department?.id)
                .map((s) => ({
                    id: s.subjectKey,
                    label: `${s.subjectId} — ${s.subjectName}`,
                })),
        [subjects.data, department],
    );

    const errors: Errors = {};
    if (!department) errors.department = "Select a department.";
    if (!subject) errors.subject = "Select a subject.";
    if (!chapterId) errors.chapter = "Select a chapter.";
    if (topicIds.length === 0) errors.topics = "Select at least one topic.";
    if (!text.trim()) errors.text = "Enter the question text.";
    if (!type) errors.type = "Select a question type.";
    if (!sourceId) errors.source = "Select a source.";

    const show = (key: keyof Errors) => (submitted ? errors[key] : undefined);

    const clearNotice = () => setNotice(null);

    const handleDepartment = (option: ComboOption | null) => {
        setDepartment(option);
        setSubject(null);
        setChapterId("");
        setTopicIds([]);
        clearNotice();
    };

    const handleSubject = (option: ComboOption | null) => {
        setSubject(option);
        setChapterId("");
        setTopicIds([]);
        clearNotice();
    };

    const handleChapter = (value: string) => {
        setChapterId(value);
        setTopicIds([]);
        clearNotice();
    };

    const toggleTopic = (id: number) => {
        setTopicIds((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
        );
        clearNotice();
    };

    const handleReset = () => {
        setDepartment(null);
        setSubject(null);
        setChapterId("");
        setTopicIds([]);
        setText("");
        setType("");
        setSubmitted(false);
        setSourceId("");
        setNotice(null);
        setResetKey((k) => k + 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        // Block invalid input and duplicate submissions while saving.
        if (Object.keys(errors).length > 0 || savingRef.current) return;

        savingRef.current = true;
        setSaving(true);
        setNotice(null);
        try {
            const created = await fetchApi<CreatedQuestion>("/api/questions", {
                method: "POST",
                body: JSON.stringify({
                    quesText: text.trim(),
                    quesType: type,
                    sourceId: Number(sourceId),
                    topicIds,
                }),
            });
            if (typeof created?.quesId !== "number") {
                throw new Error(
                    "Unexpected server response; the question may not have been saved.",
                );
            }
            setNotice({ kind: "success", quesId: created.quesId });
            // Keep department/subject/chapter/type/source for quick follow-up
            // entries; clear what is specific to the saved question.
            setText("");
            setTopicIds([]);
            setSubmitted(false);
        } catch (error) {
            setNotice({
                kind: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to save the question.",
            });
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    const sortedChapters = useMemo(
        () => [...chapters.data].sort((a, b) => a.chapterNo - b.chapterNo),
        [chapters.data],
    );

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            aria-labelledby="add-question-title"
            className="max-w-3xl mx-auto"
        >
            <div className="mb-6">
                <h3
                    id="add-question-title"
                    className="text-2xl font-semibold text-neutral-100"
                >
                    Add Question
                </h3>
                <p className="text-neutral-400 mt-1">
                    Pick a department, subject, chapter and topics, then enter
                    the question.
                </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden space-y-6">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500/80"></div>

                {/* Department */}
                <Field
                    label="Department"
                    htmlFor="department"
                    error={
                        show("department") ??
                        (departments.error
                            ? `Couldn't load departments (${departments.error}).`
                            : undefined)
                    }
                >
                    <SearchableSelect
                        key={`dept-${resetKey}`}
                        id="department"
                        options={departmentOptions}
                        value={department}
                        onChange={handleDepartment}
                        loading={departments.loading}
                        error={departments.error}
                        onRetry={departments.retry}
                        invalid={!!show("department")}
                        describedBy={
                            show("department") || departments.error
                                ? "department-error"
                                : undefined
                        }
                        placeholder="Search departments…"
                        noun="departments"
                    />
                </Field>

                {/* Subject */}
                <Field
                    label="Subject"
                    htmlFor="subject"
                    error={
                        show("subject") ??
                        (subjects.error ? "Subjects failed to load." : undefined)
                    }
                    hint={!department ? "Select a department first." : undefined}
                >
                    <SearchableSelect
                        key={`subj-${resetKey}-${department?.id ?? 0}`}
                        id="subject"
                        options={subjectOptions}
                        value={subject}
                        onChange={handleSubject}
                        disabled={!department}
                        loading={subjects.loading}
                        error={subjects.error}
                        onRetry={subjects.retry}
                        invalid={!!show("subject")}
                        describedBy={show("subject") ? "subject-error" : undefined}
                        placeholder="Search by code or name…"
                        noun="subjects"
                    />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Chapter */}
                    <Field
                        label="Chapter"
                        htmlFor="chapter"
                        error={show("chapter") ?? (chapters.error ? "Chapters failed to load." : undefined)}
                        hint={!subject ? "Select a subject first." : undefined}
                    >
                        <select
                            id="chapter"
                            value={chapterId}
                            disabled={!subject || chapters.loading}
                            onChange={(e) => handleChapter(e.target.value)}
                            aria-invalid={!!show("chapter") || undefined}
                            aria-describedby={show("chapter") ? "chapter-error" : undefined}
                            className={inputClass(!!show("chapter"))}
                        >
                            <option value="">
                                {chapters.loading
                                    ? "Loading chapters…"
                                    : subject && !chapters.error && sortedChapters.length === 0
                                      ? "No chapters for this subject"
                                      : "Select a chapter"}
                            </option>
                            {sortedChapters.map((c) => (
                                <option key={c.chapterId} value={c.chapterId}>
                                    {c.chapterNo}. {c.chapterName}
                                </option>
                            ))}
                        </select>
                        {chapters.error && (
                            <button
                                type="button"
                                onClick={chapters.retry}
                                className="mt-1.5 text-xs text-red-300 underline underline-offset-2 hover:text-red-200"
                            >
                                Retry loading chapters
                            </button>
                        )}
                    </Field>

                    {/* Question type */}
                    <Field label="Question type" htmlFor="type" error={show("type")}>
                        <select
                            id="type"
                            value={type}
                            onChange={(e) => {
                                setType(e.target.value as QuestionType | "");
                                clearNotice();
                            }}
                            aria-invalid={!!show("type") || undefined}
                            aria-describedby={show("type") ? "type-error" : undefined}
                            className={inputClass(!!show("type"))}
                        >
                            <option value="">Select a type</option>
                            {QUESTION_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {TYPE_LABELS[t]}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>

                {/* Source */}
                <Field
                    label="Source"
                    htmlFor="source"
                    error={
                        show("source") ??
                        (sources.error ? "Sources failed to load." : undefined)
                    }
                    hint={
                        !sources.loading &&
                        !sources.error &&
                        sources.data.length === 0
                            ? "No sources exist in the database yet."
                            : "Where this question comes from (existing exams / books)."
                    }
                >
                    <select
                        id="source"
                        value={sourceId}
                        disabled={sources.loading}
                        onChange={(e) => {
                            setSourceId(e.target.value);
                            clearNotice();
                        }}
                        aria-invalid={!!show("source") || undefined}
                        aria-describedby={show("source") ? "source-error" : undefined}
                        className={inputClass(!!show("source"))}
                    >
                        <option value="">
                            {sources.loading ? "Loading sources…" : "Select a source"}
                        </option>
                        {sources.data.map((s) => (
                            <option key={s.sourceId} value={s.sourceId}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                    {sources.error && (
                        <button
                            type="button"
                            onClick={sources.retry}
                            className="mt-1.5 text-xs text-red-300 underline underline-offset-2 hover:text-red-200"
                        >
                            Retry loading sources
                        </button>
                    )}
                </Field>

                {/* Topics */}
                <fieldset
                    disabled={!chapterId}
                    aria-describedby={show("topics") ? "topics-error" : undefined}
                >
                    <legend className="block text-sm font-medium text-neutral-200 mb-1.5">
                        Topics <span className="text-red-500" aria-hidden="true">*</span>
                        {topicIds.length > 0 && (
                            <span className="ml-2 text-xs font-normal text-red-300">
                                {topicIds.length} selected
                            </span>
                        )}
                    </legend>
                    <div
                        className={`rounded-md border bg-neutral-950 max-h-56 overflow-y-auto ${
                            show("topics") ? "border-red-500/70" : "border-neutral-700"
                        } ${!chapterId ? "opacity-50" : ""}`}
                    >
                        {!chapterId ? (
                            <p className="px-3 py-4 text-sm text-neutral-500">
                                Select a chapter to see its topics.
                            </p>
                        ) : topics.loading ? (
                            <div className="p-3 space-y-2" aria-busy="true">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="h-5 rounded bg-neutral-800 animate-pulse"
                                    ></div>
                                ))}
                            </div>
                        ) : topics.error ? (
                            <p className="px-3 py-4 text-sm text-red-400">
                                Couldn't load topics.{" "}
                                <button
                                    type="button"
                                    onClick={topics.retry}
                                    className="underline underline-offset-2 hover:text-red-300"
                                >
                                    Retry
                                </button>
                            </p>
                        ) : topics.data.length === 0 ? (
                            <p className="px-3 py-4 text-sm text-neutral-500">
                                No topics found for this chapter.
                            </p>
                        ) : (
                            <ul className="divide-y divide-neutral-800">
                                {topics.data.map((t) => (
                                    <li key={t.topicId}>
                                        <label className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={topicIds.includes(t.topicId)}
                                                onChange={() => toggleTopic(t.topicId)}
                                                className="h-4 w-4 accent-red-500"
                                            />
                                            {t.topicName}
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {show("topics") && (
                        <p id="topics-error" className="mt-1.5 text-xs text-red-400">
                            {errors.topics}
                        </p>
                    )}
                </fieldset>

                {/* Question text */}
                <Field label="Question text" htmlFor="text" error={show("text")}>
                    <textarea
                        id="text"
                        rows={5}
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            clearNotice();
                        }}
                        placeholder="Type the full question here…"
                        aria-invalid={!!show("text") || undefined}
                        aria-describedby={show("text") ? "text-error" : undefined}
                        className={`${inputClass(!!show("text"))} resize-y`}
                    />
                </Field>

                {notice?.kind === "success" && (
                    <div
                        role="status"
                        className="rounded-md border border-emerald-500/30 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200"
                    >
                        Question saved successfully (ID {notice.quesId}).
                    </div>
                )}
                {notice?.kind === "error" && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-200"
                    >
                        <p className="font-medium">
                            Couldn't save the question. Nothing was saved.
                        </p>
                        <p className="mt-0.5 text-xs text-red-300/90">
                            {notice.message}
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-neutral-800">
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={saving}
                        className="px-4 py-2 rounded-md text-sm font-medium text-neutral-300 border border-neutral-700 hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Reset
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        aria-busy={saving}
                        className="px-5 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400/60 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving…" : "Save Question"}
                    </button>
                </div>
            </div>
        </form>
    );
}
