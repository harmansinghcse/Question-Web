import { useId, useMemo, useRef, useState } from "react";
import { fetchApi } from "../services/api";
import SearchableSelect, { type ComboOption } from "./SearchableSelect";
import {
    useApiList,
    type ChapterOption,
    type DepartmentOption,
    type SubjectOption,
    type TopicOption,
} from "../hooks/useApiList";

const DEPARTMENTS_ENDPOINT = "/api/departments";

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
    quesText?: string;
    imageUrls?: string[];
}

interface UploadSignature {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
}

interface ImageAttachment {
    id: string;
    file: File;
    previewUrl: string;
}

interface JsonImportItem {
    id: string;
    questionText: string;
    rawChapterName?: string;
    rawTopicNames?: string[];
    chapterId: string;
    topicIds: number[];
    images: ImageAttachment[];
    status?: "idle" | "uploading" | "saving" | "success" | "error";
    error?: string;
    savedQuesId?: number;
}

type Notice =
    | { kind: "success"; message: string }
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

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];

/**
 * Uploads a file securely to Cloudinary using signed parameters from the backend.
 * The backend secret is never exposed.
 */
async function uploadToCloudinary(
    file: File,
    onProgress?: (text: string) => void,
): Promise<string> {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        throw new Error(
            `"${file.name}" is not a supported format. Please upload JPG, PNG, WEBP, or GIF.`,
        );
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(
            `"${file.name}" is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
        );
    }

    onProgress?.(`Signing upload for ${file.name}…`);
    const sig = await fetchApi<UploadSignature>(
        "/api/questions/upload-signature",
    );

    onProgress?.(`Uploading ${file.name} to Cloudinary…`);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sig.apiKey);
    formData.append("timestamp", String(sig.timestamp));
    formData.append("signature", sig.signature);
    formData.append("folder", sig.folder);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        {
            method: "POST",
            body: formData,
        },
    );

    if (!response.ok) {
        const errJson = (await response.json().catch(() => null)) as {
            error?: { message?: string };
        } | null;
        throw new Error(
            errJson?.error?.message ||
                `Cloudinary upload failed for "${file.name}" (${response.statusText}).`,
        );
    }

    const json = (await response.json()) as { secure_url?: string };
    if (!json.secure_url) {
        throw new Error(
            `Upload completed, but no secure HTTPS URL was returned for "${file.name}".`,
        );
    }

    return json.secure_url;
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
    required = true,
    children,
}: {
    label: string;
    htmlFor?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="block text-sm font-medium text-neutral-200 mb-1.5"
            >
                {label}{" "}
                {required && (
                    <span className="text-red-500" aria-hidden="true">
                        *
                    </span>
                )}
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
    const [mode, setMode] = useState<"manual" | "json">("manual");

    // Common selectors
    const [department, setDepartment] = useState<ComboOption | null>(null);
    const [subject, setSubject] = useState<ComboOption | null>(null);
    const [type, setType] = useState<QuestionType | "">("");
    const [sourceId, setSourceId] = useState("");

    // Manual Entry state
    const [chapterId, setChapterId] = useState("");
    const [topicIds, setTopicIds] = useState<number[]>([]);
    const [text, setText] = useState("");
    const [manualImages, setManualImages] = useState<ImageAttachment[]>([]);
    const [manualSubmitted, setManualSubmitted] = useState(false);

    // JSON Import state
    const [jsonRaw, setJsonRaw] = useState("");
    const [jsonItems, setJsonItems] = useState<JsonImportItem[]>([]);
    const [jsonParseError, setJsonParseError] = useState<string | null>(null);
    const [jsonImportProgress, setJsonImportProgress] = useState<string | null>(
        null,
    );

    // Global form saving & notice
    const [saving, setSaving] = useState(false);
    const [progressStatus, setProgressStatus] = useState<string | null>(null);
    const savingRef = useRef(false);
    const [notice, setNotice] = useState<Notice>(null);
    const [resetKey, setResetKey] = useState(0);

    const manualFileInputId = useId();

    // API list hooks
    const departments = useApiList<DepartmentOption>(DEPARTMENTS_ENDPOINT);
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

    const sortedChapters = useMemo(
        () => [...chapters.data].sort((a, b) => a.chapterNo - b.chapterNo),
        [chapters.data],
    );

    // Validation for Manual Entry
    const errors: Errors = {};
    if (!department) errors.department = "Select a department.";
    if (!subject) errors.subject = "Select a subject.";
    if (!chapterId) errors.chapter = "Select a chapter.";
    if (topicIds.length === 0) errors.topics = "Select at least one topic.";
    if (!text.trim()) errors.text = "Enter the question text.";
    if (!type) errors.type = "Select a question type.";
    if (!sourceId) errors.source = "Select a source.";

    const show = (key: keyof Errors) =>
        manualSubmitted ? errors[key] : undefined;
    const clearNotice = () => setNotice(null);

    // Reset handlers
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
        manualImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        setManualImages([]);
        setDepartment(null);
        setSubject(null);
        setChapterId("");
        setTopicIds([]);
        setText("");
        setType("");
        setManualSubmitted(false);
        setSourceId("");
        setNotice(null);
        setResetKey((k) => k + 1);
        setJsonRaw("");
        setJsonItems([]);
        setJsonParseError(null);
    };

    // Manual images management
    const handleAddManualImages = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const newAttachments: ImageAttachment[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                setNotice({
                    kind: "error",
                    message: `"${file.name}" has an unsupported format. Use JPG, PNG, WEBP, or GIF.`,
                });
                return;
            }
            if (file.size > MAX_IMAGE_SIZE_BYTES) {
                setNotice({
                    kind: "error",
                    message: `"${file.name}" exceeds the 5 MB limit.`,
                });
                return;
            }
            newAttachments.push({
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                file,
                previewUrl: URL.createObjectURL(file),
            });
        }
        setManualImages((prev) => [...prev, ...newAttachments]);
        clearNotice();
    };

    const handleRemoveManualImage = (id: string) => {
        setManualImages((prev) => {
            const target = prev.find((img) => img.id === id);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return prev.filter((img) => img.id !== id);
        });
    };

    // Manual Entry Submit
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setManualSubmitted(true);
        if (Object.keys(errors).length > 0 || savingRef.current) return;

        savingRef.current = true;
        setSaving(true);
        setNotice(null);
        setProgressStatus("Starting upload…");

        try {
            // 1. Upload attached images to Cloudinary first
            const uploadedUrls: string[] = [];
            for (let i = 0; i < manualImages.length; i++) {
                const img = manualImages[i];
                setProgressStatus(
                    `Uploading image ${i + 1} of ${manualImages.length}…`,
                );
                const url = await uploadToCloudinary(img.file);
                uploadedUrls.push(url);
            }

            // 2. Atomically save question and image associations
            setProgressStatus("Saving question to database…");
            const created = await fetchApi<CreatedQuestion>("/api/questions", {
                method: "POST",
                body: JSON.stringify({
                    quesText: text.trim(),
                    quesType: type,
                    sourceId: Number(sourceId),
                    topicIds,
                    imageUrls: uploadedUrls,
                }),
            });

            if (typeof created?.quesId !== "number") {
                throw new Error("Server did not return a valid question ID.");
            }

            // Revoke preview object URLs
            manualImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
            setManualImages([]);

            setNotice({
                kind: "success",
                message: `Question saved successfully (ID #${created.quesId})${
                    uploadedUrls.length > 0
                        ? ` with ${uploadedUrls.length} image(s).`
                        : "."
                }`,
            });

            // Retain department/subject/chapter/type/source for rapid entry
            setText("");
            setTopicIds([]);
            setManualSubmitted(false);
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
            setProgressStatus(null);
        }
    };

    // JSON Import parsing
    const handleParseJson = () => {
        setJsonParseError(null);
        setNotice(null);
        if (!jsonRaw.trim()) {
            setJsonParseError("Please paste JSON or choose a JSON file first.");
            return;
        }

        try {
            const parsed = JSON.parse(jsonRaw);
            if (!Array.isArray(parsed)) {
                throw new Error(
                    "JSON must be an array of question objects: [ { questionText, chapter, topics } ]",
                );
            }

            const items: JsonImportItem[] = parsed.map((item, idx) => {
                const qText = String(item.questionText ?? "").trim();
                const chName = String(item.chapter ?? "").trim();
                const tNames: string[] = Array.isArray(item.topics)
                    ? item.topics.map((t: unknown) => String(t).trim())
                    : [];

                // Try to match chapter by name against sortedChapters
                let matchedChapterId = "";
                if (chName && sortedChapters.length > 0) {
                    const normCh = chName.toLowerCase();
                    const found = sortedChapters.find(
                        (c) =>
                            c.chapterName.toLowerCase() === normCh ||
                            c.chapterName.toLowerCase().includes(normCh) ||
                            normCh.includes(c.chapterName.toLowerCase()),
                    );
                    if (found) matchedChapterId = String(found.chapterId);
                }

                // If not matched, default to the currently selected chapter dropdown
                if (!matchedChapterId && chapterId) {
                    matchedChapterId = chapterId;
                }

                return {
                    id: `json-q-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    questionText: qText,
                    rawChapterName: chName,
                    rawTopicNames: tNames,
                    chapterId: matchedChapterId,
                    topicIds: [],
                    images: [],
                    status: "idle",
                };
            });

            if (items.length === 0) {
                throw new Error(
                    "The provided JSON array does not contain any questions.",
                );
            }

            setJsonItems(items);
            setNotice({
                kind: "success",
                message: `Parsed ${items.length} question(s). Review each question below, match topics, and optionally attach images.`,
            });
        } catch (err) {
            setJsonParseError(
                err instanceof Error ? err.message : "Failed to parse JSON.",
            );
        }
    };

    const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result;
            if (typeof content === "string") {
                setJsonRaw(content);
            }
        };
        reader.readAsText(file);
    };

    // JSON item image attachments
    const handleAddJsonImages = (
        itemId: string,
        files: FileList | null,
    ) => {
        if (!files || files.length === 0) return;
        const newAttachments: ImageAttachment[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                alert(
                    `"${file.name}" has an unsupported format. Please upload JPG, PNG, WEBP, or GIF.`,
                );
                return;
            }
            if (file.size > MAX_IMAGE_SIZE_BYTES) {
                alert(`"${file.name}" exceeds the 5 MB size limit.`);
                return;
            }
            newAttachments.push({
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                file,
                previewUrl: URL.createObjectURL(file),
            });
        }

        setJsonItems((prev) =>
            prev.map((item) =>
                item.id === itemId
                    ? { ...item, images: [...item.images, ...newAttachments] }
                    : item,
            ),
        );
    };

    const handleRemoveJsonImage = (itemId: string, imageId: string) => {
        setJsonItems((prev) =>
            prev.map((item) => {
                if (item.id !== itemId) return item;
                const target = item.images.find((img) => img.id === imageId);
                if (target) URL.revokeObjectURL(target.previewUrl);
                return {
                    ...item,
                    images: item.images.filter((img) => img.id !== imageId),
                };
            }),
        );
    };

    const handleRemoveJsonItem = (itemId: string) => {
        setJsonItems((prev) => {
            const target = prev.find((item) => item.id === itemId);
            if (target) {
                target.images.forEach((img) =>
                    URL.revokeObjectURL(img.previewUrl),
                );
            }
            return prev.filter((item) => item.id !== itemId);
        });
    };

    // JSON Batch Import Runner
    const handleRunBatchImport = async () => {
        if (!department || !subject || !type || !sourceId) {
            setNotice({
                kind: "error",
                message:
                    "Please select Department, Subject, Question Type, and Source before importing.",
            });
            return;
        }

        if (jsonItems.length === 0) {
            setNotice({
                kind: "error",
                message: "No questions available to import.",
            });
            return;
        }

        savingRef.current = true;
        setSaving(true);
        setNotice(null);

        let successCount = 0;
        let failCount = 0;
        const failedItems: string[] = [];

        for (let i = 0; i < jsonItems.length; i++) {
            const item = jsonItems[i];
            setJsonImportProgress(
                `Processing question ${i + 1} of ${jsonItems.length}: "${item.questionText.slice(0, 30)}…"`,
            );

            // Update item state to uploading
            setJsonItems((prev) =>
                prev.map((it) =>
                    it.id === item.id ? { ...it, status: "uploading" } : it,
                ),
            );

            try {
                if (!item.questionText.trim()) {
                    throw new Error("Question text is empty.");
                }
                const effectiveChapterId = item.chapterId || chapterId;
                if (!effectiveChapterId) {
                    throw new Error("No chapter selected for this question.");
                }

                // If no topic selected, fetch topics for this chapter and auto-match
                let targetTopicIds = item.topicIds;
                if (targetTopicIds.length === 0) {
                    const chTopics = await fetchApi<TopicOption[]>(
                        `/api/topics?chapterId=${effectiveChapterId}`,
                    );
                    if (chTopics.length > 0 && item.rawTopicNames?.length) {
                        const matched = chTopics.filter((t) =>
                            item.rawTopicNames?.some(
                                (raw) =>
                                    raw.toLowerCase() ===
                                        t.topicName.toLowerCase() ||
                                    t.topicName
                                        .toLowerCase()
                                        .includes(raw.toLowerCase()),
                            ),
                        );
                        if (matched.length > 0) {
                            targetTopicIds = matched.map((m) => m.topicId);
                        } else {
                            targetTopicIds = [chTopics[0].topicId];
                        }
                    } else if (chTopics.length > 0) {
                        targetTopicIds = [chTopics[0].topicId];
                    } else {
                        throw new Error(
                            "Selected chapter has no topics available.",
                        );
                    }
                }

                // 1. Upload attached images to Cloudinary (if any)
                const uploadedUrls: string[] = [];
                for (let j = 0; j < item.images.length; j++) {
                    const img = item.images[j];
                    setJsonImportProgress(
                        `Question ${i + 1}/${jsonItems.length}: Uploading image ${j + 1}/${item.images.length}…`,
                    );
                    const url = await uploadToCloudinary(img.file);
                    uploadedUrls.push(url);
                }

                // 2. Save question
                setJsonImportProgress(
                    `Question ${i + 1}/${jsonItems.length}: Saving question record…`,
                );
                const created = await fetchApi<CreatedQuestion>(
                    "/api/questions",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            quesText: item.questionText.trim(),
                            quesType: type,
                            sourceId: Number(sourceId),
                            topicIds: targetTopicIds,
                            imageUrls: uploadedUrls,
                        }),
                    },
                );

                if (typeof created?.quesId !== "number") {
                    throw new Error("Failed to save question to database.");
                }

                successCount++;
                setJsonItems((prev) =>
                    prev.map((it) =>
                        it.id === item.id
                            ? {
                                  ...it,
                                  status: "success",
                                  savedQuesId: created.quesId,
                              }
                            : it,
                    ),
                );
            } catch (err) {
                failCount++;
                const errMsg =
                    err instanceof Error ? err.message : "Unknown error";
                failedItems.push(`Question #${i + 1}: ${errMsg}`);
                setJsonItems((prev) =>
                    prev.map((it) =>
                        it.id === item.id
                            ? { ...it, status: "error", error: errMsg }
                            : it,
                    ),
                );
            }
        }

        savingRef.current = false;
        setSaving(false);
        setJsonImportProgress(null);

        if (failCount === 0) {
            setNotice({
                kind: "success",
                message: `Successfully imported all ${successCount} question(s)!`,
            });
        } else {
            setNotice({
                kind: "error",
                message: `Import finished: ${successCount} succeeded, ${failCount} failed.\n${failedItems.join("\n")}`,
            });
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header & Mode Switcher */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3
                        id="add-question-title"
                        className="text-2xl font-semibold text-neutral-100"
                    >
                        Question Management
                    </h3>
                    <p className="text-neutral-400 mt-1 text-sm">
                        Create questions manually or batch import from JSON with
                        Cloudinary image uploads.
                    </p>
                </div>

                {/* Tabs */}
                <div className="inline-flex p-1 rounded-lg bg-neutral-900 border border-neutral-800">
                    <button
                        type="button"
                        onClick={() => {
                            setMode("manual");
                            clearNotice();
                        }}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                            mode === "manual"
                                ? "bg-red-600 text-white shadow"
                                : "text-neutral-400 hover:text-neutral-200"
                        }`}
                    >
                        Manual Entry
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode("json");
                            clearNotice();
                        }}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                            mode === "json"
                                ? "bg-red-600 text-white shadow"
                                : "text-neutral-400 hover:text-neutral-200"
                        }`}
                    >
                        JSON Import
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {notice?.kind === "success" && (
                <div
                    role="status"
                    className="mb-6 rounded-md border border-emerald-500/30 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200 whitespace-pre-line"
                >
                    {notice.message}
                </div>
            )}
            {notice?.kind === "error" && (
                <div
                    role="alert"
                    className="mb-6 rounded-md border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-200 whitespace-pre-line"
                >
                    <p className="font-semibold">Notice</p>
                    <p className="mt-0.5 text-xs text-red-300/90">
                        {notice.message}
                    </p>
                </div>
            )}

            {/* Progress status during async uploads */}
            {(progressStatus || jsonImportProgress) && (
                <div className="mb-6 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-neutral-300 font-medium">
                        {progressStatus || jsonImportProgress}
                    </p>
                </div>
            )}

            {/* Common Context Selectors */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden mb-6 space-y-6">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500/80"></div>
                <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                    Target Subject & Context
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            (subjects.error
                                ? "Subjects failed to load."
                                : undefined)
                        }
                        hint={
                            !department
                                ? "Select a department first."
                                : undefined
                        }
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
                            describedBy={
                                show("subject") ? "subject-error" : undefined
                            }
                            placeholder="Search by code or name…"
                            noun="subjects"
                        />
                    </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Question type */}
                    <Field
                        label="Question type"
                        htmlFor="type"
                        error={show("type")}
                    >
                        <select
                            id="type"
                            value={type}
                            onChange={(e) => {
                                setType(e.target.value as QuestionType | "");
                                clearNotice();
                            }}
                            aria-invalid={!!show("type") || undefined}
                            aria-describedby={
                                show("type") ? "type-error" : undefined
                            }
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

                    {/* Source */}
                    <Field
                        label="Source"
                        htmlFor="source"
                        error={
                            show("source") ??
                            (sources.error
                                ? "Sources failed to load."
                                : undefined)
                        }
                        hint={
                            !sources.loading &&
                            !sources.error &&
                            sources.data.length === 0
                                ? "No sources exist in the database yet."
                                : "Exam or Book reference."
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
                            aria-describedby={
                                show("source") ? "source-error" : undefined
                            }
                            className={inputClass(!!show("source"))}
                        >
                            <option value="">
                                {sources.loading
                                    ? "Loading sources…"
                                    : "Select a source"}
                            </option>
                            {sources.data.map((s) => (
                                <option key={s.sourceId} value={s.sourceId}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
            </div>

            {/* TAB 1: MANUAL ENTRY */}
            {mode === "manual" && (
                <form
                    onSubmit={handleManualSubmit}
                    noValidate
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden space-y-6"
                >
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500/80"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Chapter */}
                        <Field
                            label="Chapter"
                            htmlFor="chapter"
                            error={
                                show("chapter") ??
                                (chapters.error
                                    ? "Chapters failed to load."
                                    : undefined)
                            }
                            hint={
                                !subject
                                    ? "Select a subject first."
                                    : undefined
                            }
                        >
                            <select
                                id="chapter"
                                value={chapterId}
                                disabled={!subject || chapters.loading}
                                onChange={(e) => handleChapter(e.target.value)}
                                aria-invalid={!!show("chapter") || undefined}
                                aria-describedby={
                                    show("chapter") ? "chapter-error" : undefined
                                }
                                className={inputClass(!!show("chapter"))}
                            >
                                <option value="">
                                    {chapters.loading
                                        ? "Loading chapters…"
                                        : subject &&
                                            !chapters.error &&
                                            sortedChapters.length === 0
                                          ? "No chapters for this subject"
                                          : "Select a chapter"}
                                </option>
                                {sortedChapters.map((c) => (
                                    <option
                                        key={c.chapterId}
                                        value={c.chapterId}
                                    >
                                        {c.chapterNo}. {c.chapterName}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        {/* Topics */}
                        <fieldset
                            disabled={!chapterId}
                            aria-describedby={
                                show("topics") ? "topics-error" : undefined
                            }
                        >
                            <legend className="block text-sm font-medium text-neutral-200 mb-1.5">
                                Topics{" "}
                                <span className="text-red-500" aria-hidden="true">
                                    *
                                </span>
                                {topicIds.length > 0 && (
                                    <span className="ml-2 text-xs font-normal text-red-300">
                                        {topicIds.length} selected
                                    </span>
                                )}
                            </legend>
                            <div
                                className={`rounded-md border bg-neutral-950 max-h-44 overflow-y-auto ${
                                    show("topics")
                                        ? "border-red-500/70"
                                        : "border-neutral-700"
                                } ${!chapterId ? "opacity-50" : ""}`}
                            >
                                {!chapterId ? (
                                    <p className="px-3 py-3 text-xs text-neutral-500">
                                        Select a chapter to see its topics.
                                    </p>
                                ) : topics.loading ? (
                                    <p className="px-3 py-3 text-xs text-neutral-400">
                                        Loading topics…
                                    </p>
                                ) : topics.data.length === 0 ? (
                                    <p className="px-3 py-3 text-xs text-neutral-500">
                                        No topics found for this chapter.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-neutral-800">
                                        {topics.data.map((t) => (
                                            <li key={t.topicId}>
                                                <label className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-900 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={topicIds.includes(
                                                            t.topicId,
                                                        )}
                                                        onChange={() =>
                                                            toggleTopic(
                                                                t.topicId,
                                                            )
                                                        }
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
                                <p
                                    id="topics-error"
                                    className="mt-1.5 text-xs text-red-400"
                                >
                                    {errors.topics}
                                </p>
                            )}
                        </fieldset>
                    </div>

                    {/* Question text */}
                    <Field
                        label="Question text"
                        htmlFor="text"
                        error={show("text")}
                    >
                        <textarea
                            id="text"
                            rows={4}
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value);
                                clearNotice();
                            }}
                            placeholder="Type the full question here…"
                            aria-invalid={!!show("text") || undefined}
                            aria-describedby={
                                show("text") ? "text-error" : undefined
                            }
                            className={`${inputClass(!!show("text"))} resize-y`}
                        />
                    </Field>

                    {/* Image Attachments */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-neutral-200">
                                Attach Images (Cloudinary)
                            </label>
                            <span className="text-xs text-neutral-400">
                                JPG, PNG, WEBP, GIF (Max 5MB each)
                            </span>
                        </div>

                        {/* File selector button */}
                        <div className="flex items-center gap-3 mb-4">
                            <label
                                htmlFor={manualFileInputId}
                                className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
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
                                    className="text-red-400"
                                >
                                    <rect
                                        width="18"
                                        height="18"
                                        x="3"
                                        y="3"
                                        rx="2"
                                        ry="2"
                                    />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                </svg>
                                Choose Images
                            </label>
                            <input
                                id={manualFileInputId}
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={(e) => {
                                    handleAddManualImages(e.target.files);
                                    e.target.value = "";
                                }}
                                className="hidden"
                            />
                            {manualImages.length > 0 && (
                                <span className="text-xs text-neutral-400">
                                    {manualImages.length} image(s) ready to upload
                                </span>
                            )}
                        </div>

                        {/* Image Previews */}
                        {manualImages.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                                {manualImages.map((img, idx) => (
                                    <div
                                        key={img.id}
                                        className="relative group rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900"
                                    >
                                        <img
                                            src={img.previewUrl}
                                            alt={`Preview ${idx + 1}`}
                                            className="w-full h-28 object-cover"
                                        />
                                        <div className="p-2 text-xs">
                                            <p
                                                className="truncate text-neutral-300 font-medium"
                                                title={img.file.name}
                                            >
                                                {img.file.name}
                                            </p>
                                            <p className="text-[10px] text-neutral-500">
                                                {(
                                                    img.file.size / 1024
                                                ).toFixed(0)}{" "}
                                                KB · Order #{idx + 1}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveManualImage(img.id)
                                            }
                                            className="absolute top-1.5 right-1.5 p-1 rounded bg-red-600/90 text-white hover:bg-red-500 transition-colors shadow"
                                            title="Remove image"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="12"
                                                height="12"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M18 6 6 18" />
                                                <path d="m6 6 12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={saving}
                            className="px-4 py-2 rounded-md text-sm font-medium text-neutral-300 border border-neutral-700 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-60 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving…
                                </>
                            ) : (
                                "Save Question"
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* TAB 2: JSON IMPORT */}
            {mode === "json" && (
                <div className="space-y-6">
                    {/* JSON Input Card */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden space-y-4">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/80"></div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h4 className="text-base font-semibold text-neutral-100">
                                    Paste or Upload JSON
                                </h4>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                    Format:{" "}
                                    <code className="text-red-400">
                                        [&#123; "questionText": "...", "chapter":
                                        "...", "topics": ["..."] &#125;]
                                    </code>
                                </p>
                            </div>
                            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors">
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
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" x2="12" y1="3" y2="15" />
                                </svg>
                                Upload JSON File
                                <input
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={handleJsonFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        <textarea
                            rows={6}
                            value={jsonRaw}
                            onChange={(e) => setJsonRaw(e.target.value)}
                            placeholder='[&#10;  {&#10;    "questionText": "Explain the working of binary search.",&#10;    "chapter": "Searching Algorithms",&#10;    "topics": ["Binary Search"]&#10;  }&#10;]'
                            className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-xs font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-y"
                        />

                        {jsonParseError && (
                            <p className="text-xs text-red-400">
                                {jsonParseError}
                            </p>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleParseJson}
                                disabled={saving}
                                className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors"
                            >
                                Parse & Preview Questions
                            </button>
                        </div>
                    </div>

                    {/* Parsed Questions Preview Cards */}
                    {jsonItems.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-base font-semibold text-neutral-200">
                                    Preview & Image Attachment (
                                    {jsonItems.length})
                                </h4>
                                <button
                                    type="button"
                                    onClick={handleRunBatchImport}
                                    disabled={saving}
                                    className="px-5 py-2 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {saving ? "Importing…" : "Import All Questions"}
                                </button>
                            </div>

                            {jsonItems.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className={`bg-neutral-900 border rounded-xl p-5 relative space-y-4 transition-colors ${
                                        item.status === "success"
                                            ? "border-emerald-500/50 bg-emerald-950/10"
                                            : item.status === "error"
                                              ? "border-red-500/60 bg-red-950/10"
                                              : "border-neutral-800"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-red-900/40 text-red-400 text-xs font-bold flex items-center justify-center border border-red-500/30">
                                                {idx + 1}
                                            </span>
                                            {item.rawChapterName && (
                                                <span className="px-2 py-0.5 rounded text-[11px] bg-neutral-800 text-neutral-300 font-medium">
                                                    Chapter:{" "}
                                                    {item.rawChapterName}
                                                </span>
                                            )}
                                            {item.rawTopicNames?.map(
                                                (tName, tIdx) => (
                                                    <span
                                                        key={tIdx}
                                                        className="px-2 py-0.5 rounded text-[11px] bg-red-950/40 border border-red-500/30 text-red-300"
                                                    >
                                                        {tName}
                                                    </span>
                                                ),
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveJsonItem(item.id)
                                            }
                                            className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                                            title="Exclude question"
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
                                                <path d="M18 6 6 18" />
                                                <path d="m6 6 12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Question Text */}
                                    <p className="text-sm text-neutral-200 font-medium leading-relaxed">
                                        {item.questionText}
                                    </p>

                                    {/* Image Attachment per JSON question */}
                                    <div className="pt-3 border-t border-neutral-800/80">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-neutral-400">
                                                Question Images (
                                                {item.images.length})
                                            </span>
                                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="text-red-400"
                                                >
                                                    <path d="M5 12h14" />
                                                    <path d="M12 5v14" />
                                                </svg>
                                                Add Images
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                                    onChange={(e) => {
                                                        handleAddJsonImages(
                                                            item.id,
                                                            e.target.files,
                                                        );
                                                        e.target.value = "";
                                                    }}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>

                                        {item.images.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {item.images.map((img) => (
                                                    <div
                                                        key={img.id}
                                                        className="relative group rounded border border-neutral-700 overflow-hidden w-20 h-20 bg-neutral-950"
                                                    >
                                                        <img
                                                            src={img.previewUrl}
                                                            alt="preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveJsonImage(
                                                                    item.id,
                                                                    img.id,
                                                                )
                                                            }
                                                            className="absolute top-1 right-1 p-0.5 rounded bg-red-600 text-white hover:bg-red-500 shadow"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                width="10"
                                                                height="10"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <path d="M18 6 6 18" />
                                                                <path d="m6 6 12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Indicator */}
                                    {item.status === "success" && (
                                        <p className="text-xs text-emerald-400 font-medium">
                                            Saved successfully (ID #
                                            {item.savedQuesId})
                                        </p>
                                    )}
                                    {item.status === "error" && (
                                        <p className="text-xs text-red-400 font-medium">
                                            Failed: {item.error}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
