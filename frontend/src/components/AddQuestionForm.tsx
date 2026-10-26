import { useEffect, useId, useMemo, useRef, useState } from "react";
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

export interface RawTopicMapping {
    rawName: string;
    resolvedTopicId: number | null;
    resolvedTopicName?: string;
}

export interface ResolvedTopicItem {
    topicId: number;
    topicName: string;
}

export type ItemResolutionStatus = "Matched" | "Needs Review" | "Invalid";

export interface JsonImportItem {
    id: string;
    index: number;
    questionText: string;
    rawChapterName: string;
    rawTopics: RawTopicMapping[];
    resolvedChapterId: number | null;
    resolvedTopics: ResolvedTopicItem[];
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

async function uploadToCloudinaryWithRetry(
    file: File,
    onProgress?: (text: string) => void,
    maxRetries = 2,
): Promise<string> {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        throw new Error(
            `"${file.name}" has an unsupported format (${file.type || "unknown"}). Allowed: JPG, PNG, WEBP, GIF.`,
        );
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(
            `"${file.name}" is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
        );
    }

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            onProgress?.(
                attempt > 1
                    ? `Retrying upload for ${file.name} (attempt ${attempt} of ${maxRetries + 1})…`
                    : `Requesting signed upload for ${file.name}…`,
            );

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
                        `Cloudinary upload error (${response.status} ${response.statusText}).`,
                );
            }

            const json = (await response.json()) as { secure_url?: string };
            if (!json.secure_url) {
                throw new Error(
                    `Upload completed, but no secure HTTPS URL returned for "${file.name}".`,
                );
            }

            return json.secure_url;
        } catch (err) {
            lastError = err;
            if (attempt <= maxRetries) {
                await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * attempt),
                );
            }
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error(`Failed to upload ${file.name}`);
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

export function computeItemStatus(item: JsonImportItem): ItemResolutionStatus {
    if (!item.questionText.trim()) return "Invalid";
    if (!item.resolvedChapterId) return "Needs Review";
    if (item.resolvedTopics.length === 0) return "Needs Review";

    // If any raw topic from the JSON has not been resolved
    const hasUnresolvedRawTopic = item.rawTopics.some(
        (rt) => rt.resolvedTopicId === null,
    );
    if (hasUnresolvedRawTopic) return "Needs Review";

    return "Matched";
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
    const [previewFilter, setPreviewFilter] = useState<
        "ALL" | "NEEDS_REVIEW" | "MATCHED" | "INVALID"
    >("ALL");

    // Cache of topics grouped by chapterId
    const [chapterTopicsCache, setChapterTopicsCache] = useState<
        Record<number, TopicOption[]>
    >({});

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

    // Fetch and cache topics for a specific chapter
    const loadTopicsForChapter = async (
        cId: number,
    ): Promise<TopicOption[]> => {
        if (!cId) return [];
        if (chapterTopicsCache[cId]) return chapterTopicsCache[cId];
        try {
            const list = await fetchApi<TopicOption[]>(
                `/api/topics?chapterId=${cId}`,
            );
            setChapterTopicsCache((prev) => ({ ...prev, [cId]: list }));
            return list;
        } catch {
            return [];
        }
    };

    useEffect(() => {
        if (chapterId) {
            loadTopicsForChapter(Number(chapterId));
        }
    }, [chapterId]);

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
        // Clear cached JSON items when subject changes to avoid mismatched chapters
        setJsonItems([]);
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

    // Manual images management & reordering
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

    const handleMoveManualImage = (index: number, direction: -1 | 1) => {
        setManualImages((prev) => {
            const targetIdx = index + direction;
            if (targetIdx < 0 || targetIdx >= prev.length) return prev;
            const updated = [...prev];
            const temp = updated[index];
            updated[index] = updated[targetIdx];
            updated[targetIdx] = temp;
            return updated;
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
            const uploadedUrls: string[] = [];
            for (let i = 0; i < manualImages.length; i++) {
                const img = manualImages[i];
                setProgressStatus(
                    `Uploading image ${i + 1} of ${manualImages.length}…`,
                );
                const url = await uploadToCloudinaryWithRetry(
                    img.file,
                    (txt) => setProgressStatus(txt),
                );
                uploadedUrls.push(url);
            }

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

    // Strict Automatic Matching Engine
    const handleParseJson = async () => {
        setJsonParseError(null);
        setNotice(null);

        if (!subject) {
            setJsonParseError(
                "Please select a Department and Subject first so chapters and topics can be matched.",
            );
            return;
        }

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

            const items: JsonImportItem[] = [];

            for (let idx = 0; idx < parsed.length; idx++) {
                const item = parsed[idx];
                const qText = String(item.questionText ?? "").trim();
                const rawCh = String(item.chapter ?? "").trim();
                const rawTopicsList: string[] = Array.isArray(item.topics)
                    ? item.topics
                          .map((t: unknown) => String(t).trim())
                          .filter(Boolean)
                    : [];

                // 1. Strict Chapter Matching (exact case-insensitive, trimmed)
                let resolvedChapterId: number | null = null;
                if (rawCh) {
                    const normRaw = rawCh.toLowerCase();
                    const exactMatches = sortedChapters.filter(
                        (c) => c.chapterName.trim().toLowerCase() === normRaw,
                    );
                    // Do not guess if ambiguous or unmatched
                    if (exactMatches.length === 1) {
                        resolvedChapterId = exactMatches[0].chapterId;
                    }
                }

                // 2. Strict Topic Matching (only if chapter uniquely resolved)
                const rawTopicMappings: RawTopicMapping[] = [];
                const resolvedTopics: ResolvedTopicItem[] = [];

                let availableTopics: TopicOption[] = [];
                if (resolvedChapterId) {
                    availableTopics =
                        await loadTopicsForChapter(resolvedChapterId);
                }

                for (const rawTName of rawTopicsList) {
                    const normT = rawTName.toLowerCase();
                    const matchedTopics = availableTopics.filter(
                        (t) => t.topicName.trim().toLowerCase() === normT,
                    );

                    if (matchedTopics.length === 1) {
                        const top = matchedTopics[0];
                        rawTopicMappings.push({
                            rawName: rawTName,
                            resolvedTopicId: top.topicId,
                            resolvedTopicName: top.topicName,
                        });
                        if (
                            !resolvedTopics.some((r) => r.topicId === top.topicId)
                        ) {
                            resolvedTopics.push({
                                topicId: top.topicId,
                                topicName: top.topicName,
                            });
                        }
                    } else {
                        // Unmatched or ambiguous
                        rawTopicMappings.push({
                            rawName: rawTName,
                            resolvedTopicId: null,
                        });
                    }
                }

                items.push({
                    id: `json-q-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    index: idx + 1,
                    questionText: qText,
                    rawChapterName: rawCh,
                    rawTopics: rawTopicMappings,
                    resolvedChapterId,
                    resolvedTopics,
                    images: [],
                    status: "idle",
                });
            }

            if (items.length === 0) {
                throw new Error("No questions found in the JSON.");
            }

            setJsonItems(items);

            const needsReviewCount = items.filter(
                (it) => computeItemStatus(it) === "Needs Review",
            ).length;

            setNotice({
                kind: needsReviewCount > 0 ? "error" : "success",
                message:
                    needsReviewCount > 0
                        ? `Parsed ${items.length} question(s). ${needsReviewCount} question(s) need manual review before importing.`
                        : `Parsed ${items.length} question(s). All chapters and topics matched successfully!`,
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

    // Manual Chapter Resolution
    const handleResolveChapter = async (
        itemId: string,
        newChapterId: number | null,
    ) => {
        let newTopics: TopicOption[] = [];
        if (newChapterId) {
            newTopics = await loadTopicsForChapter(newChapterId);
        }

        setJsonItems((prev) =>
            prev.map((item) => {
                if (item.id !== itemId) return item;

                // When chapter changes, revalidate all raw topics against new chapter
                const nextRawMappings: RawTopicMapping[] = [];
                const nextResolvedTopics: ResolvedTopicItem[] = [];

                for (const rt of item.rawTopics) {
                    const matched = newTopics.filter(
                        (t) =>
                            t.topicName.trim().toLowerCase() ===
                            rt.rawName.toLowerCase(),
                    );
                    if (matched.length === 1) {
                        const top = matched[0];
                        nextRawMappings.push({
                            rawName: rt.rawName,
                            resolvedTopicId: top.topicId,
                            resolvedTopicName: top.topicName,
                        });
                        if (
                            !nextResolvedTopics.some(
                                (r) => r.topicId === top.topicId,
                            )
                        ) {
                            nextResolvedTopics.push({
                                topicId: top.topicId,
                                topicName: top.topicName,
                            });
                        }
                    } else {
                        nextRawMappings.push({
                            rawName: rt.rawName,
                            resolvedTopicId: null,
                        });
                    }
                }

                return {
                    ...item,
                    resolvedChapterId: newChapterId,
                    rawTopics: nextRawMappings,
                    resolvedTopics: nextResolvedTopics,
                };
            }),
        );
    };

    // Manual Topic Resolution for an Unmatched Raw Topic
    const handleResolveRawTopic = (
        itemId: string,
        rawTopicName: string,
        option: ComboOption | null,
    ) => {
        setJsonItems((prev) =>
            prev.map((item) => {
                if (item.id !== itemId) return item;

                const nextRaw = item.rawTopics.map((rt) => {
                    if (rt.rawName !== rawTopicName) return rt;
                    return {
                        ...rt,
                        resolvedTopicId: option ? option.id : null,
                        resolvedTopicName: option ? option.label : undefined,
                    };
                });

                // Rebuild unique resolved topics list
                const resolvedMap = new Map<number, string>();
                for (const rt of nextRaw) {
                    if (rt.resolvedTopicId && rt.resolvedTopicName) {
                        resolvedMap.set(rt.resolvedTopicId, rt.resolvedTopicName);
                    }
                }
                for (const rt of item.resolvedTopics) {
                    resolvedMap.set(rt.topicId, rt.topicName);
                }
                if (!option) {
                    // If clearing, ensure old resolved is removed if not used elsewhere
                    const stillUsed = nextRaw.some(
                        (r) => r.resolvedTopicId !== null,
                    );
                    if (!stillUsed && nextRaw.length > 0) {
                        resolvedMap.clear();
                    }
                }

                const nextResolved: ResolvedTopicItem[] = Array.from(
                    resolvedMap.entries(),
                ).map(([topicId, topicName]) => ({ topicId, topicName }));

                return {
                    ...item,
                    rawTopics: nextRaw,
                    resolvedTopics: nextResolved,
                };
            }),
        );
    };

    // Remove a resolved topic
    const handleRemoveResolvedTopic = (itemId: string, topicId: number) => {
        setJsonItems((prev) =>
            prev.map((item) => {
                if (item.id !== itemId) return item;

                const nextRaw = item.rawTopics.map((rt) => {
                    if (rt.resolvedTopicId === topicId) {
                        return {
                            ...rt,
                            resolvedTopicId: null,
                            resolvedTopicName: undefined,
                        };
                    }
                    return rt;
                });

                return {
                    ...item,
                    rawTopics: nextRaw,
                    resolvedTopics: item.resolvedTopics.filter(
                        (t) => t.topicId !== topicId,
                    ),
                };
            }),
        );
    };

    // Add extra topic from current chapter
    const handleAddExtraTopic = (
        itemId: string,
        option: ComboOption | null,
    ) => {
        if (!option) return;
        setJsonItems((prev) =>
            prev.map((item) => {
                if (item.id !== itemId) return item;
                if (item.resolvedTopics.some((t) => t.topicId === option.id)) {
                    return item;
                }
                return {
                    ...item,
                    resolvedTopics: [
                        ...item.resolvedTopics,
                        { topicId: option.id, topicName: option.label },
                    ],
                };
            }),
        );
    };

    // Image attachments & reordering for JSON preview
    const handleAddJsonImages = (itemId: string, files: FileList | null) => {
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

    const handleMoveJsonImage = (
        itemId: string,
        index: number,
        direction: -1 | 1,
    ) => {
        setJsonItems((prev) =>
            prev.map((item) => {
                if (item.id !== itemId) return item;
                const targetIdx = index + direction;
                if (targetIdx < 0 || targetIdx >= item.images.length)
                    return item;
                const updated = [...item.images];
                const temp = updated[index];
                updated[index] = updated[targetIdx];
                updated[targetIdx] = temp;
                return { ...item, images: updated };
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

    // Filtered items in JSON preview
    const filteredJsonItems = useMemo(() => {
        if (previewFilter === "ALL") return jsonItems;
        return jsonItems.filter((item) => {
            const st = computeItemStatus(item);
            if (previewFilter === "NEEDS_REVIEW") return st === "Needs Review";
            if (previewFilter === "MATCHED") return st === "Matched";
            if (previewFilter === "INVALID") return st === "Invalid";
            return true;
        });
    }, [jsonItems, previewFilter]);

    const statusCounts = useMemo(() => {
        let matched = 0;
        let needsReview = 0;
        let invalid = 0;
        for (const item of jsonItems) {
            const st = computeItemStatus(item);
            if (st === "Matched") matched++;
            else if (st === "Needs Review") needsReview++;
            else if (st === "Invalid") invalid++;
        }
        return { matched, needsReview, invalid, total: jsonItems.length };
    }, [jsonItems]);

    const canRunBatchImport = useMemo(() => {
        if (jsonItems.length === 0 || saving) return false;
        return jsonItems.every((it) => computeItemStatus(it) === "Matched");
    }, [jsonItems, saving]);

    // JSON Batch Import Runner
    const handleRunBatchImport = async () => {
        if (!department || !subject || !type || !sourceId) {
            setNotice({
                kind: "error",
                message:
                    "Please select Department, Subject, Question Type, and Source above before importing.",
            });
            return;
        }

        if (!canRunBatchImport) {
            setNotice({
                kind: "error",
                message:
                    "Please resolve all questions before importing. Every record must have a resolved chapter and at least one topic.",
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
            if (item.status === "success") continue;

            setJsonImportProgress(
                `Processing question ${i + 1} of ${jsonItems.length}: "${item.questionText.slice(0, 30)}…"`,
            );

            setJsonItems((prev) =>
                prev.map((it) =>
                    it.id === item.id ? { ...it, status: "uploading" } : it,
                ),
            );

            try {
                if (!item.questionText.trim()) {
                    throw new Error("Question text is empty.");
                }
                if (!item.resolvedChapterId) {
                    throw new Error("No chapter resolved for this question.");
                }
                if (item.resolvedTopics.length === 0) {
                    throw new Error("No topics resolved for this question.");
                }

                // 1. Upload attached images to Cloudinary (if any)
                const uploadedUrls: string[] = [];
                for (let j = 0; j < item.images.length; j++) {
                    const img = item.images[j];
                    setJsonImportProgress(
                        `Question ${i + 1}/${jsonItems.length}: Uploading image ${j + 1}/${item.images.length}…`,
                    );
                    const url = await uploadToCloudinaryWithRetry(
                        img.file,
                        (txt) => setJsonImportProgress(txt),
                    );
                    uploadedUrls.push(url);
                }

                // 2. Save question record with actual database IDs
                setJsonImportProgress(
                    `Question ${i + 1}/${jsonItems.length}: Saving question record…`,
                );
                const topicIds = Array.from(
                    new Set(item.resolvedTopics.map((t) => t.topicId)),
                );

                const created = await fetchApi<CreatedQuestion>(
                    "/api/questions",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            quesText: item.questionText.trim(),
                            quesType: type,
                            sourceId: Number(sourceId),
                            topicIds,
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
                failedItems.push(`Question #${item.index}: ${errMsg}`);
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
                        strict schema resolution.
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

            {/* Progress status */}
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

                        {/* Image Previews with Reordering */}
                        {manualImages.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                                {manualImages.map((img, idx) => (
                                    <div
                                        key={img.id}
                                        className="relative group rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900 flex flex-col justify-between"
                                    >
                                        <div className="relative">
                                            <img
                                                src={img.previewUrl}
                                                alt={`Preview ${idx + 1}`}
                                                className="w-full h-28 object-cover"
                                            />
                                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] bg-black/70 text-white font-semibold">
                                                #{idx + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRemoveManualImage(
                                                        img.id,
                                                    )
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

                                        <div className="p-2 text-xs flex items-center justify-between border-t border-neutral-800">
                                            <div className="truncate flex-1 mr-2">
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
                                                    KB
                                                </p>
                                            </div>

                                            {/* Reorder Buttons */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleMoveManualImage(
                                                            idx,
                                                            -1,
                                                        )
                                                    }
                                                    disabled={idx === 0}
                                                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-neutral-300"
                                                    title="Move earlier"
                                                >
                                                    ←
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleMoveManualImage(
                                                            idx,
                                                            1,
                                                        )
                                                    }
                                                    disabled={
                                                        idx ===
                                                        manualImages.length - 1
                                                    }
                                                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-neutral-300"
                                                    title="Move later"
                                                >
                                                    →
                                                </button>
                                            </div>
                                        </div>
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
                                Parse & Validate Questions
                            </button>
                        </div>
                    </div>

                    {/* Parsed Questions Preview with Resolution Controls */}
                    {jsonItems.length > 0 && (
                        <div className="space-y-4">
                            {/* Toolbar: Resolution Filter & Import Action */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                                {/* Filter Pills */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter("ALL")}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                                            previewFilter === "ALL"
                                                ? "bg-neutral-200 text-neutral-950"
                                                : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                                        }`}
                                    >
                                        All ({statusCounts.total})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPreviewFilter("NEEDS_REVIEW")
                                        }
                                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                                            previewFilter === "NEEDS_REVIEW"
                                                ? "bg-amber-500 text-neutral-950"
                                                : "bg-neutral-800 text-amber-400 hover:text-amber-300"
                                        }`}
                                    >
                                        Needs Review ({statusCounts.needsReview})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPreviewFilter("MATCHED")
                                        }
                                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                                            previewFilter === "MATCHED"
                                                ? "bg-emerald-500 text-neutral-950"
                                                : "bg-neutral-800 text-emerald-400 hover:text-emerald-300"
                                        }`}
                                    >
                                        Matched ({statusCounts.matched})
                                    </button>
                                    {statusCounts.invalid > 0 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPreviewFilter("INVALID")
                                            }
                                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                                                previewFilter === "INVALID"
                                                    ? "bg-red-500 text-white"
                                                    : "bg-neutral-800 text-red-400 hover:text-red-300"
                                            }`}
                                        >
                                            Invalid ({statusCounts.invalid})
                                        </button>
                                    )}
                                </div>

                                {/* Import All Button */}
                                <div className="flex items-center gap-3">
                                    {!canRunBatchImport && (
                                        <span className="text-xs text-amber-400 font-medium">
                                            {statusCounts.needsReview > 0
                                                ? `Resolve ${statusCounts.needsReview} item(s) before importing`
                                                : "All items must be valid to import"}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleRunBatchImport}
                                        disabled={!canRunBatchImport}
                                        className="px-5 py-2 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Importing…
                                            </>
                                        ) : (
                                            `Import ${statusCounts.matched} Question(s)`
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Item Cards */}
                            {filteredJsonItems.map((item) => {
                                const itemStatus = computeItemStatus(item);
                                const currentChapterTopics = item.resolvedChapterId
                                    ? chapterTopicsCache[
                                          item.resolvedChapterId
                                      ] ?? []
                                    : [];

                                const topicOptions: ComboOption[] =
                                    currentChapterTopics.map((t) => ({
                                        id: t.topicId,
                                        label: t.topicName,
                                    }));

                                return (
                                    <div
                                        key={item.id}
                                        className={`bg-neutral-900 border rounded-xl p-5 relative space-y-4 transition-colors ${
                                            itemStatus === "Matched"
                                                ? "border-emerald-500/40 bg-emerald-950/5"
                                                : itemStatus === "Needs Review"
                                                  ? "border-amber-500/50 bg-amber-950/5"
                                                  : "border-red-500/60 bg-red-950/10"
                                        }`}
                                    >
                                        {/* Card Header: Index, Status Badge, Raw Values, Exclude */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-300 text-xs font-bold flex items-center justify-center border border-neutral-700">
                                                    #{item.index}
                                                </span>

                                                {/* Status Badge */}
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                                        itemStatus === "Matched"
                                                            ? "bg-emerald-900/40 text-emerald-300 border border-emerald-500/40"
                                                            : itemStatus ===
                                                                "Needs Review"
                                                              ? "bg-amber-900/40 text-amber-300 border border-amber-500/40"
                                                              : "bg-red-900/40 text-red-300 border border-red-500/40"
                                                    }`}
                                                >
                                                    {itemStatus}
                                                </span>

                                                {item.rawChapterName && (
                                                    <span className="px-2 py-0.5 rounded text-[11px] bg-neutral-800 text-neutral-400 font-mono">
                                                        JSON Ch: "{item.rawChapterName}"
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRemoveJsonItem(item.id)
                                                }
                                                className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                                                title="Exclude from import"
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
                                            {item.questionText || (
                                                <span className="text-red-400 italic">
                                                    (Empty question text)
                                                </span>
                                            )}
                                        </p>

                                        {/* Resolution Controls Section */}
                                        <div className="pt-3 border-t border-neutral-800/80 bg-neutral-950/50 p-3.5 rounded-lg space-y-4">
                                            {/* Chapter Resolution */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
                                                        <span>Resolved Chapter:</span>
                                                        {item.resolvedChapterId ? (
                                                            <span className="text-emerald-400 font-normal">
                                                                ✓ Resolved
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-400 font-normal">
                                                                ⚠ Needs Selection
                                                            </span>
                                                        )}
                                                    </label>
                                                    {item.rawChapterName &&
                                                        !item.resolvedChapterId && (
                                                            <span className="text-[11px] text-amber-300/90 italic">
                                                                No exact match found for "{item.rawChapterName}"
                                                            </span>
                                                        )}
                                                </div>

                                                <select
                                                    value={
                                                        item.resolvedChapterId ??
                                                        ""
                                                    }
                                                    onChange={(e) =>
                                                        handleResolveChapter(
                                                            item.id,
                                                            e.target.value
                                                                ? Number(
                                                                      e.target
                                                                          .value,
                                                                  )
                                                                : null,
                                                        )
                                                    }
                                                    className={`w-full rounded bg-neutral-900 border px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-red-500 ${
                                                        !item.resolvedChapterId
                                                            ? "border-amber-500/60"
                                                            : "border-neutral-700"
                                                    }`}
                                                >
                                                    <option value="">
                                                        -- Select Chapter --
                                                    </option>
                                                    {sortedChapters.map((c) => (
                                                        <option
                                                            key={c.chapterId}
                                                            value={c.chapterId}
                                                        >
                                                            {c.chapterNo}.{" "}
                                                            {c.chapterName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Topics Resolution */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
                                                        <span>Topic Mappings:</span>
                                                        {item.resolvedTopics
                                                            .length > 0 ? (
                                                            <span className="text-emerald-400 font-normal">
                                                                {item.resolvedTopics.length} mapped
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-400 font-normal">
                                                                At least 1 topic required
                                                            </span>
                                                        )}
                                                    </label>
                                                </div>

                                                {!item.resolvedChapterId ? (
                                                    <p className="text-xs text-neutral-500 py-1">
                                                        Select a chapter above to resolve topic mappings.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-2.5">
                                                        {/* Unresolved Raw Topics from JSON */}
                                                        {item.rawTopics.map(
                                                            (rt, rtIdx) => (
                                                                <div
                                                                    key={rtIdx}
                                                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded border text-xs ${
                                                                        rt.resolvedTopicId
                                                                            ? "bg-neutral-900/60 border-neutral-800"
                                                                            : "bg-amber-950/20 border-amber-500/40"
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 flex-1 truncate">
                                                                        <span className="text-neutral-400 font-mono truncate">
                                                                            "{rt.rawName}"
                                                                        </span>
                                                                        <span className="text-neutral-500">
                                                                            →
                                                                        </span>
                                                                        <span
                                                                            className={
                                                                                rt.resolvedTopicId
                                                                                    ? "text-emerald-400 font-medium"
                                                                                    : "text-amber-400 font-medium"
                                                                            }
                                                                        >
                                                                            {rt.resolvedTopicName ??
                                                                                "Unresolved (Select from chapter)"}
                                                                        </span>
                                                                    </div>

                                                                    {/* Searchable dropdown to map this specific raw topic */}
                                                                    <div className="w-full sm:w-64">
                                                                        <SearchableSelect
                                                                            id={`select-raw-${item.id}-${rtIdx}`}
                                                                            options={
                                                                                topicOptions
                                                                            }
                                                                            value={
                                                                                rt.resolvedTopicId
                                                                                    ? {
                                                                                          id: rt.resolvedTopicId,
                                                                                          label:
                                                                                              rt.resolvedTopicName ??
                                                                                              "",
                                                                                      }
                                                                                    : null
                                                                            }
                                                                            onChange={(
                                                                                opt,
                                                                            ) =>
                                                                                handleResolveRawTopic(
                                                                                    item.id,
                                                                                    rt.rawName,
                                                                                    opt,
                                                                                )
                                                                            }
                                                                            placeholder="Map to topic…"
                                                                            noun="topics"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )}

                                                        {/* All currently resolved topic badges with removal option */}
                                                        {item.resolvedTopics
                                                            .length > 0 && (
                                                            <div className="pt-2">
                                                                <span className="text-[11px] text-neutral-400 block mb-1">
                                                                    Resolved Topics:
                                                                </span>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {item.resolvedTopics.map(
                                                                        (t) => (
                                                                            <span
                                                                                key={
                                                                                    t.topicId
                                                                                }
                                                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-red-950/40 border border-red-500/30 text-red-300"
                                                                            >
                                                                                {
                                                                                    t.topicName
                                                                                }
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        handleRemoveResolvedTopic(
                                                                                            item.id,
                                                                                            t.topicId,
                                                                                        )
                                                                                    }
                                                                                    className="text-red-400 hover:text-red-200"
                                                                                    title="Remove topic"
                                                                                >
                                                                                    ✕
                                                                                </button>
                                                                            </span>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Option to add extra topic from the resolved chapter */}
                                                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                                                            <span className="text-xs text-neutral-400 whitespace-nowrap">
                                                                Add additional topic:
                                                            </span>
                                                            <div className="w-full sm:w-64">
                                                                <SearchableSelect
                                                                    id={`add-extra-${item.id}`}
                                                                    options={topicOptions.filter(
                                                                        (
                                                                            opt,
                                                                        ) =>
                                                                            !item.resolvedTopics.some(
                                                                                (
                                                                                    r,
                                                                                ) =>
                                                                                    r.topicId ===
                                                                                    opt.id,
                                                                            ),
                                                                    )}
                                                                    value={null}
                                                                    onChange={(
                                                                        opt,
                                                                    ) =>
                                                                        handleAddExtraTopic(
                                                                            item.id,
                                                                            opt,
                                                                        )
                                                                    }
                                                                    placeholder="+ Add another topic…"
                                                                    noun="topics"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Image Attachments per Question Card */}
                                        <div className="pt-2 border-t border-neutral-800/80">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-neutral-400">
                                                    Attached Images (
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
                                                    {item.images.map(
                                                        (img, imgIdx) => (
                                                            <div
                                                                key={img.id}
                                                                className="relative group rounded border border-neutral-700 overflow-hidden w-24 h-24 bg-neutral-950 flex flex-col justify-between"
                                                            >
                                                                <img
                                                                    src={
                                                                        img.previewUrl
                                                                    }
                                                                    alt="preview"
                                                                    className="w-full h-16 object-cover"
                                                                />
                                                                <div className="flex items-center justify-between px-1 py-0.5 bg-neutral-900 border-t border-neutral-800 text-[10px]">
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleMoveJsonImage(
                                                                                    item.id,
                                                                                    imgIdx,
                                                                                    -1,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                imgIdx ===
                                                                                0
                                                                            }
                                                                            className="px-1 text-neutral-400 hover:text-white disabled:opacity-20"
                                                                        >
                                                                            ←
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleMoveJsonImage(
                                                                                    item.id,
                                                                                    imgIdx,
                                                                                    1,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                imgIdx ===
                                                                                item
                                                                                    .images
                                                                                    .length -
                                                                                    1
                                                                            }
                                                                            className="px-1 text-neutral-400 hover:text-white disabled:opacity-20"
                                                                        >
                                                                            →
                                                                        </button>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleRemoveJsonImage(
                                                                                item.id,
                                                                                img.id,
                                                                            )
                                                                        }
                                                                        className="p-0.5 text-red-400 hover:text-red-300"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Feedback */}
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
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
