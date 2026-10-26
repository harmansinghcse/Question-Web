import { useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppShell, { useLayout } from "../components/AppShell";
import {
    Card,
    EmptyBlock,
    ErrorBlock,
    LoadingBlock,
    Pill,
    QuestionCard,
    SectionHeader,
    TYPE_META,
} from "../components/ui";
import { useAppTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";
import {
    api,
    QUESTION_TYPES,
    type QuestionPage,
    type QuestionStats,
    type Subject,
} from "../services/api";
import { useApiData } from "../hooks/use-api-data";
import {
    filterSubjectsForStudent,
    parseStudentEmail,
    sortSubjects,
    subjectCode,
    subjectColour,
    subjectDisplayName,
    subjectIcon,
    subjectMeta,
} from "../constants/subjects";
import type { AppTheme } from "../constants/theme";

export default function HomeScreen() {
    const router = useRouter();
    const { theme, ready } = useAppTheme();
    const { user, isRestoring } = useAuth();
    const { isWide, width } = useLayout();
    const s = useMemo(() => makeStyles(theme), [theme]);
    const [query, setQuery] = useState("");

    // Student profile derived dynamically from authenticated email
    const studentProfile = useMemo(
        () => (user?.email ? parseStudentEmail(user.email) : null),
        [user?.email],
    );

    // Filter toggle mode: 'my-semester' | 'all'
    const [filterMode, setFilterMode] = useState<"my-semester" | "all">("my-semester");

    // ── Data ────────────────────────────────────────────────────────────────
    const fetchSubjects = useCallback(() => api.getSubjects(), []);
    const fetchStats = useCallback(() => api.getQuestionStats(), []);
    const fetchRecent = useCallback(
        () => api.searchQuestions({ page: 1, pageSize: 4 }),
        [],
    );

    const subjectsState = useApiData<Subject[]>(fetchSubjects, ready && !isRestoring);
    const statsState = useApiData<QuestionStats>(fetchStats, ready && !isRestoring);
    const recentState = useApiData<QuestionPage>(fetchRecent, ready && !isRestoring);

    const allSortedSubjects = useMemo(
        () =>
            subjectsState.status === "success"
                ? sortSubjects(subjectsState.data)
                : [],
        [subjectsState],
    );

    // Apply personalized filtering when in 'my-semester' mode
    const displayedSubjects = useMemo(() => {
        if (filterMode === "all" || !studentProfile) {
            return allSortedSubjects;
        }
        return filterSubjectsForStudent(allSortedSubjects, studentProfile);
    }, [allSortedSubjects, filterMode, studentProfile]);

    if (!ready || isRestoring) return <View style={s.blank} />;

    // ── Navigation helpers ──────────────────────────────────────────────────
    const openQuestionBank = (params: Record<string, string> = {}) =>
        router.push({ pathname: "/question-bank", params } as never);

    const submitSearch = () => {
        const q = query.trim();
        openQuestionBank(q ? { q } : {});
    };

    const stats = statsState.status === "success" ? statsState.data : null;
    const statValue = (n: number | undefined) =>
        n !== undefined
            ? n.toLocaleString()
            : statsState.status === "loading"
              ? "…"
              : "–";

    const statTiles = [
        {
            label: "Total questions",
            icon: "documents-outline" as const,
            color: theme.accent,
            value: stats?.total,
        },
        ...QUESTION_TYPES.map((type) => ({
            label: TYPE_META[type].short,
            icon: TYPE_META[type].icon,
            color: TYPE_META[type].color,
            value: stats?.byType[type],
        })),
    ];

    const cardWidth = isWide
        ? 200
        : Math.max(150, Math.min(200, Math.floor((width - 32 - 12) / 1.85)));

    function renderSubjectCard(subject: Subject) {
        const colour = subjectColour(subject);
        const name = subjectDisplayName(subject);
        const code = subjectCode(subject);
        return (
            <Pressable
                key={subject.subjectKey}
                accessibilityRole="button"
                accessibilityLabel={`Open syllabus for ${name}`}
                onPress={() =>
                    router.push({
                        pathname: "/syllabus",
                        params: { subjectKey: String(subject.subjectKey) },
                    } as never)
                }
                style={({ pressed }) => [
                    s.subjectCard,
                    { width: cardWidth, borderTopColor: colour },
                    pressed && { opacity: 0.88 },
                ]}
            >
                <View style={s.subjectTop}>
                    <View
                        style={[
                            s.subjectIconBox,
                            { backgroundColor: colour + "22" },
                        ]}
                    >
                        <Text
                            style={{
                                color: colour,
                                fontSize: 15,
                                fontWeight: "800",
                            }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {subjectIcon(subject)}
                        </Text>
                    </View>
                    {code !== "" && code !== name && (
                        <View
                            style={[
                                s.subjectCode,
                                { backgroundColor: colour + "18" },
                            ]}
                        >
                            <Text
                                style={{
                                    color: colour,
                                    fontSize: 10,
                                    fontWeight: "800",
                                }}
                                numberOfLines={1}
                            >
                                {code}
                            </Text>
                        </View>
                    )}
                </View>
                <Text numberOfLines={2} style={s.subjectName}>
                    {name}
                </Text>
                <Text numberOfLines={1} style={s.subjectMeta}>
                    {subjectMeta(subject)}
                </Text>
            </Pressable>
        );
    }

    return (
        <AppShell active="home">
            {/* Hero */}
            <View style={s.hero}>
                <Text style={s.heroTitle}>Ready to ace your exams?</Text>
                <Text style={s.heroText}>
                    Find the right questions and practise a little every day.
                </Text>
                <Pressable
                    onPress={() => openQuestionBank()}
                    accessibilityRole="button"
                    accessibilityLabel="Open question bank"
                    style={({ pressed }) => [
                        s.heroButton,
                        pressed && { opacity: 0.9 },
                    ]}
                >
                    <Text style={s.heroButtonText}>Open question bank</Text>
                    <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={theme.accent}
                    />
                </Pressable>
            </View>

            {/* Stats */}
            {statsState.status === "error" ? (
                <View style={{ marginBottom: 28 }}>
                    <ErrorBlock
                        title="Couldn't load question stats"
                        message={statsState.message}
                        onRetry={statsState.refresh}
                    />
                </View>
            ) : (
                <View style={s.statsRow}>
                    {statTiles.map((tile) => (
                        <View key={tile.label} style={s.statTile}>
                            <View
                                style={[
                                    s.statIcon,
                                    { backgroundColor: tile.color + "1F" },
                                ]}
                            >
                                <Ionicons
                                    name={tile.icon}
                                    size={18}
                                    color={tile.color}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.statValue}>
                                    {statValue(tile.value)}
                                </Text>
                                <Text style={s.statLabel} numberOfLines={1}>
                                    {tile.label}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Subjects */}
            <View style={s.section}>
                <View style={s.subjectHeaderContainer}>
                    <SectionHeader
                        title={
                            studentProfile && filterMode === "my-semester"
                                ? `Semester ${studentProfile.currentSemester} Subjects`
                                : "Your subjects"
                        }
                        actionLabel="Open syllabus"
                        onAction={() => router.push("/syllabus" as never)}
                    />

                    {/* Personalized Segmented Control */}
                    {studentProfile && (
                        <View style={s.filterToggleContainer}>
                            <Pressable
                                onPress={() => setFilterMode("my-semester")}
                                style={[
                                    s.toggleButton,
                                    filterMode === "my-semester" && s.toggleButtonActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        s.toggleButtonText,
                                        filterMode === "my-semester" && s.toggleButtonTextActive,
                                    ]}
                                >
                                    My Semester ({`Sem ${studentProfile.currentSemester}`})
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setFilterMode("all")}
                                style={[
                                    s.toggleButton,
                                    filterMode === "all" && s.toggleButtonActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        s.toggleButtonText,
                                        filterMode === "all" && s.toggleButtonTextActive,
                                    ]}
                                >
                                    All Semesters
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {subjectsState.status === "loading" && (
                    <LoadingBlock label="Loading subjects" />
                )}
                {subjectsState.status === "error" && (
                    <ErrorBlock
                        title="Couldn't load subjects"
                        message={subjectsState.message}
                        onRetry={subjectsState.refresh}
                    />
                )}
                {subjectsState.status === "success" &&
                    displayedSubjects.length === 0 && (
                        <View style={s.emptyContainer}>
                            <EmptyBlock
                                icon="school-outline"
                                title={
                                    filterMode === "my-semester" && studentProfile
                                        ? `No subjects listed for Semester ${studentProfile.currentSemester}`
                                        : "No subjects yet"
                                }
                                text={
                                    filterMode === "my-semester" && studentProfile
                                        ? "There are currently no subjects mapped to your semester in the syllabus. You can view all available syllabus subjects below."
                                        : "Subjects will appear here once they're added to your syllabus."
                                }
                            />
                            {filterMode === "my-semester" && (
                                <Pressable
                                    onPress={() => setFilterMode("all")}
                                    style={s.switchFilterButton}
                                >
                                    <Ionicons name="list" size={15} color="#FFFFFF" />
                                    <Text style={s.switchFilterButtonText}>
                                        View All Semesters
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                {displayedSubjects.length > 0 &&
                    (isWide ? (
                        <View style={s.subjectGrid}>
                            {displayedSubjects.map(renderSubjectCard)}
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            decelerationRate="fast"
                            snapToInterval={cardWidth + 12}
                            snapToAlignment="start"
                            contentContainerStyle={{
                                gap: 12,
                                paddingRight: 16,
                            }}
                        >
                            {displayedSubjects.map(renderSubjectCard)}
                        </ScrollView>
                    ))}
            </View>

            {/* Search */}
            <View style={s.section}>
                <Card>
                    <Text style={s.cardTitle}>Find a question</Text>
                    <View style={s.searchBox}>
                        <Ionicons name="search" size={18} color={theme.muted} />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={submitSearch}
                            returnKeyType="search"
                            placeholder="Search by keyword or topic"
                            placeholderTextColor={theme.muted}
                            accessibilityLabel="Search query"
                            style={s.searchInput}
                        />
                        {query.length > 0 && (
                            <Pressable
                                onPress={() => setQuery("")}
                                accessibilityRole="button"
                                accessibilityLabel="Clear search"
                                hitSlop={8}
                            >
                                <Ionicons
                                    name="close-circle"
                                    size={18}
                                    color={theme.muted}
                                />
                            </Pressable>
                        )}
                    </View>
                </Card>
            </View>

            {/* Recent questions */}
            <View style={s.section}>
                <SectionHeader
                    title="Recent questions"
                    actionLabel="View all"
                    onAction={() => openQuestionBank()}
                />
                {recentState.status === "loading" && (
                    <LoadingBlock label="Loading recent questions" />
                )}
                {recentState.status === "error" && (
                    <ErrorBlock
                        title="Couldn't load recent questions"
                        message={recentState.message}
                        onRetry={recentState.refresh}
                    />
                )}
                {recentState.status === "success" &&
                    recentState.data.items.length === 0 && (
                        <EmptyBlock
                            icon="documents-outline"
                            title="No questions yet"
                            text="Questions will appear here once they're added."
                        />
                    )}
                {recentState.status === "success" &&
                    recentState.data.items.length > 0 && (
                        <View style={{ gap: 12 }}>
                            {recentState.data.items.map((q) => (
                                <QuestionCard
                                    key={q.quesId}
                                    question={q}
                                />
                            ))}
                        </View>
                    )}
            </View>
        </AppShell>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        blank: {
            flex: 1,
            backgroundColor: t.background,
        },
        hero: {
            backgroundColor: t.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: t.border,
        },
        heroTitle: {
            fontSize: 22,
            fontWeight: "700",
            color: t.text,
            marginBottom: 6,
        },
        heroText: {
            fontSize: 14,
            color: t.muted,
            marginBottom: 16,
            lineHeight: 20,
        },
        heroButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            alignSelf: "flex-start",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: t.accent + "1A",
        },
        heroButtonText: {
            color: t.accent,
            fontSize: 13,
            fontWeight: "700",
        },
        statsRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 28,
        },
        statTile: {
            flex: 1,
            minWidth: 140,
            backgroundColor: t.surface,
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            borderWidth: 1,
            borderColor: t.border,
        },
        statIcon: {
            width: 36,
            height: 36,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
        },
        statValue: {
            fontSize: 18,
            fontWeight: "800",
            color: t.text,
        },
        statLabel: {
            fontSize: 11,
            color: t.muted,
            marginTop: 2,
        },
        section: {
            marginBottom: 28,
        },
        subjectHeaderContainer: {
            marginBottom: 10,
        },
        filterToggleContainer: {
            flexDirection: "row",
            backgroundColor: t.surface,
            borderRadius: 10,
            padding: 4,
            borderWidth: 1,
            borderColor: t.border,
            alignSelf: "flex-start",
            marginTop: 8,
            gap: 4,
        },
        toggleButton: {
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
        },
        toggleButtonActive: {
            backgroundColor: t.accent,
        },
        toggleButtonText: {
            fontSize: 12,
            fontWeight: "600",
            color: t.muted,
        },
        toggleButtonTextActive: {
            color: "#FFFFFF",
            fontWeight: "700",
        },
        emptyContainer: {
            alignItems: "center",
        },
        switchFilterButton: {
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: t.accent,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
        },
        switchFilterButtonText: {
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: "700",
        },
        subjectGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
        },
        subjectCard: {
            backgroundColor: t.surface,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: t.border,
            borderTopWidth: 3,
        },
        subjectTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
        },
        subjectIconBox: {
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
        },
        subjectCode: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
        },
        subjectName: {
            fontSize: 14,
            fontWeight: "700",
            color: t.text,
            marginBottom: 4,
            lineHeight: 18,
        },
        subjectMeta: {
            fontSize: 11,
            color: t.muted,
        },
        cardTitle: {
            fontSize: 15,
            fontWeight: "700",
            color: t.text,
            marginBottom: 12,
        },
        searchBox: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.surfaceAlt,
            borderRadius: 10,
            paddingHorizontal: 12,
            height: 42,
            gap: 8,
        },
        searchInput: {
            flex: 1,
            color: t.text,
            fontSize: 14,
            paddingVertical: 0,
        },
    });
}
