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
                            ? `${statsState.data.total.toLocaleString()} questions cataloged across all courses`
                            : "Explore and practice university examination questions."}
                    </Text>
                </View>
            )}

            {/* Search Box */}
            <View style={s.searchBox}>
                <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by keywords, topics, or question text..."
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

            {/* Question Type Filter Group */}
            <View style={s.filterGroup}>
                <Text style={s.filterGroupLabel}>QUESTION TYPE</Text>
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
            </View>

            {/* Subject Filter Group */}
            <View style={s.filterGroup}>
                <View style={s.subjectHeaderRow}>
                    <Text style={s.filterGroupLabel}>SUBJECT</Text>
                    {studentProfile && (
                        <View style={s.scopeToggle}>
                            <Pressable
                                onPress={() => setSubjectScope("my-semester")}
                                style={[
                                    s.scopeButton,
                                    subjectScope === "my-semester" && s.scopeButtonActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        s.scopeButtonText,
                                        subjectScope === "my-semester" && s.scopeButtonTextActive,
                                    ]}
                                >
                                    Sem {studentProfile.currentSemester}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setSubjectScope("all")}
                                style={[
                                    s.scopeButton,
                                    subjectScope === "all" && s.scopeButtonActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        s.scopeButtonText,
                                        subjectScope === "all" && s.scopeButtonTextActive,
                                    ]}
                                >
                                    All Semesters
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {subjectsState.status === "loading" && (
                    <LoadingBlock label="Loading subjects..." />
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
                                No subjects mapped for Semester{" "}
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

            {/* Results Header */}
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

            {/* Questions List */}
            {questionsState.status === "loading" && (
                <LoadingBlock label="Loading questions..." />
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
                                ? "Try broadening your search query or removing filter tags."
                                : "The question bank has no questions yet."
                        }
                        actionLabel={filtersActive ? "Reset filters" : undefined}
                        onAction={filtersActive ? clearFilters : undefined}
                    />
                )}
            {questionsState.status === "success" &&
                questionsState.data.items.length > 0 && (
                    <>
                        <View style={{ gap: 14 }}>
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
                                        color={page <= 1 ? theme.muted : theme.text}
                                    />
                                    <Text
                                        style={[
                                            s.pagerText,
                                            page <= 1 && { color: theme.muted },
                                        ]}
                                    >
                                        Previous
                                    </Text>
                                </Pressable>

                                <Text style={s.pagerInfo}>
                                    Page {page} of {totalPages}
                                </Text>

                                <Pressable
                                    onPress={() =>
                                        setPage((p) => Math.min(totalPages, p + 1))
                                    }
                                    disabled={page >= totalPages}
                                    accessibilityRole="button"
                                    accessibilityLabel="Next page"
                                    style={[
                                        s.pagerButton,
                                        page >= totalPages && s.pagerDisabled,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            s.pagerText,
                                            page >= totalPages && { color: theme.muted },
                                        ]}
                                    >
                                        Next
                                    </Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color={page >= totalPages ? theme.muted : theme.text}
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
        container: { gap: 18, width: "100%" },
        header: { gap: 4, marginBottom: 4 },
        title: {
            color: t.text,
            fontSize: 22,
            fontWeight: "800",
            letterSpacing: -0.3,
        },
        subtitle: { color: t.textSecondary, fontSize: 13, lineHeight: 18 },
        searchBox: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            height: 44,
            borderRadius: 12,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        searchInput: {
            flex: 1,
            color: t.text,
            fontSize: 13,
            padding: 0,
        },
        filterGroup: {
            gap: 8,
        },
        filterGroupLabel: {
            color: t.textSecondary,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.8,
        },
        pillRow: {
            gap: 8,
            paddingRight: 8,
        },
        subjectHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        scopeToggle: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.surfaceAlt,
            borderRadius: 8,
            padding: 2,
            borderWidth: 1,
            borderColor: t.border,
        },
        scopeButton: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
        },
        scopeButtonActive: {
            backgroundColor: t.accentSoft,
        },
        scopeButtonText: {
            fontSize: 11,
            fontWeight: "600",
            color: t.textSecondary,
        },
        scopeButtonTextActive: {
            color: t.accent,
            fontWeight: "700",
        },
        emptySubjectNotice: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 10,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        emptySubjectText: {
            color: t.textSecondary,
            fontSize: 12,
        },
        emptySubjectAction: {
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 6,
            backgroundColor: t.accentSoft,
        },
        emptySubjectActionText: {
            color: t.accent,
            fontSize: 11,
            fontWeight: "700",
        },
        resultsHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
            paddingBottom: 4,
        },
        resultsEyebrow: {
            color: t.muted,
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.8,
        },
        resultsTitle: {
            color: t.text,
            fontSize: 16,
            fontWeight: "700",
            marginTop: 2,
        },
        clearBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 6,
            backgroundColor: t.accentSoft,
        },
        clearLink: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "700",
        },
        pager: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: t.border,
        },
        pagerButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        pagerDisabled: {
            opacity: 0.5,
        },
        pagerText: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
        },
        pagerInfo: {
            color: t.textSecondary,
            fontSize: 12,
            fontWeight: "500",
        },
    });
}
