import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import {
    EmptyBlock,
    ErrorBlock,
    LoadingBlock,
    Pill,
    QuestionCard,
    TYPE_META,
} from "./ui";
import { useAppTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";
import {
    api,
    QUESTION_TYPES,
    type QuestionPage,
    type QuestionStats,
    type QuestionType,
    type Subject,
} from "../services/api";
import { useApiData } from "../hooks/use-api-data";
import {
    filterSubjectsForStudent,
    parseStudentEmail,
    sortSubjects,
    subjectColour,
    subjectDisplayName,
} from "../constants/subjects";
import type { AppTheme } from "../constants/theme";

const PAGE_SIZE = 10;

function asType(value?: string): QuestionType | null {
    return QUESTION_TYPES.find((t) => t === value) ?? null;
}

interface QuestionBankViewProps {
    showHeader?: boolean;
}

export default function QuestionBankView({
    showHeader = true,
}: QuestionBankViewProps) {
    const { theme } = useAppTheme();
    const { user } = useAuth();
    const s = useMemo(() => makeStyles(theme), [theme]);
    const params = useLocalSearchParams<{
        q?: string;
        subjectKey?: string;
        type?: string;
    }>();

    // Student profile derived dynamically from authenticated email
    const studentProfile = useMemo(
        () => (user?.email ? parseStudentEmail(user.email) : null),
        [user],
    );

    // Subject scope toggle: 'my-semester' | 'all'
    const [subjectScope, setSubjectScope] = useState<"my-semester" | "all">(
        () => (params.subjectKey ? "all" : studentProfile ? "my-semester" : "all"),
    );

    // Filter state (seeded from route params)
    const [search, setSearch] = useState(params.q ?? "");
    const [debounced, setDebounced] = useState((params.q ?? "").trim());
    const [subjectKey, setSubjectKey] = useState<number | null>(
        params.subjectKey ? Number(params.subjectKey) : null,
    );
    const [quesType, setQuesType] = useState<QuestionType | null>(
        asType(params.type),
    );
    const [page, setPage] = useState(1);

    // Synchronize params changes during render
    const [prevParams, setPrevParams] = useState({
        q: params.q,
        subjectKey: params.subjectKey,
        type: params.type,
    });

    if (
        params.q !== prevParams.q ||
        params.subjectKey !== prevParams.subjectKey ||
        params.type !== prevParams.type
    ) {
        setPrevParams({
            q: params.q,
            subjectKey: params.subjectKey,
            type: params.type,
        });
        setSearch(params.q ?? "");
        setDebounced((params.q ?? "").trim());
        setSubjectKey(params.subjectKey ? Number(params.subjectKey) : null);
        setQuesType(asType(params.type));
        setPage(1);
        if (params.subjectKey) {
            setSubjectScope("all");
        }
    }

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

    // Data Fetching
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

    const allSortedSubjects = useMemo(
        () =>
            subjectsState.status === "success"
                ? sortSubjects(subjectsState.data)
                : [],
        [subjectsState],
    );

    const displayedSubjects = useMemo(() => {
        if (subjectScope === "all" || !studentProfile) {
            return allSortedSubjects;
        }
        const filtered = filterSubjectsForStudent(
            allSortedSubjects,
            studentProfile,
        );
        if (
            subjectKey !== null &&
            !filtered.some((s) => s.subjectKey === subjectKey)
        ) {
            const currentSub = allSortedSubjects.find(
                (s) => s.subjectKey === subjectKey,
            );
            if (currentSub) return [currentSub, ...filtered];
        }
        return filtered;
    }, [allSortedSubjects, subjectScope, studentProfile, subjectKey]);

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
        <View style={s.container}>
            {showHeader && (
                <View style={s.header}>
                    <Text style={s.title}>Question Bank</Text>
                    <Text style={s.subtitle}>
                        {statsState.status === "success"
                            ? `${statsState.data.total.toLocaleString()} questions available across engineering subjects`
                            : "Find, filter and practise examination questions."}
                    </Text>
                </View>
            )}

            {/* Search */}
            <View style={s.searchBox}>
                <Ionicons name="search-outline" size={19} color={theme.muted} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search questions, topics, or keywords..."
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
                <View style={s.subjectLabelRow}>
                    <Text style={s.filterLabel}>SUBJECT FILTER</Text>
                    {studentProfile && (
                        <View style={s.segmentedRow}>
                            <Pressable
                                onPress={() => setSubjectScope("my-semester")}
                                style={[
                                    s.segmentPill,
                                    subjectScope === "my-semester" &&
                                        s.segmentPillActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        s.segmentPillText,
                                        subjectScope === "my-semester" &&
                                            s.segmentPillTextActive,
                                    ]}
                                >
                                    My Sem ({studentProfile.currentSemester})
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setSubjectScope("all")}
                                style={[
                                    s.segmentPill,
                                    subjectScope === "all" &&
                                        s.segmentPillActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        s.segmentPillText,
                                        subjectScope === "all" &&
                                            s.segmentPillTextActive,
                                    ]}
                                >
                                    All
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
                        <View style={s.emptySubjectNotice}>
                            <Text style={s.emptySubjectText}>
                                No subjects for Semester{" "}
                                {studentProfile?.currentSemester}.
                            </Text>
                            <Pressable
                                onPress={() => setSubjectScope("all")}
                                style={s.emptySubjectAction}
                            >
                                <Text style={s.emptySubjectActionText}>
                                    Show all subjects
                                </Text>
                            </Pressable>
                        </View>
                    )}
                {displayedSubjects.length > 0 && (
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
                        {displayedSubjects.map((sub) => (
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
                <View>
                    <Text style={s.resultsEyebrow}>AVAILABLE QUESTIONS</Text>
                    <Text style={s.resultsTitle}>
                        {total === null
                            ? "All Questions"
                            : `${total.toLocaleString()} ${total === 1 ? "question found" : "questions found"}`}
                    </Text>
                </View>
                {filtersActive && (
                    <Pressable
                        onPress={clearFilters}
                        accessibilityRole="button"
                        accessibilityLabel="Clear all filters"
                        hitSlop={8}
                        style={s.clearBtn}
                    >
                        <Ionicons
                            name="close-circle-outline"
                            size={14}
                            color={theme.accent}
                        />
                        <Text style={s.clearLink}>Clear filters</Text>
                    </Pressable>
                )}
            </View>

            {/* Questions list */}
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
                        title="No questions found"
                        text={
                            filtersActive
                                ? "Try broadening your search or clearing filters."
                                : "The question bank is currently empty."
                        }
                    />
                )}
            {questionsState.status === "success" &&
                questionsState.data.items.length > 0 && (
                    <>
                        <View style={{ gap: 12 }}>
                            {questionsState.data.items.map((q) => (
                                <QuestionCard key={q.quesId} question={q} />
                            ))}
                        </View>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <View style={s.pager}>
                                <Pressable
                                    onPress={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={page <= 1}
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
                                    onPress={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1),
                                        )
                                    }
                                    disabled={page >= totalPages}
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
        </View>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        container: { width: "100%" },
        header: { marginBottom: 16 },
        title: { color: t.text, fontSize: 24, fontWeight: "700" },
        subtitle: { color: t.muted, fontSize: 13, marginTop: 4 },

        searchBox: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            height: 50,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
            marginBottom: 14,
        },
        searchInput: {
            flex: 1,
            color: t.text,
            fontSize: 14,
            paddingVertical: 10,
        },

        pillRow: { gap: 8, paddingRight: 8, paddingVertical: 2 },
        subjectBlock: { marginTop: 14, marginBottom: 18, gap: 10 },
        subjectLabelRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        filterLabel: {
            color: t.muted,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.6,
        },
        segmentedRow: {
            flexDirection: "row",
            gap: 2,
            backgroundColor: t.surfaceAlt,
            padding: 3,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: t.border,
        },
        segmentPill: {
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 6,
        },
        segmentPillActive: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        segmentPillText: {
            fontSize: 11,
            color: t.muted,
            fontWeight: "600",
        },
        segmentPillTextActive: {
            color: t.accent,
            fontWeight: "700",
        },
        emptySubjectNotice: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 6,
        },
        emptySubjectText: {
            fontSize: 12,
            color: t.muted,
        },
        emptySubjectAction: {
            paddingVertical: 3,
            paddingHorizontal: 8,
            backgroundColor: t.surfaceAlt,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: t.border,
        },
        emptySubjectActionText: {
            fontSize: 11,
            fontWeight: "600",
            color: t.accent,
        },

        resultsHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            paddingTop: 4,
        },
        resultsEyebrow: {
            fontSize: 11,
            fontWeight: "700",
            color: t.muted,
            letterSpacing: 0.5,
            marginBottom: 2,
        },
        resultsTitle: {
            color: t.text,
            fontSize: 16,
            fontWeight: "800",
            letterSpacing: -0.2,
        },
        clearBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 6,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        clearLink: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "600",
        },

        pager: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 22,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: t.border,
        },
        pagerButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            height: 40,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
        },
        pagerDisabled: { opacity: 0.4 },
        pagerText: { color: t.text, fontSize: 13, fontWeight: "600" },
        pagerInfo: { color: t.muted, fontSize: 13, fontWeight: "500" },
    });
}
