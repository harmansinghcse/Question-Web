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

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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

const TASKS: { id: PromptTask; label: string; desc: string; instruction: string }[] = [
    {
        id: "SOLVE",
        label: "Solve Questions",
        desc: "Step-by-step solutions, derivations, and final answers",
        instruction:
            "Solve the following questions with clear, step-by-step reasoning. Show necessary steps, derivations, and code where applicable. Conclude with definitive final answers.",
    },
    {
        id: "EXPLAIN",
        label: "Explain Concepts",
        desc: "Break down underlying theory, algorithms, and theorems",
        instruction:
            "Explain the foundational computer science concepts, theorems, algorithms, and definitions tested by each of the following questions. Provide intuitive analogies, key terminology, and real-world relevance.",
    },
    {
        id: "EXAM_READY",
        label: "Exam-Ready Answers",
        desc: "High-scoring model answers formatted for university exams",
        instruction:
            "Provide model, exam-ready answers formatted to score maximum marks according to academic standards. Structure answers with point-by-point presentation, highlighted keywords, definitions, necessary diagrams/tables, and clear subheadings.",
    },
    {
        id: "ANALYZE",
        label: "Analyze Questions",
        desc: "Evaluate difficulty, prerequisites, and common pitfalls",
        instruction:
            "Conduct a detailed academic analysis of each question. Identify its cognitive level (Bloom's taxonomy), estimated difficulty, prerequisite topics, core competencies being evaluated, and common examination mistakes students make.",
    },
    {
        id: "REVISION_GUIDE",
        label: "Revision Guide",
        desc: "Quick-review cheat-sheet, summary formulas, and concepts",
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
    const router = useRouter();
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

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace("/");
                    }}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="chevron-back" size={24} color={theme.text} />
                </Pressable>
                <View style={styles.headerText}>
                    <Text style={styles.eyebrow}>STUDY & PRODUCTIVITY TOOL</Text>
                    <Text style={styles.title}>Prompt Studio</Text>
                    <Text style={styles.subtitle}>
                        Select database questions & generate external AI prompts.
                    </Text>
                </View>
                <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountText}>{selectedQuestions.size}</Text>
                </View>
            </View>

            {/* In-Screen Tab Switcher (No navigation away!) */}
            <View style={styles.tabBar}>
                <Pressable
                    onPress={() => setTab("browser")}
                    style={[styles.tabButton, tab === "browser" && styles.tabButtonActive]}
                >
                    <Text
                        style={[
                            styles.tabButtonText,
                            tab === "browser" && styles.tabButtonTextActive,
                        ]}
                    >
                        1. Browse ({totalQuestions})
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => setTab("selected")}
                    style={[styles.tabButton, tab === "selected" && styles.tabButtonActive]}
                >
                    <Text
                        style={[
                            styles.tabButtonText,
                            tab === "selected" && styles.tabButtonTextActive,
                        ]}
                    >
                        2. Selected ({selectedQuestions.size})
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => setTab("prompt")}
                    style={[styles.tabButton, tab === "prompt" && styles.tabButtonActive]}
                >
                    <Text
                        style={[
                            styles.tabButtonText,
                            tab === "prompt" && styles.tabButtonTextActive,
                        ]}
                    >
                        3. Prompt & Export
                    </Text>
                </Pressable>
            </View>

            {/* ── TAB 1: QUESTION BROWSER ────────────────────────────────────────── */}
            {tab === "browser" && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Search Input */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={16} color={theme.muted} style={styles.searchIcon} />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search question keywords..."
                            placeholderTextColor={theme.muted}
                            style={styles.searchInput}
                        />
                        {search ? (
                            <Pressable onPress={() => setSearch("")} hitSlop={8}>
                                <Ionicons name="close-circle" size={16} color={theme.muted} />
                            </Pressable>
                        ) : null}
                    </View>

                    {/* Semester Filter Pills */}
                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>FILTER BY SEMESTER</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
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
                                        selectedSemester === studentProfile.currentSemester && styles.pillActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.pillText,
                                            selectedSemester === studentProfile.currentSemester && styles.pillTextActive,
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
                                        <Text style={[styles.pillText, isSel && styles.pillTextActive]}>
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
                            FILTER BY SUBJECT {selectedSemester !== null ? `(SEM ${selectedSemester})` : "(ALL SEMESTERS)"}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
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
                                        <Text style={[styles.pillText, isSel && styles.pillTextActive]}>
                                            {subjectDisplayName(sub)}
                                            {selectedSemester === null && sub.semester ? ` (S${sub.semester})` : ""}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Type Filter Pills */}
                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>QUESTION TYPE</Text>
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
                                        style={[styles.typePill, isSel && styles.typePillActive]}
                                    >
                                        <Text style={[styles.typePillText, isSel && styles.typePillTextActive]}>
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
                            Showing {questionsOnPage.length} of {totalQuestions}
                        </Text>
                        <Pressable
                            onPress={areAllOnPageSelected ? handleDeselectOnPage : handleSelectAllOnPage}
                            style={styles.selectPageBtn}
                        >
                            <Text style={styles.selectPageBtnText}>
                                {areAllOnPageSelected ? "Deselect Page" : "Select All on Page"}
                            </Text>
                        </Pressable>
                    </View>

                    {/* Questions List */}
                    {questionsState.status === "loading" ? (
                        <View style={styles.centerBlock}>
                            <ActivityIndicator size="large" color={theme.accent} />
                            <Text style={styles.mutedText}>Loading questions from database...</Text>
                        </View>
                    ) : questionsState.status === "error" ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>
                                {questionsState.message || "Failed to load questions"}
                            </Text>
                            <Pressable onPress={() => questionsState.refresh()} style={styles.retryBtn}>
                                <Text style={styles.retryBtnText}>Retry</Text>
                            </Pressable>
                        </View>
                    ) : questionsOnPage.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyIcon}>🔍</Text>
                            <Text style={styles.emptyTitle}>No matching questions found</Text>
                            <Text style={styles.emptyText}>
                                Try clearing your search keyword or selecting a different subject.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.questionsList}>
                            {questionsOnPage.map((q) => {
                                const isSelected = selectedQuestions.has(q.quesId);
                                return (
                                    <Pressable
                                        key={q.quesId}
                                        onPress={() => handleToggleQuestion(q)}
                                        style={[
                                            styles.questionCard,
                                            isSelected && styles.questionCardSelected,
                                        ]}
                                    >
                                        <View style={styles.cardHeader}>
                                            <View style={styles.metaRow}>
                                                <Text style={styles.typeBadge}>{q.quesType}</Text>
                                                {q.semester ? (
                                                    <Text style={styles.semBadge}>Sem {q.semester}</Text>
                                                ) : null}
                                                {isSelected && (
                                                    <View style={styles.selectedBadge}>
                                                        <Text style={styles.selectedBadgeText}>✓ Selected</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View
                                                style={[
                                                    styles.checkbox,
                                                    isSelected && styles.checkboxActive,
                                                ]}
                                            >
                                                {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
                                            </View>
                                        </View>

                                        <Text style={styles.questionText} numberOfLines={4}>
                                            {q.quesText}
                                        </Text>

                                        {q.topics && q.topics.length > 0 && (
                                            <View style={styles.topicRow}>
                                                {q.topics.slice(0, 3).map((t) => (
                                                    <Text key={t.topicId} style={styles.topicTag}>
                                                        #{t.topicName}
                                                    </Text>
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
                                <Text style={styles.pageBtnText}>‹ Previous</Text>
                            </Pressable>
                            <Text style={styles.pageInfo}>
                                Page {page} of {totalPages}
                            </Text>
                            <Pressable
                                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                            >
                                <Text style={styles.pageBtnText}>Next ›</Text>
                            </Pressable>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {/* ── TAB 2: SELECTED QUESTIONS ──────────────────────────────────────── */}
            {tab === "selected" && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.selectedHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>
                                Selected Questions ({selectedList.length})
                            </Text>
                            <Text style={styles.sectionSubtitle}>
                                Preserved across filter changes and ready for prompt generation.
                            </Text>
                        </View>
                        {selectedList.length > 0 && (
                            <Pressable onPress={handleClearAll} style={styles.clearBtn}>
                                <Text style={styles.clearBtnText}>Clear All</Text>
                            </Pressable>
                        )}
                    </View>

                    {selectedList.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyIcon}>📋</Text>
                            <Text style={styles.emptyTitle}>No questions selected yet</Text>
                            <Text style={styles.emptyText}>
                                Tap questions in the &quot;1. Browse&quot; tab to curate questions for your prompt.
                            </Text>
                            <Pressable onPress={() => setTab("browser")} style={styles.browseButton}>
                                <Text style={styles.browseButtonText}>Browse Questions →</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.questionsList}>
                            {selectedList.map((q, idx) => (
                                <View key={q.quesId} style={styles.selectedCard}>
                                    <View style={styles.selectedCardHeader}>
                                        <Text style={styles.selectedIndex}>#{idx + 1}</Text>
                                        <Text style={styles.typeBadge}>{q.quesType}</Text>
                                        <Pressable
                                            onPress={() => handleRemoveQuestion(q.quesId)}
                                            style={styles.removeBtn}
                                            hitSlop={8}
                                        >
                                            <Ionicons name="close-circle" size={18} color="#EF4444" />
                                        </Pressable>
                                    </View>
                                    <Text style={styles.questionText}>{q.quesText}</Text>
                                </View>
                            ))}

                            <Pressable onPress={() => setTab("prompt")} style={styles.primaryBtn}>
                                <Text style={styles.primaryBtnText}>
                                    Configure & Generate Prompt ({selectedList.length}) →
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {/* ── TAB 3: PROMPT & EXPORT ─────────────────────────────────────────── */}
            {tab === "prompt" && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                                        style={[styles.taskCard, isSel && styles.taskCardActive]}
                                    >
                                        <View style={styles.taskCardHeader}>
                                            <Text style={[styles.taskTitle, isSel && styles.taskTitleActive]}>
                                                {t.label}
                                            </Text>
                                            {isSel && <Ionicons name="checkmark-circle" size={16} color={theme.accent} />}
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
                                        style={[styles.styleBtn, isSel && styles.styleBtnActive]}
                                    >
                                        <Text style={[styles.styleBtnText, isSel && styles.styleBtnTextActive]}>
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
                            3. Custom Instruction <Text style={styles.optionalText}>(Optional)</Text>
                        </Text>
                        <TextInput
                            value={customInstruction}
                            onChangeText={setCustomInstruction}
                            placeholder="e.g. Focus on SVNIT exam format, explain edge cases..."
                            placeholderTextColor={theme.muted}
                            style={styles.instructionInput}
                            multiline
                        />
                    </View>

                    {/* Prompt Preview & Stats */}
                    <View style={styles.section}>
                        <View style={styles.previewHeader}>
                            <Text style={styles.sectionTitle}>4. Generated Prompt Preview</Text>
                            <Text style={styles.statLine}>
                                {wordsCount} words • ~{estTokens} tokens
                            </Text>
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
                                style={[styles.copyBtn, copiedNotice && styles.copyBtnSuccess]}
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
                        <Text style={styles.noticeTitle}>Zero AI Cost Guarantee</Text>
                        <Text style={styles.noticeText}>
                            This prompt was deterministically compiled from your database records on your device. No external AI APIs or token fees are charged.
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {/* Bottom Floating Bar */}
            <View style={styles.floatingBar}>
                <View style={styles.floatingInfo}>
                    <Text style={styles.floatingLabel}>Selected:</Text>
                    <Text style={styles.floatingCount}>{selectedQuestions.size} Qs</Text>
                </View>

                {tab === "browser" ? (
                    <Pressable
                        onPress={() => setTab("selected")}
                        disabled={selectedQuestions.size === 0}
                        style={[styles.floatingBtn, selectedQuestions.size === 0 && styles.floatingBtnDisabled]}
                    >
                        <Text style={styles.floatingBtnText}>
                            View Selected ({selectedQuestions.size}) →
                        </Text>
                    </Pressable>
                ) : tab === "selected" ? (
                    <Pressable
                        onPress={() => setTab("prompt")}
                        disabled={selectedQuestions.size === 0}
                        style={[styles.floatingBtn, selectedQuestions.size === 0 && styles.floatingBtnDisabled]}
                    >
                        <Text style={styles.floatingBtnText}>Generate Prompt →</Text>
                    </Pressable>
                ) : (
                    <Pressable onPress={handleCopyOrShare} style={styles.floatingBtn}>
                        <Text style={styles.floatingBtnText}>
                            {copiedNotice ? "Copied!" : "Copy / Share Prompt"}
                        </Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: t.background },
        header: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
            backgroundColor: t.surface,
        },
        backButton: {
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: t.border,
        },
        headerText: { flex: 1 },
        eyebrow: { color: t.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
        title: { color: t.text, fontSize: 20, fontWeight: "900" },
        subtitle: { color: t.muted, fontSize: 11, marginTop: 2 },
        badgeCount: {
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.accent,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
        },
        badgeCountText: { color: t.accent, fontWeight: "900", fontSize: 12 },

        tabBar: {
            flexDirection: "row",
            backgroundColor: t.surface,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
            padding: 6,
            gap: 6,
        },
        tabButton: {
            flex: 1,
            paddingVertical: 8,
            alignItems: "center",
            borderRadius: 8,
            backgroundColor: "transparent",
        },
        tabButtonActive: {
            backgroundColor: t.accent,
        },
        tabButtonText: {
            fontSize: 12,
            fontWeight: "700",
            color: t.muted,
        },
        tabButtonTextActive: {
            color: "#FFFFFF",
        },

        content: { padding: 14, gap: 14 },

        searchBar: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 12,
            height: 42,
            gap: 8,
        },
        searchIcon: { marginRight: 2 },
        searchInput: { flex: 1, color: t.text, fontSize: 13 },

        filterSection: { gap: 6 },
        filterLabel: { color: t.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
        pillRow: { gap: 8, paddingVertical: 2 },
        pill: {
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
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
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
        },
        typePillActive: {
            backgroundColor: t.surface,
            borderColor: t.accent,
        },
        typePillText: { color: t.muted, fontSize: 11, fontWeight: "600" },
        typePillTextActive: { color: t.accent },

        actionBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 4,
        },
        actionCount: { color: t.muted, fontSize: 12 },
        selectPageBtn: {
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
        },
        selectPageBtnText: { color: t.text, fontSize: 11, fontWeight: "700" },

        questionsList: { gap: 10 },
        questionCard: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 14,
            padding: 14,
            gap: 8,
        },
        questionCardSelected: {
            borderColor: t.accent,
            backgroundColor: t.surfaceAlt,
        },
        cardHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
        typeBadge: {
            fontSize: 10,
            fontWeight: "800",
            color: t.accent,
            backgroundColor: t.surfaceAlt,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
        },
        semBadge: {
            fontSize: 10,
            fontWeight: "700",
            color: t.muted,
            backgroundColor: t.surfaceAlt,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
        },
        selectedBadge: {
            backgroundColor: "#10B981",
            paddingHorizontal: 6,
            paddingVertical: 2,
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
        },
        checkboxActive: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },
        checkboxCheck: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
        questionText: { color: t.text, fontSize: 13, lineHeight: 19 },
        topicRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
        topicTag: { color: t.muted, fontSize: 10 },

        paginationRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 10,
        },
        pageBtn: {
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 8,
        },
        pageBtnDisabled: { opacity: 0.4 },
        pageBtnText: { color: t.text, fontSize: 12, fontWeight: "700" },
        pageInfo: { color: t.muted, fontSize: 12 },

        selectedHeader: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 6,
        },
        sectionTitle: { color: t.text, fontSize: 14, fontWeight: "800" },
        sectionSubtitle: { color: t.muted, fontSize: 11, marginTop: 2 },
        clearBtn: {
            backgroundColor: "#EF444422",
            borderWidth: 1,
            borderColor: "#EF444444",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
        },
        clearBtnText: { color: "#EF4444", fontSize: 11, fontWeight: "700" },

        selectedCard: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 14,
            padding: 12,
            gap: 6,
        },
        selectedCardHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        selectedIndex: { color: t.muted, fontSize: 11, fontWeight: "800" },
        removeBtn: { padding: 2 },

        primaryBtn: {
            backgroundColor: t.accent,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 8,
        },
        primaryBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },

        section: { gap: 8 },
        optionsGrid: { gap: 8 },
        taskCard: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 12,
            gap: 4,
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
        taskTitle: { color: t.text, fontSize: 13, fontWeight: "800" },
        taskTitleActive: { color: t.accent },
        taskDesc: { color: t.muted, fontSize: 11, lineHeight: 16 },

        styleRow: { flexDirection: "row", gap: 8 },
        styleBtn: {
            flex: 1,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            paddingVertical: 10,
            alignItems: "center",
            borderRadius: 10,
        },
        styleBtnActive: {
            borderColor: t.accent,
            backgroundColor: t.surfaceAlt,
        },
        styleBtnText: { color: t.muted, fontSize: 12, fontWeight: "700" },
        styleBtnTextActive: { color: t.accent },

        optionalText: { color: t.muted, fontSize: 11, fontWeight: "400" },
        instructionInput: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 10,
            padding: 10,
            color: t.text,
            fontSize: 12,
            minHeight: 48,
        },

        previewHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        statLine: { color: t.muted, fontSize: 11 },
        promptTextarea: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 12,
            color: t.text,
            fontSize: 12,
            fontFamily: "monospace",
            lineHeight: 18,
            minHeight: 200,
        },
        promptActions: { marginTop: 6 },
        copyBtn: {
            backgroundColor: t.accent,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            borderRadius: 12,
            gap: 8,
        },
        copyBtnSuccess: { backgroundColor: "#10B981" },
        copyBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },

        noticeCard: {
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 12,
            gap: 4,
        },
        noticeTitle: { color: t.text, fontSize: 11, fontWeight: "800" },
        noticeText: { color: t.muted, fontSize: 10, lineHeight: 15 },

        emptyCard: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 16,
            padding: 24,
            alignItems: "center",
            gap: 8,
            marginVertical: 12,
        },
        emptyIcon: { fontSize: 32 },
        emptyTitle: { color: t.text, fontSize: 15, fontWeight: "800" },
        emptyText: { color: t.muted, fontSize: 12, textAlign: "center", lineHeight: 18 },
        browseButton: {
            backgroundColor: t.accent,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            marginTop: 6,
        },
        browseButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

        centerBlock: { padding: 32, alignItems: "center", gap: 12 },
        mutedText: { color: t.muted, fontSize: 12 },
        errorBox: {
            backgroundColor: "#EF444415",
            borderWidth: 1,
            borderColor: "#EF444440",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            gap: 8,
        },
        errorText: { color: "#EF4444", fontSize: 12, textAlign: "center" },
        retryBtn: {
            backgroundColor: t.accent,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 8,
        },
        retryBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

        floatingBar: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: t.surface,
            borderTopWidth: 1,
            borderTopColor: t.border,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        floatingInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
        floatingLabel: { color: t.muted, fontSize: 12 },
        floatingCount: { color: t.accent, fontSize: 13, fontWeight: "900" },
        floatingBtn: {
            backgroundColor: t.accent,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
        },
        floatingBtnDisabled: { opacity: 0.4 },
        floatingBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    });
}
