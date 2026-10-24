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
import {
    api,
    QUESTION_TYPES,
    type QuestionPage,
    type QuestionStats,
    type Subject,
} from "../services/api";
import { useApiData } from "../hooks/use-api-data";
import {
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
    const { isWide, width } = useLayout();
    const s = useMemo(() => makeStyles(theme), [theme]);
    const [query, setQuery] = useState("");

    // ── Data ────────────────────────────────────────────────────────────────
    const fetchSubjects = useCallback(() => api.getSubjects(), []);
    const fetchStats = useCallback(() => api.getQuestionStats(), []);
    const fetchRecent = useCallback(
        () => api.searchQuestions({ page: 1, pageSize: 4 }),
        [],
    );

    const subjectsState = useApiData<Subject[]>(fetchSubjects, ready);
    const statsState = useApiData<QuestionStats>(fetchStats, ready);
    const recentState = useApiData<QuestionPage>(fetchRecent, ready);

    const subjects = useMemo(
        () =>
            subjectsState.status === "success"
                ? sortSubjects(subjectsState.data)
                : [],
        [subjectsState],
    );

    if (!ready) return <View style={s.blank} />;

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
                <SectionHeader
                    title="Your subjects"
                    actionLabel="Open syllabus"
                    onAction={() => router.push("/syllabus" as never)}
                />
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
                    subjects.length === 0 && (
                        <EmptyBlock
                            icon="school-outline"
                            title="No subjects yet"
                            text="Subjects will appear here once they're added to your syllabus."
                        />
                    )}
                {subjects.length > 0 &&
                    (isWide ? (
                        <View style={s.subjectGrid}>
                            {subjects.map(renderSubjectCard)}
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
                            {subjects.map(renderSubjectCard)}
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
                            accessibilityLabel="Search questions"
                            style={s.searchInput}
                        />
                        <Pressable
                            onPress={submitSearch}
                            accessibilityRole="button"
                            accessibilityLabel="Search"
                            style={s.searchButton}
                        >
                            <Text style={s.searchButtonText}>Search</Text>
                        </Pressable>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8, paddingTop: 12 }}
                    >
                        {QUESTION_TYPES.map((type) => (
                            <Pill
                                key={type}
                                label={TYPE_META[type].short}
                                icon={TYPE_META[type].icon}
                                onPress={() => openQuestionBank({ type })}
                            />
                        ))}
                    </ScrollView>
                </Card>
            </View>

            {/* Latest questions */}
            <View style={s.section}>
                <SectionHeader
                    title="Latest questions"
                    subtitle="Most recently added"
                    actionLabel="See all"
                    onAction={() => openQuestionBank()}
                />
                {recentState.status === "loading" && (
                    <LoadingBlock label="Loading questions" />
                )}
                {recentState.status === "error" && (
                    <ErrorBlock
                        title="Couldn't load questions"
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
                        <View style={{ gap: 10 }}>
                            {recentState.data.items.map((q) => (
                                <QuestionCard key={q.quesId} question={q} />
                            ))}
                        </View>
                    )}
            </View>
        </AppShell>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        blank: { flex: 1, backgroundColor: t.background },
        section: { marginBottom: 28 },

        hero: {
            backgroundColor: t.accent,
            borderRadius: 20,
            padding: 24,
            marginBottom: 16,
        },
        heroTitle: {
            color: "#FFFFFF",
            fontSize: 24,
            fontWeight: "800",
            lineHeight: 30,
        },
        heroText: {
            color: "rgba(255,255,255,0.88)",
            fontSize: 14,
            lineHeight: 21,
            marginTop: 6,
            maxWidth: 480,
        },
        heroButton: {
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 8,
            marginTop: 18,
            paddingHorizontal: 18,
            paddingVertical: 11,
            borderRadius: 12,
            backgroundColor: "#FFFFFF",
        },
        heroButtonText: { color: t.accent, fontSize: 14, fontWeight: "800" },

        statsRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 28,
        },
        statTile: {
            flexGrow: 1,
            flexBasis: 150,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 12,
            borderRadius: 14,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        statIcon: {
            width: 38,
            height: 38,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
        },
        statValue: { color: t.text, fontSize: 20, fontWeight: "800" },
        statLabel: { color: t.muted, fontSize: 12, marginTop: 1 },

        subjectGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
        subjectCard: {
            minHeight: 128,
            padding: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderTopWidth: 4,
            borderColor: t.border,
            backgroundColor: t.surface,
            justifyContent: "space-between",
            gap: 10,
        },
        subjectTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        subjectIconBox: {
            width: 38,
            height: 38,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
        },
        subjectCode: {
            borderRadius: 8,
            paddingHorizontal: 7,
            paddingVertical: 3,
            flexShrink: 1,
        },
        subjectName: {
            color: t.text,
            fontSize: 14,
            fontWeight: "700",
            lineHeight: 19,
        },
        subjectMeta: { color: t.muted, fontSize: 12 },

        cardTitle: {
            color: t.text,
            fontSize: 16,
            fontWeight: "800",
            marginBottom: 12,
        },
        searchBox: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingLeft: 14,
            paddingRight: 6,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surfaceAlt,
        },
        searchInput: {
            flex: 1,
            color: t.text,
            fontSize: 14,
            paddingVertical: 12,
        },
        searchButton: {
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 10,
            backgroundColor: t.accent,
        },
        searchButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
    });
}
