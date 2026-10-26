/**
 * Syllabus screen — three-level drill-down: Subject → Chapter → Topic.
 *
 * Data flow:
 *   1. Load all subjects from GET /api/subjects on mount.
 *   2. When the user taps a subject, fetch chapters via GET /api/chapters?subjectKey=<n>.
 *   3. When the user taps a chapter, fetch topics via GET /api/topics?chapterId=<n>.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Chapter, type Subject, type Topic } from "../services/api";
import { useApiData } from "../hooks/use-api-data";
import { useAppTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";
import type { AppTheme } from "../constants/theme";
import {
    parseStudentEmail,
    sortSubjects,
    subjectCode,
    subjectColour,
    subjectDisplayName,
    subjectIcon,
    subjectMeta,
} from "../constants/subjects";

// ─── Spacing scale (8px grid) ─────────────────────────────────────────────────
const SP = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

function isDarkTheme(bg: string) {
    const hex = bg.replace("#", "");
    if (hex.length < 6) return true;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function withPalette(t: AppTheme): AppTheme {
    if (isDarkTheme(t.background)) {
        return {
            ...t,
            background: "#000000",
            surface: "#0B0B12",
            surfaceAlt: "#17162B",
            border: "#26234A",
            text: "#FFFFFF",
            muted: "#A7A3C9",
            accent: "#7C5CFF",
        };
    }
    return { ...t, accent: "#6D4AFF" };
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function LoadingRow({ label, accent }: { label: string; accent: string }) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SP.md,
                paddingVertical: SP.lg,
                paddingHorizontal: SP.xs,
            }}
        >
            <ActivityIndicator color={accent} size="small" />
            <Text style={{ color: accent, fontSize: 13 }}>{label}</Text>
        </View>
    );
}

function ErrorCard({
    message,
    onRetry,
    styles,
}: {
    message: string;
    onRetry: () => void;
    styles: ReturnType<typeof makeStyles>;
}) {
    return (
        <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠</Text>
            <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Could not load data</Text>
                <Text style={styles.errorMessage} numberOfLines={3}>
                    {message}
                </Text>
            </View>
            <Pressable onPress={onRetry} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
            </Pressable>
        </View>
    );
}

function EmptyCard({
    text,
    styles,
}: {
    text: string;
    styles: ReturnType<typeof makeStyles>;
}) {
    return (
        <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>☁</Text>
            <Text style={styles.emptyText}>{text}</Text>
        </View>
    );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SyllabusScreen() {
    const { theme: appTheme } = useAppTheme();
    const { user } = useAuth();
    const theme = useMemo(() => withPalette(appTheme), [appTheme]);
    const styles = useMemo(() => makeStyles(theme), [theme]);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ subjectKey?: string }>();

    // Calculate authenticated student profile dynamically
    const studentProfile = useMemo(
        () => (user?.email ? parseStudentEmail(user.email) : null),
        [user?.email],
    );

    // Store selected subject KEY (number) and chapter as state.
    const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | null>(
        () => {
            const k = Number(params.subjectKey);
            return Number.isFinite(k) && k > 0 ? k : null;
        },
    );
    const [selectedChapterKey, setSelectedChapterKey] = useState<number | null>(
        null,
    );

    // ── Subjects ──────────────────────────────────────────────────────────────
    const fetchSubjects = useCallback(() => api.getSubjects(), []);
    const subjectsState = useApiData<Subject[]>(fetchSubjects);

    // ── Derived: resolve subject object from key ──────────────────────────────
    const subjectsData =
        subjectsState.status === "success" ? subjectsState.data : null;
    const subjects = useMemo(
        () => (subjectsData ? sortSubjects(subjectsData) : []),
        [subjectsData],
    );

    const selectedSubject = useMemo(
        () =>
            selectedSubjectKey != null
                ? (subjects.find((s) => s.subjectKey === selectedSubjectKey) ??
                  null)
                : null,
        [subjects, selectedSubjectKey],
    );

    // ── Chapters ──────────────────────────────────────────────────────────────
    const fetchChapters = useCallback(
        () =>
            selectedSubjectKey != null
                ? api.getChapters(selectedSubjectKey)
                : Promise.resolve([]),
        [selectedSubjectKey],
    );
    const chaptersState = useApiData<Chapter[]>(
        fetchChapters,
        selectedSubjectKey != null,
    );

    const chaptersData =
        chaptersState.status === "success" ? chaptersState.data : null;
    const chapters = useMemo(
        () =>
            chaptersData
                ? [...chaptersData].sort((a, b) => a.chapterNo - b.chapterNo)
                : [],
        [chaptersData],
    );

    const selectedChapter = useMemo(
        () =>
            selectedChapterKey != null
                ? (chapters.find((c) => c.chapterId === selectedChapterKey) ??
                  null)
                : null,
        [chapters, selectedChapterKey],
    );

    // ── Topics ────────────────────────────────────────────────────────────────
    const fetchTopics = useCallback(
        () =>
            selectedChapterKey != null
                ? api.getTopics(selectedChapterKey)
                : Promise.resolve([]),
        [selectedChapterKey],
    );
    const topicsState = useApiData<Topic[]>(
        fetchTopics,
        selectedChapterKey != null,
    );

    const topics = topicsState.status === "success" ? topicsState.data : [];

    // ── Helpers ───────────────────────────────────────────────────────────────
    function selectSubject(key: number | null) {
        setSelectedSubjectKey(key);
        setSelectedChapterKey(null);
    }

    function selectChapter(id: number | null) {
        setSelectedChapterKey(id);
    }

    // ── Semester filter + grouping ────────────────────────────────────────────
    // Default to student's current semester if available, or null (All)
    const [semesterFilter, setSemesterFilter] = useState<number | null>(() => {
        if (params.subjectKey) return null; // If subject key passed, show all
        return studentProfile?.currentSemester ?? null;
    });

    // Ensure filter updates as soon as authenticated student profile finishes restoring
    useEffect(() => {
        if (!params.subjectKey && studentProfile?.currentSemester) {
            setSemesterFilter(studentProfile.currentSemester);
        }
    }, [studentProfile?.currentSemester, params.subjectKey]);

    const semesters = useMemo(
        () =>
            Array.from(new Set(subjects.map((s) => s.semester ?? 0))).sort(
                (a, b) => a - b,
            ),
        [subjects],
    );

    const groupedSubjects = useMemo(() => {
        const groups = new Map<number, Subject[]>();
        for (const s of subjects) {
            const sem = s.semester ?? 0;
            if (semesterFilter != null && sem !== semesterFilter) continue;
            if (!groups.has(sem)) groups.set(sem, []);
            groups.get(sem)!.push(s);
        }
        return Array.from(groups.entries()).sort(([a], [b]) => a - b);
    }, [subjects, semesterFilter]);

    const totalCredits = useMemo(
        () => subjects.reduce((sum, s) => sum + (s.credits ?? 0), 0),
        [subjects],
    );

    // ── Inline renderers ──────────────────────────────────────────────────────
    function renderTopics(colour: string) {
        return (
            <View
                style={[styles.topicList, { borderLeftColor: colour + "55" }]}
            >
                {topicsState.status === "loading" && (
                    <LoadingRow label="Loading topics…" accent={colour} />
                )}
                {topicsState.status === "error" && (
                    <ErrorCard
                        message={topicsState.message}
                        onRetry={topicsState.refresh}
                        styles={styles}
                    />
                )}
                {topicsState.status === "success" && topics.length === 0 && (
                    <Text style={styles.inlineEmpty}>
                        No topics found for this chapter.
                    </Text>
                )}
                {topics.map((topic, i) => (
                    <View key={topic.topicId} style={styles.topicRow}>
                        <View
                            style={[
                                styles.topicDot,
                                { backgroundColor: colour },
                            ]}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.topicName}>
                                {topic.topicName}
                            </Text>
                        </View>
                        <Text style={styles.topicIdx}>#{i + 1}</Text>
                    </View>
                ))}
            </View>
        );
    }

    function renderChapters(colour: string) {
        return (
            <View style={styles.chapterList}>
                {chaptersState.status === "loading" && (
                    <LoadingRow label="Loading chapters…" accent={colour} />
                )}
                {chaptersState.status === "error" && (
                    <ErrorCard
                        message={chaptersState.message}
                        onRetry={chaptersState.refresh}
                        styles={styles}
                    />
                )}
                {chaptersState.status === "success" && chapters.length === 0 && (
                    <Text style={styles.inlineEmpty}>
                        No chapters listed under this subject.
                    </Text>
                )}
                {chapters.map((chapter) => {
                    const open = selectedChapterKey === chapter.chapterId;
                    return (
                        <View
                            key={chapter.chapterId}
                            style={[
                                styles.chapterCard,
                                open && { borderColor: colour },
                            ]}
                        >
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`${open ? "Collapse" : "Expand"} chapter ${chapter.chapterNo}: ${chapter.chapterName}`}
                                accessibilityState={{ expanded: open }}
                                onPress={() =>
                                    selectChapter(open ? null : chapter.chapterId)
                                }
                                style={styles.chapterPressable}
                            >
                                <View
                                    style={[
                                        styles.chapterNumberBadge,
                                        { backgroundColor: colour + "20" },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.chapterNumberText,
                                            { color: colour },
                                        ]}
                                    >
                                        CH {chapter.chapterNo}
                                    </Text>
                                </View>
                                <Text
                                    style={styles.chapterName}
                                    numberOfLines={2}
                                >
                                    {chapter.chapterName}
                                </Text>
                                <Text style={styles.chevron}>
                                    {open ? "▲" : "▼"}
                                </Text>
                            </Pressable>

                            {open && renderTopics(colour)}
                        </View>
                    );
                })}
            </View>
        );
    }

    return (
        <View
            style={[
                styles.screen,
                { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
        >
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Top Bar ─────────────────────────────────────────────────── */}
                <View style={styles.topBar}>
                    <Pressable
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace("/");
                            }
                        }}
                        style={styles.iconButton}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Text style={styles.iconButtonText}>←</Text>
                    </Pressable>

                    <Text style={styles.topBarTitle}>Syllabus</Text>

                    <View style={styles.topBarRight}>
                        {studentProfile && (
                            <View style={styles.profileBadge}>
                                <Text style={styles.profileBadgeText}>
                                    {`Sem ${studentProfile.currentSemester}`}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Header ──────────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Course Syllabus</Text>
                    <Text style={styles.headerSubtitle}>
                        {studentProfile
                            ? `Personalized for ${studentProfile.deptCode} (Semester ${studentProfile.currentSemester})`
                            : "Browse through subjects, chapters, and topics."}
                    </Text>
                </View>

                {/* ── Semester filter pills ──────────────────────────────────── */}
                {semesters.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterRow}
                    >
                        {studentProfile && (
                            <Pressable
                                onPress={() =>
                                    setSemesterFilter(
                                        semesterFilter === studentProfile.currentSemester
                                            ? null
                                            : studentProfile.currentSemester,
                                    )
                                }
                                style={[
                                    styles.filterPill,
                                    semesterFilter === studentProfile.currentSemester &&
                                        styles.filterPillActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.filterPillText,
                                        semesterFilter === studentProfile.currentSemester &&
                                            styles.filterPillTextActive,
                                    ]}
                                >
                                    ★ My Semester (Sem {studentProfile.currentSemester})
                                </Text>
                            </Pressable>
                        )}

                        <Pressable
                            onPress={() => setSemesterFilter(null)}
                            style={[
                                styles.filterPill,
                                semesterFilter === null && styles.filterPillActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.filterPillText,
                                    semesterFilter === null &&
                                        styles.filterPillTextActive,
                                ]}
                            >
                                All Semesters
                            </Text>
                        </Pressable>

                        {semesters.map((sem) => {
                            const active = semesterFilter === sem;
                            return (
                                <Pressable
                                    key={sem}
                                    onPress={() =>
                                        setSemesterFilter(active ? null : sem)
                                    }
                                    style={[
                                        styles.filterPill,
                                        active && styles.filterPillActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.filterPillText,
                                            active && styles.filterPillTextActive,
                                        ]}
                                    >
                                        {sem === 0 ? "Other" : `Sem ${sem}`}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                )}

                {subjectsState.status === "loading" && (
                    <LoadingRow
                        label="Loading subjects…"
                        accent={theme.accent}
                    />
                )}
                {subjectsState.status === "error" && (
                    <ErrorCard
                        message={subjectsState.message}
                        onRetry={subjectsState.refresh}
                        styles={styles}
                    />
                )}
                {subjectsState.status === "success" &&
                    groupedSubjects.length === 0 && (
                        <View style={{ gap: 12 }}>
                            <EmptyCard
                                text={
                                    semesterFilter !== null
                                        ? `No subjects found for Semester ${semesterFilter}. Switch to All Semesters to view full curriculum.`
                                        : "No subjects found."
                                }
                                styles={styles}
                            />
                            {semesterFilter !== null && (
                                <Pressable
                                    onPress={() => setSemesterFilter(null)}
                                    style={styles.retryButton}
                                >
                                    <Text style={styles.retryText}>
                                        View All Semesters
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                {/* ── Vertical subject list, grouped by semester ────────────────── */}
                {groupedSubjects.map(([sem, list]) => (
                    <View key={sem} style={styles.semesterGroup}>
                        <View style={styles.semesterHeader}>
                            <Text style={styles.semesterTitle}>
                                {sem === 0 ? "OTHER" : `SEMESTER ${sem}`}
                            </Text>
                            <View style={styles.semesterLine} />
                            <Text style={styles.semesterCount}>
                                {list.length}{" "}
                                {list.length === 1 ? "subject" : "subjects"}
                            </Text>
                        </View>

                        {list.map((subject) => {
                            const active =
                                selectedSubject?.subjectKey ===
                                subject.subjectKey;
                            const colour = subjectColour(subject);
                            const name = subjectDisplayName(subject);
                            const code = subjectCode(subject);
                            return (
                                <View
                                    key={subject.subjectKey}
                                    style={[
                                        styles.subjectCard,
                                        active && { borderColor: colour },
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.subjectAccent,
                                            { backgroundColor: colour },
                                        ]}
                                    />
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={`${active ? "Collapse" : "Expand"} subject ${name}`}
                                        accessibilityState={{
                                            expanded: active,
                                        }}
                                        onPress={() =>
                                            selectSubject(
                                                active
                                                    ? null
                                                    : subject.subjectKey,
                                            )
                                        }
                                        style={styles.subjectPressable}
                                    >
                                        <View style={styles.subjectRow}>
                                            <View
                                                style={[
                                                    styles.subjectIconBox,
                                                    {
                                                        backgroundColor:
                                                            colour + "26",
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.subjectIcon,
                                                        { color: colour },
                                                    ]}
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit
                                                >
                                                    {subjectIcon(subject)}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={styles.subjectTitle}
                                                    numberOfLines={2}
                                                >
                                                    {name}
                                                </Text>
                                                <Text
                                                    style={styles.subjectMeta}
                                                >
                                                    {code !== "" &&
                                                    code !== name
                                                        ? `${code} · `
                                                        : ""}
                                                    {subjectMeta(subject)}
                                                </Text>
                                            </View>
                                            <Text style={styles.chevron}>
                                                {active ? "▲" : "▼"}
                                            </Text>
                                        </View>
                                    </Pressable>

                                    {active && renderChapters(colour)}
                                </View>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: t.background,
        },
        scroll: {
            flex: 1,
        },
        scrollContent: {
            padding: SP.lg,
            gap: SP.lg,
        },
        topBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: SP.sm,
        },
        topBarTitle: {
            fontSize: 16,
            fontWeight: "700",
            color: t.text,
        },
        topBarRight: {
            minWidth: 40,
            alignItems: "flex-end",
        },
        profileBadge: {
            backgroundColor: t.accent + "22",
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
        },
        profileBadgeText: {
            fontSize: 11,
            fontWeight: "700",
            color: t.accent,
        },
        iconButton: {
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: "center",
            justifyContent: "center",
        },
        iconButtonText: {
            fontSize: 18,
            color: t.text,
        },
        header: {
            gap: SP.xs,
        },
        headerTitle: {
            fontSize: 24,
            fontWeight: "800",
            color: t.text,
        },
        headerSubtitle: {
            fontSize: 13,
            color: t.muted,
        },
        filterRow: {
            gap: SP.sm,
            paddingVertical: SP.xs,
        },
        filterPill: {
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        filterPillActive: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },
        filterPillText: {
            fontSize: 12,
            fontWeight: "600",
            color: t.muted,
        },
        filterPillTextActive: {
            color: "#FFFFFF",
            fontWeight: "700",
        },
        semesterGroup: {
            gap: SP.md,
            marginTop: SP.sm,
        },
        semesterHeader: {
            flexDirection: "row",
            alignItems: "center",
            gap: SP.md,
        },
        semesterTitle: {
            fontSize: 11,
            fontWeight: "800",
            color: t.muted,
            letterSpacing: 1,
        },
        semesterLine: {
            flex: 1,
            height: 1,
            backgroundColor: t.border,
        },
        semesterCount: {
            fontSize: 11,
            color: t.muted,
        },
        subjectCard: {
            backgroundColor: t.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            overflow: "hidden",
        },
        subjectAccent: {
            height: 3,
        },
        subjectPressable: {
            padding: SP.md,
        },
        subjectRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: SP.md,
        },
        subjectIconBox: {
            width: 40,
            height: 40,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
        },
        subjectIcon: {
            fontSize: 18,
            fontWeight: "800",
        },
        subjectTitle: {
            fontSize: 15,
            fontWeight: "700",
            color: t.text,
            marginBottom: 2,
        },
        subjectMeta: {
            fontSize: 12,
            color: t.muted,
        },
        chevron: {
            fontSize: 11,
            color: t.muted,
            marginLeft: SP.xs,
        },
        chapterList: {
            paddingHorizontal: SP.md,
            paddingBottom: SP.md,
            gap: SP.sm,
            borderTopWidth: 1,
            borderTopColor: t.border + "44",
            paddingTop: SP.md,
        },
        chapterCard: {
            backgroundColor: t.surfaceAlt,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: t.border,
            overflow: "hidden",
        },
        chapterPressable: {
            flexDirection: "row",
            alignItems: "center",
            padding: SP.md,
            gap: SP.md,
        },
        chapterNumberBadge: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        chapterNumberText: {
            fontSize: 10,
            fontWeight: "800",
        },
        chapterName: {
            flex: 1,
            fontSize: 13,
            fontWeight: "600",
            color: t.text,
        },
        topicList: {
            paddingHorizontal: SP.md,
            paddingBottom: SP.md,
            paddingTop: SP.xs,
            borderLeftWidth: 2,
            marginLeft: SP.xl,
            gap: SP.sm,
        },
        topicRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: SP.sm,
            paddingVertical: 2,
        },
        topicDot: {
            width: 5,
            height: 5,
            borderRadius: 2.5,
        },
        topicName: {
            fontSize: 12,
            color: t.text,
        },
        topicIdx: {
            fontSize: 10,
            color: t.muted,
        },
        inlineEmpty: {
            fontSize: 12,
            color: t.muted,
            fontStyle: "italic",
            paddingVertical: SP.xs,
        },
        errorCard: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.surface,
            borderRadius: 8,
            padding: SP.md,
            gap: SP.md,
            borderWidth: 1,
            borderColor: "#FF4D4F",
        },
        errorIcon: {
            fontSize: 18,
            color: "#FF4D4F",
        },
        errorTitle: {
            fontSize: 13,
            fontWeight: "700",
            color: t.text,
        },
        errorMessage: {
            fontSize: 11,
            color: t.muted,
        },
        retryButton: {
            backgroundColor: t.accent,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 6,
            alignSelf: "center",
        },
        retryText: {
            fontSize: 12,
            fontWeight: "700",
            color: "#FFFFFF",
        },
        emptyCard: {
            alignItems: "center",
            justifyContent: "center",
            padding: SP.xl,
            backgroundColor: t.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            gap: SP.xs,
        },
        emptyIcon: {
            fontSize: 24,
            color: t.muted,
        },
        emptyText: {
            fontSize: 13,
            color: t.muted,
            textAlign: "center",
        },
    });
}
