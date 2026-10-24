/**
 * Question Bank screen.
 *
 * Data:
 *   - Subjects:  api.getSubjects()
 *   - Stats:     api.getQuestionStats()
 *   - Questions: api.searchQuestions({ search, subjectKey, quesType, page, pageSize })
 *
 * Filters can be pre-set from the Home screen via route params:
 *   /question-bank?q=...&subjectKey=...&type=MCQ|FILLUPS|SUBJECTIVE|TRUE/FALSE
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppShell from "../../components/AppShell";
import {
    EmptyBlock,
    ErrorBlock,
    LoadingBlock,
    Pill,
    QuestionCard,
    TYPE_META,
} from "../../components/ui";
import { useAppTheme } from "../../providers/ThemeProvider";
import {
    api,
    QUESTION_TYPES,
    type QuestionPage,
    type QuestionStats,
    type QuestionType,
    type Subject,
} from "../../services/api";
import { useApiData } from "../../hooks/use-api-data";
import {
    sortSubjects,
    subjectColour,
    subjectDisplayName,
} from "../../constants/subjects";
import type { AppTheme } from "../../constants/theme";

const PAGE_SIZE = 10;

function asType(value?: string): QuestionType | null {
    return QUESTION_TYPES.find((t) => t === value) ?? null;
}

export default function QuestionBankScreen() {
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);
    const params = useLocalSearchParams<{
        q?: string;
        subjectKey?: string;
        type?: string;
    }>();

    // ── Filter state (seeded from route params) ─────────────────────────────
    const [search, setSearch] = useState(params.q ?? "");
    const [debounced, setDebounced] = useState((params.q ?? "").trim());
    const [subjectKey, setSubjectKey] = useState<number | null>(
        params.subjectKey ? Number(params.subjectKey) : null,
    );
    const [quesType, setQuesType] = useState<QuestionType | null>(
        asType(params.type),
    );
    const [page, setPage] = useState(1);

    // Re-sync when the screen is re-opened with different params.
    useEffect(() => {
        setSearch(params.q ?? "");
        setDebounced((params.q ?? "").trim());
        setSubjectKey(params.subjectKey ? Number(params.subjectKey) : null);
        setQuesType(asType(params.type));
        setPage(1);
    }, [params.q, params.subjectKey, params.type]);

    // Debounce typing so filtering doesn't run on every keystroke.
    useEffect(() => {
        const id = setTimeout(() => {
            setDebounced((prev) => {
                const next = search.trim();
                if (next !== prev) setPage(1);
                return next;
            });
        }, 300);
        return () => clearTimeout(id);
    }, [search]);

    // ── Data ────────────────────────────────────────────────────────────────
    const fetchSubjects = useCallback(() => api.getSubjects(), []);
    const fetchStats = useCallback(() => api.getQuestionStats(), []);
    const fetchQuestions = useCallback(
        () =>
            api.searchQuestions({
                search: debounced || undefined,
                subjectKey: subjectKey ?? undefined,
                quesType: quesType ?? undefined,
                page,
                pageSize: PAGE_SIZE,
            }),
        [debounced, subjectKey, quesType, page],
    );

    const subjectsState = useApiData<Subject[]>(fetchSubjects);
    const statsState = useApiData<QuestionStats>(fetchStats);
    const questionsState = useApiData<QuestionPage>(fetchQuestions);

    const subjects = useMemo(
        () =>
            subjectsState.status === "success"
                ? sortSubjects(subjectsState.data)
                : [],
        [subjectsState],
    );

    // ── Derived ─────────────────────────────────────────────────────────────
    const filtersActive =
        !!debounced || subjectKey !== null || quesType !== null;
    const total =
        questionsState.status === "success" ? questionsState.data.total : null;
    const totalPages =
        total !== null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

    function clearFilters() {
        setSearch("");
        setDebounced("");
        setSubjectKey(null);
        setQuesType(null);
        setPage(1);
    }

    function pickSubject(key: number | null) {
        setSubjectKey(key);
        setPage(1);
    }

    function pickType(type: QuestionType | null) {
        setQuesType(type);
        setPage(1);
    }

    return (
        <AppShell active="questions" hideTopSearch>
            {/* Header */}
            <View style={s.header}>
                <Text style={s.title}>Question bank</Text>
                <Text style={s.subtitle}>
                    {statsState.status === "success"
                        ? `${statsState.data.total.toLocaleString()} questions available`
                        : "Find, filter and practise questions."}
                </Text>
            </View>

            {/* Search */}
            <View style={s.searchBox}>
                <Ionicons name="search" size={18} color={theme.muted} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by keyword or topic"
                    placeholderTextColor={theme.muted}
                    returnKeyType="search"
                    accessibilityLabel="Search questions"
                    style={s.searchInput}
                />
                {search.length > 0 && (
                    <Pressable
                        onPress={() => setSearch("")}
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

            {/* Question type filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.pillRow}
            >
                <Pill
                    label="All types"
                    active={quesType === null}
                    onPress={() => pickType(null)}
                />
                {QUESTION_TYPES.map((type) => (
                    <Pill
                        key={type}
                        label={TYPE_META[type].short}
                        icon={TYPE_META[type].icon}
                        color={TYPE_META[type].color}
                        active={quesType === type}
                        onPress={() =>
                            pickType(quesType === type ? null : type)
                        }
                    />
                ))}
            </ScrollView>

            {/* Subject filter */}
            <View style={s.subjectBlock}>
                <Text style={s.filterLabel}>Subject</Text>
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
                {subjects.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.pillRow}
                    >
                        <Pill
                            label="All subjects"
                            active={subjectKey === null}
                            onPress={() => pickSubject(null)}
                        />
                        {subjects.map((sub) => (
                            <Pill
                                key={sub.subjectKey}
                                label={subjectDisplayName(sub)}
                                color={subjectColour(sub)}
                                active={subjectKey === sub.subjectKey}
                                onPress={() =>
                                    pickSubject(
                                        subjectKey === sub.subjectKey
                                            ? null
                                            : sub.subjectKey,
                                    )
                                }
                            />
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Results header */}
            <View style={s.resultsHeader}>
                <Text style={s.resultsTitle}>
                    {total === null
                        ? "Questions"
                        : `${total.toLocaleString()} ${total === 1 ? "question" : "questions"}`}
                </Text>
                {filtersActive && (
                    <Pressable
                        onPress={clearFilters}
                        accessibilityRole="button"
                        hitSlop={8}
                    >
                        <Text style={s.clearLink}>Clear filters</Text>
                    </Pressable>
                )}
            </View>

            {/* Results */}
            {questionsState.status === "loading" && (
                <LoadingBlock label="Loading questions" />
            )}
            {questionsState.status === "error" && (
                <ErrorBlock
                    title="Couldn't load questions"
                    message={questionsState.message}
                    onRetry={questionsState.refresh}
                />
            )}
            {questionsState.status === "success" &&
                questionsState.data.items.length === 0 && (
                    <EmptyBlock
                        icon="search-outline"
                        title={
                            filtersActive
                                ? "No questions match these filters"
                                : "No questions yet"
                        }
                        text={
                            filtersActive
                                ? "Try a different keyword or clear some filters."
                                : "Questions will appear here once they're added."
                        }
                        actionLabel={
                            filtersActive ? "Clear filters" : undefined
                        }
                        onAction={filtersActive ? clearFilters : undefined}
                    />
                )}
            {questionsState.status === "success" &&
                questionsState.data.items.length > 0 && (
                    <>
                        <View style={{ gap: 10 }}>
                            {questionsState.data.items.map((q) => (
                                <QuestionCard key={q.quesId} question={q} />
                            ))}
                        </View>

                        {totalPages > 1 && (
                            <View style={s.pager}>
                                <Pressable
                                    disabled={page <= 1}
                                    onPress={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    accessibilityRole="button"
                                    accessibilityLabel="Previous page"
                                    style={[
                                        s.pagerButton,
                                        page <= 1 && s.pagerDisabled,
                                    ]}
                                >
                                    <Ionicons
                                        name="chevron-back"
                                        size={16}
                                        color={theme.text}
                                    />
                                    <Text style={s.pagerText}>Previous</Text>
                                </Pressable>
                                <Text style={s.pagerInfo}>
                                    Page {page} of {totalPages}
                                </Text>
                                <Pressable
                                    disabled={page >= totalPages}
                                    onPress={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1),
                                        )
                                    }
                                    accessibilityRole="button"
                                    accessibilityLabel="Next page"
                                    style={[
                                        s.pagerButton,
                                        page >= totalPages && s.pagerDisabled,
                                    ]}
                                >
                                    <Text style={s.pagerText}>Next</Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color={theme.text}
                                    />
                                </Pressable>
                            </View>
                        )}
                    </>
                )}
        </AppShell>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        header: { marginBottom: 18 },
        title: { color: t.text, fontSize: 26, fontWeight: "800" },
        subtitle: { color: t.muted, fontSize: 13, marginTop: 4 },

        searchBox: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
            marginBottom: 12,
        },
        searchInput: {
            flex: 1,
            color: t.text,
            fontSize: 14,
            paddingVertical: 13,
        },

        pillRow: { gap: 8, paddingRight: 8 },
        subjectBlock: { marginTop: 14, marginBottom: 20, gap: 8 },
        filterLabel: { color: t.muted, fontSize: 12, fontWeight: "700" },

        resultsHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
        },
        resultsTitle: { color: t.text, fontSize: 16, fontWeight: "800" },
        clearLink: { color: t.accent, fontSize: 13, fontWeight: "700" },

        pager: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 20,
        },
        pagerButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
        },
        pagerDisabled: { opacity: 0.4 },
        pagerText: { color: t.text, fontSize: 13, fontWeight: "700" },
        pagerInfo: { color: t.muted, fontSize: 13 },
    });
}
