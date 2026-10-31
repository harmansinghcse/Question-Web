/**
 * Prompt Studio Screen for Question Web Mobile App.
 *
 * Full in-screen workflow:
 *  1. Browse & search questions directly from database with filters.
 *  2. Select & manage questions in shared state (no navigation away).
 *  3. Configure task, answer style, and optional custom instructions.
 *  4. Deterministically generate, edit, copy, and share AI prompts.
 *
 * ZERO AI API calls or external token costs.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppShell from "../components/AppShell";
import { useAppTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";
import {
    api,
    QUESTION_TYPES,
    type Question,
    type QuestionPage,
    type QuestionType,
    type Subject,
} from "../services/api";
import { useApiData } from "../hooks/use-api-data";
import {
    parseStudentEmail,
    sortSubjects,
    subjectDisplayName,
} from "../constants/subjects";
import type { AppTheme } from "../constants/theme";

const PAGE_SIZE = 10;

type PromptTask = "SOLVE" | "EXPLAIN" | "EXAM_READY" | "ANALYZE" | "REVISION_GUIDE";
type AnswerStyle = "CONCISE" | "DETAILED" | "EXAM_READY";
type StudioTab = "browser" | "selected" | "prompt";

const TASKS: {
    id: PromptTask;
    label: string;
    desc: string;
    icon: keyof typeof Ionicons.glyphMap;
    instruction: string;
}[] = [
    {
        id: "SOLVE",
        label: "Solve Questions",
        desc: "Step-by-step solutions, derivations, and definitive answers",
        icon: "checkmark-circle-outline",
        instruction:
            "Solve the following questions with clear, step-by-step reasoning. Show necessary steps, derivations, and code where applicable. Conclude with definitive final answers.",
    },
    {
        id: "EXPLAIN",
        label: "Explain Concepts",
        desc: "Break down underlying theory, algorithms, and core principles",
        icon: "bulb-outline",
        instruction:
            "Explain the foundational computer science concepts, theorems, algorithms, and definitions tested by each of the following questions. Provide intuitive analogies, key terminology, and real-world relevance.",
    },
    {
        id: "EXAM_READY",
        label: "Exam-Ready Answers",
        desc: "High-scoring model answers formatted for university exams",
        icon: "document-text-outline",
        instruction:
            "Provide model, exam-ready answers formatted to score maximum marks according to academic standards. Structure answers with point-by-point presentation, highlighted keywords, definitions, necessary diagrams/tables, and clear subheadings.",
    },
    {
        id: "ANALYZE",
        label: "Analyze Questions",
        desc: "Evaluate difficulty, prerequisites, and common student pitfalls",
        icon: "analytics-outline",
        instruction:
            "Conduct a detailed academic analysis of each question. Identify its cognitive level (Bloom's taxonomy), estimated difficulty, prerequisite topics, core competencies being evaluated, and common examination mistakes students make.",
    },
    {
        id: "REVISION_GUIDE",
        label: "Revision Guide",
        desc: "Quick-review cheat-sheet, summary formulas, and high-yield notes",
        icon: "bookmarks-outline",
        instruction:
            "Create a structured revision guide and quick-review summary based on the concepts tested across the following questions. Group related concepts, extract essential formulas, and provide high-yield review bullets for rapid exam preparation.",
    },
];

const STYLES: { id: AnswerStyle; label: string; desc: string; directive: string }[] = [
    {
        id: "CONCISE",
        label: "Concise",
        desc: "Direct bullet points with minimal preamble",
        directive:
            "Answer style: Concise. Keep explanations brief, tight, and directly addressed to the core requirement. Use clear bullet points and avoid filler.",
    },
    {
        id: "DETAILED",
        label: "Detailed",
        desc: "Comprehensive in-depth theory and edge cases",
        directive:
            "Answer style: Detailed. Provide comprehensive, in-depth explanations covering underlying mechanics, background context, edge cases, and practical trade-offs.",
    },
    {
        id: "EXAM_READY",
        label: "Exam-Ready",
        desc: "Marks-oriented layout for university papers",
        directive:
            "Answer style: Exam-ready. Format each answer specifically for university written examinations: clearly state assumptions, list step-by-step points, emphasize key technical terms, and provide clear summaries.",
    },
];

function generatePromptString(
    questions: Question[],
    task: PromptTask,
    style: AnswerStyle,
    customInstruction?: string,
): string {
    if (questions.length === 0) {
        return "No questions selected. Please select questions from the Question Browser tab.";
    }

    const taskObj = TASKS.find((t) => t.id === task) ?? TASKS[0];
    const styleObj = STYLES.find((s) => s.id === style) ?? STYLES[2];

    const sections: string[] = [];
    sections.push(taskObj.instruction);
    sections.push(styleObj.directive);

    if (customInstruction?.trim()) {
        sections.push(`Additional instruction: ${customInstruction.trim()}`);
    }

    sections.push(`Questions (${questions.length}):`);

    const qBlocks = questions.map((q, idx) => {
        const itemNumber = idx + 1;
        const parts: string[] = [];
        parts.push(`${itemNumber}. ${q.quesText.trim()}`);

        const meta: string[] = [];
        if (q.quesType) meta.push(`Type: ${q.quesType}`);
        if (q.topics && q.topics.length > 0) {
            meta.push(`Topics: ${q.topics.map((t) => t.topicName).join(", ")}`);
        }
        if (meta.length > 0) {
            parts.push(`   [${meta.join(" | ")}]`);
        }
        return parts.join("\n");
    });

    sections.push(qBlocks.join("\n\n"));
    sections.push(
        "Instructions for completion:\n- Answer each question in order and preserve the numbering.\n- Ensure technical accuracy, rigorous terminology, and clear organization.",
    );

    return sections.join("\n\n");
}

export default function PromptStudioScreen() {
    const { theme } = useAppTheme();
    const { user } = useAuth();
    const styles = useMemo(() => makeStyles(theme), [theme]);

    // Active workspace tab
    const [tab, setTab] = useState<StudioTab>("browser");

    // 1. Shared Question Selection Map (quesId -> Question)
    const [selectedQuestions, setSelectedQuestions] = useState<Map<number, Question>>(
        new Map(),
    );

    // 2. Browser Filters
    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
    const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | null>(null);
    const [selectedQuesType, setSelectedQuesType] = useState<QuestionType | null>(null);
    const [page, setPage] = useState(1);

    // 3. Prompt Configuration
    const [task, setTask] = useState<PromptTask>("SOLVE");
    const [answerStyle, setAnswerStyle] = useState<AnswerStyle>("EXAM_READY");
    const [customInstruction, setCustomInstruction] = useState("");
    const [generatedPrompt, setGeneratedPrompt] = useState("");
    const [copiedNotice, setCopiedNotice] = useState(false);

    // Debounce search
    useEffect(() => {
        const id = setTimeout(() => {
            setDebounced(search.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [search]);

    // Fetch Subjects
    const fetchSubjects = useCallback(() => api.getSubjects(), []);
    const subjectsState = useApiData<Subject[]>(fetchSubjects);

    const studentProfile = useMemo(
        () => (user?.email ? parseStudentEmail(user.email) : null),
        [user],
    );

    const sortedSubjects = useMemo(() => {
        if (subjectsState.status !== "success") return [];
        return sortSubjects(subjectsState.data);
    }, [subjectsState]);

    const displayedSubjects = useMemo(() => {
        if (selectedSemester === null) return sortedSubjects;
        return sortedSubjects.filter((s) => s.semester === selectedSemester);
    }, [sortedSubjects, selectedSemester]);

    const handleSemesterChange = (sem: number | null) => {
        setSelectedSemester(sem);
        setSelectedSubjectKey(null);
        setPage(1);
    };

    const hasBrowserFilters =
        search.trim().length > 0 ||
        selectedSemester !== null ||
        selectedSubjectKey !== null ||
        selectedQuesType !== null;

    const resetBrowserFilters = () => {
        setSearch("");
        setDebounced("");
        setSelectedSemester(null);
        setSelectedSubjectKey(null);
        setSelectedQuesType(null);
        setPage(1);
    };

    // Fetch Questions
    const fetchQuestions = useCallback(
        () =>
            api.searchQuestions({
                search: debounced || undefined,
                semester: selectedSemester ?? undefined,
                subjectKey: selectedSubjectKey ?? undefined,
                quesType: selectedQuesType ?? undefined,
                page,
                pageSize: PAGE_SIZE,
            }),
        [debounced, selectedSemester, selectedSubjectKey, selectedQuesType, page],
    );
    const questionsState = useApiData<QuestionPage>(fetchQuestions);

    const totalQuestions =
        questionsState.status === "success" ? questionsState.data.total : 0;
    const totalPages = Math.max(1, Math.ceil(totalQuestions / PAGE_SIZE));
    const questionsOnPage =
        questionsState.status === "success" ? questionsState.data.items : [];

    // Automatically update prompt when selected questions or config change
    useEffect(() => {
        const list = Array.from(selectedQuestions.values());
        const p = generatePromptString(list, task, answerStyle, customInstruction);
        const timer = setTimeout(() => setGeneratedPrompt(p), 0);
        return () => clearTimeout(timer);
    }, [selectedQuestions, task, answerStyle, customInstruction]);

    // Toggle single question
    const handleToggleQuestion = (q: Question) => {
        setSelectedQuestions((prev) => {
            const next = new Map(prev);
            if (next.has(q.quesId)) {
                next.delete(q.quesId);
            } else {
                next.set(q.quesId, q);
            }
            return next;
        });
    };

    // Remove single question
    const handleRemoveQuestion = (id: number) => {
        setSelectedQuestions((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    };

    // Select all on page
    const handleSelectAllOnPage = () => {
        setSelectedQuestions((prev) => {
            const next = new Map(prev);
            for (const q of questionsOnPage) {
                next.set(q.quesId, q);
            }
            return next;
        });
    };

    // Deselect all on page
    const handleDeselectOnPage = () => {
        setSelectedQuestions((prev) => {
            const next = new Map(prev);
            for (const q of questionsOnPage) {
                next.delete(q.quesId);
            }
            return next;
        });
    };

    // Clear all with confirmation
    const handleClearAll = () => {
        if (selectedQuestions.size > 2) {
            Alert.alert(
                "Clear Selection",
                `Are you sure you want to remove all ${selectedQuestions.size} selected questions?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Clear All",
                        style: "destructive",
                        onPress: () => setSelectedQuestions(new Map()),
                    },
                ],
            );
        } else {
            setSelectedQuestions(new Map());
        }
    };

    // Copy / Share prompt
    const handleCopyOrShare = async () => {
        if (!generatedPrompt) return;

        // Try web clipboard if available
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(generatedPrompt);
                setCopiedNotice(true);
                setTimeout(() => setCopiedNotice(false), 2500);
                return;
            } catch {
                // fall through to native share
            }
        }

        try {
            await Share.share({
                title: "Question Web AI Prompt",
                message: generatedPrompt,
            });
            setCopiedNotice(true);
            setTimeout(() => setCopiedNotice(false), 2500);
        } catch {
            // Ignored
        }
    };

    const selectedList = Array.from(selectedQuestions.values());
    const areAllOnPageSelected =
        questionsOnPage.length > 0 &&
        questionsOnPage.every((q) => selectedQuestions.has(q.quesId));

    // Stats
    const wordsCount = generatedPrompt.trim()
        ? generatedPrompt.trim().split(/\s+/).length
        : 0;
    const estTokens = Math.ceil(generatedPrompt.length / 4);

    const floatingFooter = (
        <View style={styles.floatingBar}>
            <View style={styles.floatingInfo}>
                <View style={styles.floatingCountBadge}>
                    <Text style={styles.floatingCountText}>{selectedQuestions.size}</Text>
                </View>
                <Text style={styles.floatingLabel}>
                    {selectedQuestions.size === 1 ? "question selected" : "questions selected"}
                </Text>
            </View>

            {tab === "browser" ? (
                <Pressable
                    onPress={() => setTab("selected")}
                    disabled={selectedQuestions.size === 0}
                    style={({ pressed }) => [
                        styles.floatingBtn,
                        selectedQuestions.size === 0 && styles.floatingBtnDisabled,
                        pressed && { opacity: 0.85 },
                    ]}
                >
                    <Text style={styles.floatingBtnText}>
                        Review Selection ({selectedQuestions.size}) →
                    </Text>
                </Pressable>
            ) : tab === "selected" ? (
                <Pressable
                    onPress={() => setTab("prompt")}
                    disabled={selectedQuestions.size === 0}
                    style={({ pressed }) => [
                        styles.floatingBtn,
                        selectedQuestions.size === 0 && styles.floatingBtnDisabled,
                        pressed && { opacity: 0.85 },
                    ]}
                >
                    <Text style={styles.floatingBtnText}>Generate Prompt →</Text>
                </Pressable>
            ) : (
                <Pressable
                    onPress={handleCopyOrShare}
                    style={({ pressed }) => [
                        styles.floatingBtn,
                        copiedNotice && styles.floatingBtnSuccess,
                        pressed && { opacity: 0.85 },
                    ]}
                >
                    <Ionicons
                        name={copiedNotice ? "checkmark-circle" : "copy-outline"}
                        size={15}
                        color="#FFFFFF"
                    />
                    <Text style={styles.floatingBtnText}>
                        {copiedNotice ? "Copied / Shared!" : "Copy / Share Prompt"}
                    </Text>
                </Pressable>
            )}
        </View>
    );

    return (
        <AppShell active="prompt" floatingFooter={floatingFooter}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={styles.headerTitleWrap}>
                            <Text style={styles.eyebrow}>STUDY & PRODUCTIVITY TOOL</Text>
                            <Text style={styles.title}>Prompt Studio</Text>
                        </View>
                        <View style={styles.badgeCount}>
                            <Ionicons name="sparkles" size={13} color={theme.accent} />
                            <Text style={styles.badgeCountText}>
                                {selectedQuestions.size} Selected
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.subtitle}>
                        Select database questions and generate high-yield prompts for Claude, ChatGPT, or DeepSeek.
                    </Text>
                </View>

                {/* In-Screen Tab Switcher */}
                <View style={styles.tabBar}>
                    <Pressable
                        onPress={() => setTab("browser")}
                        style={[styles.tabButton, tab === "browser" && styles.tabButtonActive]}
                    >
                        <Ionicons
                            name="search-outline"
                            size={14}
                            color={tab === "browser" ? "#FFFFFF" : theme.muted}
                        />
                        <Text
                            style={[
                                styles.tabButtonText,
                                tab === "browser" && styles.tabButtonTextActive,
                            ]}
                            numberOfLines={1}
                        >
                            1. Browse ({totalQuestions})
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => setTab("selected")}
                        style={[styles.tabButton, tab === "selected" && styles.tabButtonActive]}
                    >
                        <Ionicons
                            name="list-outline"
                            size={14}
                            color={tab === "selected" ? "#FFFFFF" : theme.muted}
                        />
                        <Text
                            style={[
                                styles.tabButtonText,
                                tab === "selected" && styles.tabButtonTextActive,
                            ]}
                            numberOfLines={1}
                        >
                            2. Selected ({selectedQuestions.size})
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => setTab("prompt")}
                        style={[styles.tabButton, tab === "prompt" && styles.tabButtonActive]}
                    >
                        <Ionicons
                            name="sparkles-outline"
                            size={14}
                            color={tab === "prompt" ? "#FFFFFF" : theme.muted}
                        />
                        <Text
                            style={[
                                styles.tabButtonText,
                                tab === "prompt" && styles.tabButtonTextActive,
                            ]}
                            numberOfLines={1}
                        >
                            3. Export Prompt
                        </Text>
                    </Pressable>
                </View>

                {/* ── TAB 1: QUESTION BROWSER ────────────────────────────────────────── */}
                {tab === "browser" && (
                    <View style={styles.tabContent}>
                        {/* Search Input */}
                        <View style={styles.searchBar}>
                            <Ionicons
                                name="search-outline"
                                size={18}
                                color={theme.muted}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Search questions by keyword, topic, or code..."
                                placeholderTextColor={theme.muted}
                                style={styles.searchInput}
                            />
                            {search ? (
                                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                                    <Ionicons name="close-circle" size={18} color={theme.muted} />
                                </Pressable>
                            ) : null}
                        </View>

                        {/* Semester Filter Pills */}
                        <View style={styles.filterSection}>
                            <View style={styles.filterHeaderRow}>
                                <Text style={styles.filterLabel}>FILTER BY SEMESTER</Text>
                                {hasBrowserFilters && (
                                    <Pressable onPress={resetBrowserFilters} hitSlop={8}>
                                        <Text style={styles.clearFiltersLink}>Clear all filters</Text>
                                    </Pressable>
                                )}
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.pillRow}
                            >
                                {studentProfile?.currentSemester ? (
                                    <Pressable
                                        onPress={() => {
                                            const target =
                                                selectedSemester === studentProfile.currentSemester
                                                    ? null
                                                    : studentProfile.currentSemester;
                                            handleSemesterChange(target);
                                        }}
                                        style={[
                                            styles.pill,
                                            selectedSemester === studentProfile.currentSemester &&
                                                styles.pillActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.pillText,
                                                selectedSemester === studentProfile.currentSemester &&
                                                    styles.pillTextActive,
                                            ]}
                                        >
                                            ★ Sem {studentProfile.currentSemester} (My Sem)
                                        </Text>
                                    </Pressable>
                                ) : null}
                                <Pressable
                                    onPress={() => handleSemesterChange(null)}
                                    style={[
                                        styles.pill,
                                        selectedSemester === null && styles.pillActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.pillText,
                                            selectedSemester === null && styles.pillTextActive,
                                        ]}
                                    >
                                        All Semesters
                                    </Text>
                                </Pressable>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                                    const isSel = selectedSemester === sem;
                                    return (
                                        <Pressable
                                            key={sem}
                                            onPress={() => handleSemesterChange(isSel ? null : sem)}
                                            style={[styles.pill, isSel && styles.pillActive]}
                                        >
                                            <Text
                                                style={[
                                                    styles.pillText,
                                                    isSel && styles.pillTextActive,
                                                ]}
                                            >
                                                Semester {sem}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Subject Filter Pills */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>
                                FILTER BY SUBJECT{" "}
                                {selectedSemester !== null ? `(SEM ${selectedSemester})` : "(ALL)"}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.pillRow}
                            >
                                <Pressable
                                    onPress={() => {
                                        setSelectedSubjectKey(null);
                                        setPage(1);
                                    }}
                                    style={[
                                        styles.pill,
                                        selectedSubjectKey === null && styles.pillActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.pillText,
                                            selectedSubjectKey === null && styles.pillTextActive,
                                        ]}
                                    >
                                        All Subjects
                                    </Text>
                                </Pressable>
                                {displayedSubjects.map((sub) => {
                                    const isSel = selectedSubjectKey === sub.subjectKey;
                                    return (
                                        <Pressable
                                            key={sub.subjectKey}
                                            onPress={() => {
                                                setSelectedSubjectKey(isSel ? null : sub.subjectKey);
                                                setPage(1);
                                            }}
                                            style={[styles.pill, isSel && styles.pillActive]}
                                        >
                                            <Text
                                                style={[
                                                    styles.pillText,
                                                    isSel && styles.pillTextActive,
                                                ]}
                                            >
                                                {subjectDisplayName(sub)}
                                                {selectedSemester === null && sub.semester
                                                    ? ` (S${sub.semester})`
                                                    : ""}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Type Filter Pills */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>QUESTION FORMAT</Text>
                            <View style={styles.typeRow}>
                                <Pressable
                                    onPress={() => {
                                        setSelectedQuesType(null);
                                        setPage(1);
                                    }}
                                    style={[
                                        styles.typePill,
                                        selectedQuesType === null && styles.typePillActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.typePillText,
                                            selectedQuesType === null && styles.typePillTextActive,
                                        ]}
                                    >
                                        All Types
                                    </Text>
                                </Pressable>
                                {QUESTION_TYPES.map((t) => {
                                    const isSel = selectedQuesType === t;
                                    return (
                                        <Pressable
                                            key={t}
                                            onPress={() => {
                                                setSelectedQuesType(isSel ? null : t);
                                                setPage(1);
                                            }}
                                            style={[
                                                styles.typePill,
                                                isSel && styles.typePillActive,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.typePillText,
                                                    isSel && styles.typePillTextActive,
                                                ]}
                                            >
                                                {t}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Page Actions & Selection Toolbar */}
                        <View style={styles.actionBar}>
                            <Text style={styles.actionCount}>
                                Showing <Text style={styles.actionHighlight}>{questionsOnPage.length}</Text> of{" "}
                                <Text style={styles.actionHighlight}>{totalQuestions}</Text> questions
                            </Text>
                            <Pressable
                                onPress={
                                    areAllOnPageSelected
                                        ? handleDeselectOnPage
                                        : handleSelectAllOnPage
                                }
                                style={styles.selectPageBtn}
                            >
                                <Ionicons
                                    name={
                                        areAllOnPageSelected
                                            ? "close-circle-outline"
                                            : "checkbox-outline"
                                    }
                                    size={14}
                                    color={theme.accent}
                                />
                                <Text style={styles.selectPageBtnText}>
                                    {areAllOnPageSelected
                                        ? "Deselect Page"
                                        : "Select All on Page"}
                                </Text>
                            </Pressable>
                        </View>

                        {/* Questions List */}
                        {questionsState.status === "loading" ? (
                            <View style={styles.centerBlock}>
                                <ActivityIndicator size="large" color={theme.accent} />
                                <Text style={styles.mutedText}>
                                    Fetching questions from database...
                                </Text>
                            </View>
                        ) : questionsState.status === "error" ? (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle-outline" size={24} color={theme.danger} />
                                <Text style={styles.errorText}>
                                    {questionsState.message || "Failed to load questions"}
                                </Text>
                                <Pressable
                                    onPress={() => questionsState.refresh()}
                                    style={styles.retryBtn}
                                >
                                    <Text style={styles.retryBtnText}>Retry</Text>
                                </Pressable>
                            </View>
                        ) : questionsOnPage.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons name="search-outline" size={32} color={theme.muted} />
                                <Text style={styles.emptyTitle}>No matching questions found</Text>
                                <Text style={styles.emptyText}>
                                    Try clearing your search keyword or switching subjects.
                                </Text>
                                {hasBrowserFilters && (
                                    <Pressable
                                        onPress={resetBrowserFilters}
                                        style={styles.browseButton}
                                    >
                                        <Text style={styles.browseButtonText}>Reset Filters</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : (
                            <View style={styles.questionsList}>
                                {questionsOnPage.map((q) => {
                                    const isSelected = selectedQuestions.has(q.quesId);
                                    return (
                                        <Pressable
                                            key={q.quesId}
                                            onPress={() => handleToggleQuestion(q)}
                                            style={({ pressed }) => [
                                                styles.questionCard,
                                                isSelected && styles.questionCardSelected,
                                                pressed && { opacity: 0.9 },
                                            ]}
                                        >
                                            <View style={styles.cardHeader}>
                                                <View style={styles.metaRow}>
                                                    <View style={styles.typeBadge}>
                                                        <Text style={styles.typeBadgeText}>
                                                            {q.quesType}
                                                        </Text>
                                                    </View>
                                                    {q.semester ? (
                                                        <View style={styles.semBadge}>
                                                            <Text style={styles.semBadgeText}>
                                                                Sem {q.semester}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                    {isSelected && (
                                                        <View style={styles.selectedBadge}>
                                                            <Ionicons
                                                                name="checkmark"
                                                                size={11}
                                                                color="#FFFFFF"
                                                            />
                                                            <Text style={styles.selectedBadgeText}>
                                                                Selected
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <View
                                                    style={[
                                                        styles.checkbox,
                                                        isSelected && styles.checkboxActive,
                                                    ]}
                                                >
                                                    {isSelected && (
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={14}
                                                            color="#FFFFFF"
                                                        />
                                                    )}
                                                </View>
                                            </View>

                                            <Text style={styles.questionText} numberOfLines={4}>
                                                {q.quesText}
                                            </Text>

                                            {q.topics && q.topics.length > 0 && (
                                                <View style={styles.topicRow}>
                                                    {q.topics.slice(0, 3).map((t) => (
                                                        <View key={t.topicId} style={styles.topicTag}>
                                                            <Text style={styles.topicTagText}>
                                                                #{t.topicName}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <View style={styles.paginationRow}>
                                <Pressable
                                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                                >
                                    <Ionicons
                                        name="chevron-back"
                                        size={14}
                                        color={page === 1 ? theme.muted : theme.text}
                                    />
                                    <Text style={styles.pageBtnText}>Previous</Text>
                                </Pressable>
                                <Text style={styles.pageInfo}>
                                    Page {page} of {totalPages}
                                </Text>
                                <Pressable
                                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    style={[
                                        styles.pageBtn,
                                        page === totalPages && styles.pageBtnDisabled,
                                    ]}
                                >
                                    <Text style={styles.pageBtnText}>Next</Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={14}
                                        color={page === totalPages ? theme.muted : theme.text}
                                    />
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}

                {/* ── TAB 2: SELECTED QUESTIONS ──────────────────────────────────────── */}
                {tab === "selected" && (
                    <View style={styles.tabContent}>
                        <View style={styles.selectedHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionTitle}>
                                    Selected Questions ({selectedList.length})
                                </Text>
                                <Text style={styles.sectionSubtitle}>
                                    Preserved across searches and ready for AI prompt assembly.
                                </Text>
                            </View>
                            {selectedList.length > 0 && (
                                <Pressable onPress={handleClearAll} style={styles.clearBtn}>
                                    <Ionicons name="trash-outline" size={13} color={theme.danger} />
                                    <Text style={styles.clearBtnText}>Clear All</Text>
                                </Pressable>
                            )}
                        </View>

                        {selectedList.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons
                                    name="file-tray-outline"
                                    size={36}
                                    color={theme.muted}
                                />
                                <Text style={styles.emptyTitle}>No questions selected yet</Text>
                                <Text style={styles.emptyText}>
                                    Select questions in the &quot;1. Browse&quot; tab to curate
                                    questions for your customized AI prompt.
                                </Text>
                                <Pressable
                                    onPress={() => setTab("browser")}
                                    style={styles.browseButton}
                                >
                                    <Text style={styles.browseButtonText}>Browse Questions →</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <View style={styles.questionsList}>
                                {selectedList.map((q, idx) => (
                                    <View key={q.quesId} style={styles.selectedCard}>
                                        <View style={styles.selectedCardHeader}>
                                            <View style={styles.selectedIndexBadge}>
                                                <Text style={styles.selectedIndexText}>#{idx + 1}</Text>
                                            </View>
                                            <View style={styles.typeBadge}>
                                                <Text style={styles.typeBadgeText}>
                                                    {q.quesType}
                                                </Text>
                                            </View>
                                            <Pressable
                                                onPress={() => handleRemoveQuestion(q.quesId)}
                                                style={styles.removeBtn}
                                                hitSlop={8}
                                            >
                                                <Ionicons
                                                    name="close-circle"
                                                    size={18}
                                                    color={theme.danger}
                                                />
                                            </Pressable>
                                        </View>
                                        <Text style={styles.questionText}>{q.quesText}</Text>
                                    </View>
                                ))}

                                <Pressable
                                    onPress={() => setTab("prompt")}
                                    style={styles.primaryBtn}
                                >
                                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                                    <Text style={styles.primaryBtnText}>
                                        Proceed to Configure & Generate Prompt ({selectedList.length}) →
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}

                {/* ── TAB 3: PROMPT & EXPORT ─────────────────────────────────────────── */}
                {tab === "prompt" && (
                    <View style={styles.tabContent}>
                        {/* Task Directive Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>1. Task Directive</Text>
                            <View style={styles.optionsGrid}>
                                {TASKS.map((t) => {
                                    const isSel = task === t.id;
                                    return (
                                        <Pressable
                                            key={t.id}
                                            onPress={() => setTask(t.id)}
                                            style={[
                                                styles.taskCard,
                                                isSel && styles.taskCardActive,
                                            ]}
                                        >
                                            <View style={styles.taskCardHeader}>
                                                <View style={styles.taskIconAndTitle}>
                                                    <Ionicons
                                                        name={t.icon}
                                                        size={18}
                                                        color={isSel ? theme.accent : theme.muted}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.taskTitle,
                                                            isSel && styles.taskTitleActive,
                                                        ]}
                                                    >
                                                        {t.label}
                                                    </Text>
                                                </View>
                                                {isSel && (
                                                    <Ionicons
                                                        name="checkmark-circle"
                                                        size={18}
                                                        color={theme.accent}
                                                    />
                                                )}
                                            </View>
                                            <Text style={styles.taskDesc}>{t.desc}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Answer Style Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>2. Answer Style</Text>
                            <View style={styles.styleRow}>
                                {STYLES.map((s) => {
                                    const isSel = answerStyle === s.id;
                                    return (
                                        <Pressable
                                            key={s.id}
                                            onPress={() => setAnswerStyle(s.id)}
                                            style={[
                                                styles.styleBtn,
                                                isSel && styles.styleBtnActive,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.styleBtnText,
                                                    isSel && styles.styleBtnTextActive,
                                                ]}
                                            >
                                                {s.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Optional Custom Instruction */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                3. Custom Instructions{" "}
                                <Text style={styles.optionalText}>(Optional)</Text>
                            </Text>
                            <TextInput
                                value={customInstruction}
                                onChangeText={setCustomInstruction}
                                placeholder="e.g. Follow SVNIT format, highlight edge cases, include Java code examples..."
                                placeholderTextColor={theme.muted}
                                style={styles.instructionInput}
                                multiline
                            />
                        </View>

                        {/* Prompt Preview & Stats */}
                        <View style={styles.section}>
                            <View style={styles.previewHeader}>
                                <Text style={styles.sectionTitle}>4. Generated Prompt Preview</Text>
                                <View style={styles.statPill}>
                                    <Text style={styles.statLine}>
                                        {wordsCount} words • ~{estTokens} tokens
                                    </Text>
                                </View>
                            </View>

                            <TextInput
                                value={generatedPrompt}
                                onChangeText={setGeneratedPrompt}
                                multiline
                                style={styles.promptTextarea}
                                textAlignVertical="top"
                            />

                            {/* Actions */}
                            <View style={styles.promptActions}>
                                <Pressable
                                    onPress={handleCopyOrShare}
                                    disabled={selectedList.length === 0}
                                    style={[
                                        styles.copyBtn,
                                        copiedNotice && styles.copyBtnSuccess,
                                        selectedList.length === 0 && { opacity: 0.5 },
                                    ]}
                                >
                                    <Ionicons
                                        name={copiedNotice ? "checkmark-circle" : "copy-outline"}
                                        size={18}
                                        color="#FFFFFF"
                                    />
                                    <Text style={styles.copyBtnText}>
                                        {copiedNotice ? "Copied / Shared!" : "Copy or Share Prompt"}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Zero Cost Notice */}
                        <View style={styles.noticeCard}>
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={18}
                                color={theme.accent}
                            />
                            <View style={{ flex: 1, gap: 2 }}>
                                <Text style={styles.noticeTitle}>Zero AI Cost Guarantee</Text>
                                <Text style={styles.noticeText}>
                                    Prompts are deterministically constructed directly from your database records on-device. No API credits or external token fees are required.
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </AppShell>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        container: {
            width: "100%",
            maxWidth: 1040,
            alignSelf: "center",
            gap: 18,
            paddingBottom: 24,
        },
        header: {
            gap: 4,
            marginBottom: 4,
        },
        headerTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
        },
        headerTitleWrap: { gap: 4 },
        eyebrow: {
            color: t.accent,
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 1.2,
        },
        title: {
            color: t.text,
            fontSize: 26,
            fontWeight: "900",
            letterSpacing: -0.4,
        },
        subtitle: {
            color: t.muted,
            fontSize: 13,
            lineHeight: 18,
            marginTop: 2,
        },
        badgeCount: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
        },
        badgeCountText: {
            color: t.accent,
            fontWeight: "800",
            fontSize: 12,
        },

        tabBar: {
            flexDirection: "row",
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            padding: 4,
            gap: 6,
        },
        tabButton: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 10,
            paddingHorizontal: 6,
            borderRadius: 10,
            backgroundColor: "transparent",
        },
        tabButtonActive: {
            backgroundColor: t.accent,
        },
        tabButtonText: {
            fontSize: 12,
            fontWeight: "700",
            color: t.muted,
            flexShrink: 1,
        },
        tabButtonTextActive: {
            color: "#FFFFFF",
        },

        tabContent: {
            gap: 16,
        },

        searchBar: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 12,
            height: 44,
            gap: 8,
        },
        searchIcon: { marginRight: 2 },
        searchInput: { flex: 1, color: t.text, fontSize: 13 },

        filterSection: { gap: 6 },
        filterHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        filterLabel: {
            color: t.muted,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1,
        },
        clearFiltersLink: {
            color: t.accent,
            fontSize: 11,
            fontWeight: "700",
        },
        pillRow: { gap: 8, paddingVertical: 2 },
        pill: {
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 10,
        },
        pillActive: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },
        pillText: { color: t.text, fontSize: 12, fontWeight: "600" },
        pillTextActive: { color: "#FFFFFF" },

        typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
        typePill: {
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
        },
        typePillActive: {
            backgroundColor: t.surface,
            borderColor: t.accent,
        },
        typePillText: { color: t.muted, fontSize: 11, fontWeight: "600" },
        typePillTextActive: { color: t.accent, fontWeight: "700" },

        actionBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            paddingVertical: 4,
        },
        actionCount: { color: t.muted, fontSize: 12 },
        actionHighlight: { color: t.text, fontWeight: "700" },
        selectPageBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
        },
        selectPageBtnText: { color: t.accent, fontSize: 11, fontWeight: "700" },

        questionsList: { gap: 10 },
        questionCard: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 14,
            padding: 16,
            gap: 10,
        },
        questionCardSelected: {
            borderColor: t.accent,
            backgroundColor: t.surfaceAlt,
        },
        cardHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
        },
        metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, flex: 1 },
        typeBadge: {
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
        },
        typeBadgeText: {
            fontSize: 10,
            fontWeight: "800",
            color: t.accent,
        },
        semBadge: {
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
        },
        semBadgeText: {
            fontSize: 10,
            fontWeight: "700",
            color: t.muted,
        },
        selectedBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: "#10B981",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
        },
        selectedBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
        checkbox: {
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: t.border,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surfaceAlt,
        },
        checkboxActive: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },
        questionText: { color: t.text, fontSize: 13, lineHeight: 20 },
        topicRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
        topicTag: {
            backgroundColor: t.surfaceAlt,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: t.border,
        },
        topicTagText: { color: t.muted, fontSize: 10, fontWeight: "500" },

        paginationRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 8,
        },
        pageBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
        },
        pageBtnDisabled: { opacity: 0.35 },
        pageBtnText: { color: t.text, fontSize: 12, fontWeight: "700" },
        pageInfo: { color: t.muted, fontSize: 12, fontWeight: "600" },

        selectedHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 4,
        },
        sectionTitle: { color: t.text, fontSize: 15, fontWeight: "800" },
        sectionSubtitle: { color: t.muted, fontSize: 12, marginTop: 2 },
        clearBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.3)",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
        },
        clearBtnText: { color: t.danger, fontSize: 11, fontWeight: "700" },

        selectedCard: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 14,
            padding: 14,
            gap: 8,
        },
        selectedCardHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        selectedIndexBadge: {
            backgroundColor: t.surfaceAlt,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
        },
        selectedIndexText: { color: t.muted, fontSize: 11, fontWeight: "800" },
        removeBtn: { padding: 4 },

        primaryBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: t.accent,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 12,
            marginTop: 6,
        },
        primaryBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },

        section: { gap: 10 },
        optionsGrid: { gap: 8 },
        taskCard: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 14,
            gap: 6,
        },
        taskCardActive: {
            borderColor: t.accent,
            backgroundColor: t.surfaceAlt,
        },
        taskCardHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        taskIconAndTitle: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        taskTitle: { color: t.text, fontSize: 14, fontWeight: "800" },
        taskTitleActive: { color: t.accent },
        taskDesc: { color: t.muted, fontSize: 12, lineHeight: 17 },

        styleRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
        styleBtn: {
            flex: 1,
            minWidth: 96,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            paddingVertical: 12,
            alignItems: "center",
            borderRadius: 10,
        },
        styleBtnActive: {
            borderColor: t.accent,
            backgroundColor: t.surfaceAlt,
        },
        styleBtnText: { color: t.muted, fontSize: 12, fontWeight: "700" },
        styleBtnTextActive: { color: t.accent },

        optionalText: { color: t.muted, fontSize: 12, fontWeight: "400" },
        instructionInput: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 12,
            color: t.text,
            fontSize: 12,
            minHeight: 56,
        },

        previewHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
        },
        statPill: {
            backgroundColor: t.surfaceAlt,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: t.border,
        },
        statLine: { color: t.muted, fontSize: 11, fontWeight: "600" },
        promptTextarea: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 14,
            color: t.text,
            fontSize: 12,
            fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            lineHeight: 18,
            minHeight: 220,
        },
        promptActions: { marginTop: 4 },
        copyBtn: {
            backgroundColor: t.accent,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 14,
            borderRadius: 12,
            gap: 8,
        },
        copyBtnSuccess: { backgroundColor: "#10B981" },
        copyBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

        noticeCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 14,
        },
        noticeTitle: { color: t.text, fontSize: 12, fontWeight: "800" },
        noticeText: { color: t.muted, fontSize: 11, lineHeight: 16 },

        emptyCard: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 16,
            padding: 28,
            alignItems: "center",
            gap: 10,
            marginVertical: 8,
        },
        emptyTitle: { color: t.text, fontSize: 15, fontWeight: "800" },
        emptyText: { color: t.muted, fontSize: 12, textAlign: "center", lineHeight: 18 },
        browseButton: {
            backgroundColor: t.accent,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 10,
            marginTop: 4,
        },
        browseButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

        centerBlock: { padding: 32, alignItems: "center", gap: 12 },
        mutedText: { color: t.muted, fontSize: 12 },
        errorBox: {
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.3)",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            gap: 8,
        },
        errorText: { color: t.danger, fontSize: 12, textAlign: "center" },
        retryBtn: {
            backgroundColor: t.accent,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 8,
        },
        retryBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

        floatingBar: {
            backgroundColor: t.surface,
            borderTopWidth: 1,
            borderTopColor: t.border,
            paddingHorizontal: 18,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
        },
        floatingInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
        floatingCountBadge: {
            backgroundColor: t.accent,
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
        },
        floatingCountText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
        floatingLabel: { color: t.muted, fontSize: 12 },
        floatingBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: t.accent,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
        },
        floatingBtnSuccess: {
            backgroundColor: "#10B981",
        },
        floatingBtnDisabled: { opacity: 0.4 },
        floatingBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    });
}
