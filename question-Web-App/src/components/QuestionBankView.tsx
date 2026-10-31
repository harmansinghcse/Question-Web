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
    FilterBottomSheet,
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
    type Chapter,
    type QuestionPage,
    type QuestionStats,
    type QuestionType,
    type Subject,
    type Topic,
} from "../services/api";
import { useApiData } from "../hooks/use-api-data";
import {
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

    // Filter state (seeded from route params)
    const [search, setSearch] = useState(params.q ?? "");
    const [debounced, setDebounced] = useState((params.q ?? "").trim());
    const [selectedSemester, setSelectedSemester] = useState<number | null>(
        () =>
            params.subjectKey
                ? null
                : (studentProfile?.currentSemester ?? null),
    );
    const [subjectKey, setSubjectKey] = useState<number | null>(
        params.subjectKey ? Number(params.subjectKey) : null,
    );
    const [chapterId, setChapterId] = useState<number | null>(null);
    const [topicId, setTopicId] = useState<number | null>(null);
    const [quesType, setQuesType] = useState<QuestionType | null>(
        asType(params.type),
    );
    const [page, setPage] = useState(1);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);

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
        setChapterId(null);
        setTopicId(null);
        setQuesType(asType(params.type));
        setPage(1);
        if (params.subjectKey) {
            setSelectedSemester(null);
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

    // Data Fetching: Subjects, Chapters (when subjectKey selected), Topics (when chapterId selected)
    const fetchSubjects = useCallback(() => api.getSubjects(), []);
    const fetchStats = useCallback(() => api.getQuestionStats(), []);
    const fetchChapters = useCallback(
        () =>
            subjectKey != null
                ? api.getChapters(subjectKey)
                : Promise.resolve([]),
        [subjectKey],
    );
    const fetchTopics = useCallback(
        () =>
            chapterId != null
                ? api.getTopics(chapterId)
                : Promise.resolve([]),
        [chapterId],
    );
    const fetchQuestions = useCallback(
        () =>
            api.searchQuestions({
                search: debounced || undefined,
                semester:
                    subjectKey == null
                        ? (selectedSemester ?? undefined)
                        : undefined,
                subjectKey: subjectKey ?? undefined,
                chapterId: chapterId ?? undefined,
                topicId: topicId ?? undefined,
                quesType: quesType ?? undefined,
                page,
                pageSize: PAGE_SIZE,
            }),
        [debounced, selectedSemester, subjectKey, chapterId, topicId, quesType, page],
    );

    const subjectsState = useApiData<Subject[]>(fetchSubjects);
    const statsState = useApiData<QuestionStats>(fetchStats);
    const chaptersState = useApiData<Chapter[]>(
        fetchChapters,
        subjectKey !== null,
    );
    const topicsState = useApiData<Topic[]>(fetchTopics, chapterId !== null);
    const questionsState = useApiData<QuestionPage>(fetchQuestions);

    const allSortedSubjects = useMemo(
        () =>
            subjectsState.status === "success"
                ? sortSubjects(subjectsState.data)
                : [],
        [subjectsState],
    );

    // Available semesters derived from subjects
    const availableSemesters = useMemo(() => {
        const sems = new Set<number>();
        for (const sub of allSortedSubjects) {
            if (typeof sub.semester === "number" && sub.semester > 0) {
                sems.add(sub.semester);
            }
        }
        if (studentProfile?.currentSemester) {
            sems.add(studentProfile.currentSemester);
        }
        return Array.from(sems).sort((a, b) => a - b);
    }, [allSortedSubjects, studentProfile]);

    const displayedSubjects = useMemo(() => {
        if (selectedSemester === null) {
            return allSortedSubjects;
        }
        const filtered = allSortedSubjects.filter(
            (sub) => sub.semester === selectedSemester,
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
    }, [allSortedSubjects, selectedSemester, subjectKey]);

    const chapters = useMemo(
        () =>
            subjectKey !== null && chaptersState.status === "success"
                ? [...chaptersState.data].sort(
                      (a, b) => a.chapterNo - b.chapterNo,
                  )
                : [],
        [subjectKey, chaptersState],
    );

    const topics = useMemo(
        () =>
            chapterId !== null && topicsState.status === "success"
                ? topicsState.data
                : [],
        [chapterId, topicsState],
    );

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (debounced) count++;
        if (selectedSemester !== null) count++;
        if (subjectKey !== null) count++;
        if (chapterId !== null) count++;
        if (topicId !== null) count++;
        if (quesType !== null) count++;
        return count;
    }, [debounced, selectedSemester, subjectKey, chapterId, topicId, quesType]);

    const filtersActive = activeFilterCount > 0;
    const total =
        questionsState.status === "success" ? questionsState.data.total : null;
    const totalPages =
        total !== null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

    function clearFilters() {
        setSearch("");
        setDebounced("");
        setSelectedSemester(null);
        setSubjectKey(null);
        setChapterId(null);
        setTopicId(null);
        setQuesType(null);
        setPage(1);
    }

    function pickSemester(sem: number | null) {
        setSelectedSemester(sem);
        if (sem !== null && subjectKey !== null) {
            const sub = allSortedSubjects.find(
                (s) => s.subjectKey === subjectKey,
            );
            if (sub && sub.semester !== sem) {
                setSubjectKey(null);
                setChapterId(null);
                setTopicId(null);
            }
        }
        setPage(1);
    }

    function pickSubject(key: number | null) {
        setSubjectKey(key);
        setChapterId(null);
        setTopicId(null);
        setPage(1);
    }

    function pickChapter(id: number | null) {
        setChapterId(id);
        setTopicId(null);
        setPage(1);
    }

    function pickTopic(id: number | null) {
        setTopicId(id);
        setPage(1);
    }

    function pickType(type: QuestionType | null) {
        setQuesType(type);
        setPage(1);
    }

    const selectedSubjectObj = useMemo(
        () => allSortedSubjects.find((s) => s.subjectKey === subjectKey) ?? null,
        [allSortedSubjects, subjectKey],
    );
    const selectedChapterObj = useMemo(
        () => chapters.find((c) => c.chapterId === chapterId) ?? null,
        [chapters, chapterId],
    );
    const selectedTopicObj = useMemo(
        () => topics.find((t) => t.topicId === topicId) ?? null,
        [topics, topicId],
    );

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

            {/* Search Row + Filter Drawer Trigger */}
            <View style={s.searchRow}>
                <View style={s.searchBox}>
                    <Ionicons
                        name="search-outline"
                        size={18}
                        color={theme.textSecondary}
                    />
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

                <Pressable
                    onPress={() => setFilterSheetOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Open all filters"
                    style={({ pressed }) => [
                        s.filterTriggerBtn,
                        activeFilterCount > 0 && s.filterTriggerBtnActive,
                        pressed && { opacity: 0.85 },
                    ]}
                >
                    <Ionicons
                        name="options-outline"
                        size={18}
                        color={
                            activeFilterCount > 0
                                ? theme.accent
                                : theme.textSecondary
                        }
                    />
                    <Text
                        style={[
                            s.filterTriggerText,
                            activeFilterCount > 0 && {
                                color: theme.accent,
                                fontWeight: "700",
                            },
                        ]}
                    >
                        Filters
                    </Text>
                    {activeFilterCount > 0 && (
                        <View style={s.filterBadge}>
                            <Text style={s.filterBadgeText}>
                                {activeFilterCount}
                            </Text>
                        </View>
                    )}
                </Pressable>
            </View>

            {/* Semester Filter Group */}
            {availableSemesters.length > 0 && (
                <View style={s.filterGroup}>
                    <View style={s.subjectHeaderRow}>
                        <Text style={s.filterGroupLabel}>SEMESTER</Text>
                        {studentProfile?.currentSemester &&
                            selectedSemester !==
                                studentProfile.currentSemester && (
                                <Pressable
                                    onPress={() =>
                                        pickSemester(
                                            studentProfile.currentSemester,
                                        )
                                    }
                                    hitSlop={6}
                                >
                                    <Text style={s.quickActionLink}>
                                        My Semester (Sem{" "}
                                        {studentProfile.currentSemester})
                                    </Text>
                                </Pressable>
                            )}
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.pillRow}
                    >
                        <Pill
                            label="All Semesters"
                            compact
                            active={selectedSemester === null}
                            onPress={() => pickSemester(null)}
                        />
                        {availableSemesters.map((sem) => (
                            <Pill
                                key={sem}
                                label={`Sem ${sem}`}
                                compact
                                active={selectedSemester === sem}
                                onPress={() =>
                                    pickSemester(
                                        selectedSemester === sem ? null : sem,
                                    )
                                }
                            />
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Subject Filter Group */}
            <View style={s.filterGroup}>
                <View style={s.subjectHeaderRow}>
                    <Text style={s.filterGroupLabel}>
                        SUBJECT{" "}
                        {selectedSemester !== null
                            ? `(SEM ${selectedSemester})`
                            : ""}
                    </Text>
                    {subjectKey !== null && (
                        <Pressable
                            onPress={() => pickSubject(null)}
                            hitSlop={6}
                        >
                            <Text style={s.quickActionLink}>Reset Subject</Text>
                        </Pressable>
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
                                {selectedSemester}.
                            </Text>
                            <Pressable
                                onPress={() => pickSemester(null)}
                                style={s.emptySubjectAction}
                            >
                                <Text style={s.emptySubjectActionText}>
                                    Show all semesters
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

            {/* Progressive Disclosure: Chapter Filter Group (when a subject is selected) */}
            {subjectKey !== null && (
                <View style={s.filterGroup}>
                    <View style={s.subjectHeaderRow}>
                        <Text style={s.filterGroupLabel}>CHAPTER</Text>
                        {chapterId !== null && (
                            <Pressable
                                onPress={() => pickChapter(null)}
                                hitSlop={6}
                            >
                                <Text style={s.quickActionLink}>
                                    All Chapters
                                </Text>
                            </Pressable>
                        )}
                    </View>
                    {chaptersState.status === "loading" ? (
                        <Text style={s.inlineStatusText}>
                            Loading chapters...
                        </Text>
                    ) : chapters.length === 0 ? (
                        <Text style={s.inlineStatusText}>
                            No chapters listed for this subject.
                        </Text>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.pillRow}
                        >
                            <Pill
                                label="All chapters"
                                compact
                                active={chapterId === null}
                                onPress={() => pickChapter(null)}
                            />
                            {chapters.map((ch) => (
                                <Pill
                                    key={ch.chapterId}
                                    label={`Ch ${ch.chapterNo}: ${ch.chapterName}`}
                                    compact
                                    active={chapterId === ch.chapterId}
                                    onPress={() =>
                                        pickChapter(
                                            chapterId === ch.chapterId
                                                ? null
                                                : ch.chapterId,
                                        )
                                    }
                                />
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* Progressive Disclosure: Topic Filter Group (when a chapter is selected) */}
            {chapterId !== null && (
                <View style={s.filterGroup}>
                    <View style={s.subjectHeaderRow}>
                        <Text style={s.filterGroupLabel}>TOPIC</Text>
                        {topicId !== null && (
                            <Pressable
                                onPress={() => pickTopic(null)}
                                hitSlop={6}
                            >
                                <Text style={s.quickActionLink}>
                                    All Topics
                                </Text>
                            </Pressable>
                        )}
                    </View>
                    {topicsState.status === "loading" ? (
                        <Text style={s.inlineStatusText}>
                            Loading topics...
                        </Text>
                    ) : topics.length === 0 ? (
                        <Text style={s.inlineStatusText}>
                            No specific topics listed for this chapter.
                        </Text>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.pillRow}
                        >
                            <Pill
                                label="All topics"
                                compact
                                active={topicId === null}
                                onPress={() => pickTopic(null)}
                            />
                            {topics.map((t) => (
                                <Pill
                                    key={t.topicId}
                                    label={t.topicName}
                                    compact
                                    active={topicId === t.topicId}
                                    onPress={() =>
                                        pickTopic(
                                            topicId === t.topicId
                                                ? null
                                                : t.topicId,
                                        )
                                    }
                                />
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

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
                        compact
                        active={quesType === null}
                        onPress={() => pickType(null)}
                    />
                    {QUESTION_TYPES.map((type) => (
                        <Pill
                            key={type}
                            label={TYPE_META[type].short}
                            icon={TYPE_META[type].icon}
                            color={TYPE_META[type].color}
                            compact
                            active={quesType === type}
                            onPress={() =>
                                pickType(quesType === type ? null : type)
                            }
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Results Header & Active Filter Chips */}
            <View style={s.resultsHeaderBlock}>
                <View style={s.resultsHeader}>
                    <View style={{ flex: 1, minWidth: 0 }}>
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
                            <Text style={s.clearLink}>Clear all</Text>
                        </Pressable>
                    )}
                </View>

                {/* Active filter summary pills */}
                {filtersActive && (
                    <View style={s.activeSummaryRow}>
                        {selectedSemester !== null && (
                            <Pressable
                                onPress={() => pickSemester(null)}
                                style={s.activeChip}
                            >
                                <Text style={s.activeChipText}>
                                    Sem {selectedSemester}
                                </Text>
                                <Ionicons
                                    name="close"
                                    size={12}
                                    color={theme.accent}
                                />
                            </Pressable>
                        )}
                        {selectedSubjectObj && (
                            <Pressable
                                onPress={() => pickSubject(null)}
                                style={s.activeChip}
                            >
                                <Text
                                    style={s.activeChipText}
                                    numberOfLines={1}
                                >
                                    {subjectDisplayName(selectedSubjectObj)}
                                </Text>
                                <Ionicons
                                    name="close"
                                    size={12}
                                    color={theme.accent}
                                />
                            </Pressable>
                        )}
                        {selectedChapterObj && (
                            <Pressable
                                onPress={() => pickChapter(null)}
                                style={s.activeChip}
                            >
                                <Text
                                    style={s.activeChipText}
                                    numberOfLines={1}
                                >
                                    Ch {selectedChapterObj.chapterNo}:{" "}
                                    {selectedChapterObj.chapterName}
                                </Text>
                                <Ionicons
                                    name="close"
                                    size={12}
                                    color={theme.accent}
                                />
                            </Pressable>
                        )}
                        {selectedTopicObj && (
                            <Pressable
                                onPress={() => pickTopic(null)}
                                style={s.activeChip}
                            >
                                <Text
                                    style={s.activeChipText}
                                    numberOfLines={1}
                                >
                                    {selectedTopicObj.topicName}
                                </Text>
                                <Ionicons
                                    name="close"
                                    size={12}
                                    color={theme.accent}
                                />
                            </Pressable>
                        )}
                        {quesType && (
                            <Pressable
                                onPress={() => pickType(null)}
                                style={s.activeChip}
                            >
                                <Text style={s.activeChipText}>
                                    {TYPE_META[quesType].short}
                                </Text>
                                <Ionicons
                                    name="close"
                                    size={12}
                                    color={theme.accent}
                                />
                            </Pressable>
                        )}
                    </View>
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
                                        color={
                                            page <= 1 ? theme.muted : theme.text
                                        }
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
                                    <Text
                                        style={[
                                            s.pagerText,
                                            page >= totalPages && {
                                                color: theme.muted,
                                            },
                                        ]}
                                    >
                                        Next
                                    </Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color={
                                            page >= totalPages
                                                ? theme.muted
                                                : theme.text
                                        }
                                    />
                                </Pressable>
                            </View>
                        )}
                    </>
                )}

            {/* Filter Bottom Sheet for wrapped multi-category selection */}
            <FilterBottomSheet
                visible={filterSheetOpen}
                title="Filter Questions"
                subtitle="Refine by semester, subject, chapter, topic, or question type"
                activeCount={activeFilterCount}
                onClose={() => setFilterSheetOpen(false)}
                onReset={clearFilters}
            >
                {/* Semester */}
                <View style={s.sheetSection}>
                    <Text style={s.filterGroupLabel}>SEMESTER</Text>
                    <View style={s.sheetWrapGrid}>
                        <Pill
                            label="All Semesters"
                            compact
                            active={selectedSemester === null}
                            onPress={() => pickSemester(null)}
                        />
                        {availableSemesters.map((sem) => (
                            <Pill
                                key={sem}
                                label={`Sem ${sem}`}
                                compact
                                active={selectedSemester === sem}
                                onPress={() =>
                                    pickSemester(
                                        selectedSemester === sem ? null : sem,
                                    )
                                }
                            />
                        ))}
                    </View>
                </View>

                {/* Question Type */}
                <View style={s.sheetSection}>
                    <Text style={s.filterGroupLabel}>QUESTION TYPE</Text>
                    <View style={s.sheetWrapGrid}>
                        <Pill
                            label="All types"
                            compact
                            active={quesType === null}
                            onPress={() => pickType(null)}
                        />
                        {QUESTION_TYPES.map((type) => (
                            <Pill
                                key={type}
                                label={TYPE_META[type].short}
                                icon={TYPE_META[type].icon}
                                color={TYPE_META[type].color}
                                compact
                                active={quesType === type}
                                onPress={() =>
                                    pickType(quesType === type ? null : type)
                                }
                            />
                        ))}
                    </View>
                </View>

                {/* Subject */}
                <View style={s.sheetSection}>
                    <Text style={s.filterGroupLabel}>SUBJECT</Text>
                    <View style={s.sheetWrapGrid}>
                        <Pill
                            label="All subjects"
                            compact
                            active={subjectKey === null}
                            onPress={() => pickSubject(null)}
                        />
                        {displayedSubjects.map((sub) => (
                            <Pill
                                key={sub.subjectKey}
                                label={subjectDisplayName(sub)}
                                color={subjectColour(sub)}
                                compact
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
                    </View>
                </View>

                {/* Chapter */}
                {subjectKey !== null && chapters.length > 0 && (
                    <View style={s.sheetSection}>
                        <Text style={s.filterGroupLabel}>CHAPTER</Text>
                        <View style={s.sheetWrapGrid}>
                            <Pill
                                label="All chapters"
                                compact
                                active={chapterId === null}
                                onPress={() => pickChapter(null)}
                            />
                            {chapters.map((ch) => (
                                <Pill
                                    key={ch.chapterId}
                                    label={`Ch ${ch.chapterNo}: ${ch.chapterName}`}
                                    compact
                                    active={chapterId === ch.chapterId}
                                    onPress={() =>
                                        pickChapter(
                                            chapterId === ch.chapterId
                                                ? null
                                                : ch.chapterId,
                                        )
                                    }
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Topic */}
                {chapterId !== null && topics.length > 0 && (
                    <View style={s.sheetSection}>
                        <Text style={s.filterGroupLabel}>TOPIC</Text>
                        <View style={s.sheetWrapGrid}>
                            <Pill
                                label="All topics"
                                compact
                                active={topicId === null}
                                onPress={() => pickTopic(null)}
                            />
                            {topics.map((t) => (
                                <Pill
                                    key={t.topicId}
                                    label={t.topicName}
                                    compact
                                    active={topicId === t.topicId}
                                    onPress={() =>
                                        pickTopic(
                                            topicId === t.topicId
                                                ? null
                                                : t.topicId,
                                        )
                                    }
                                />
                            ))}
                        </View>
                    </View>
                )}
            </FilterBottomSheet>
        </View>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        container: { gap: 16, width: "100%" },
        header: { gap: 4, marginBottom: 4 },
        title: {
            color: t.text,
            fontSize: 22,
            fontWeight: "800",
            letterSpacing: -0.3,
        },
        subtitle: { color: t.textSecondary, fontSize: 13, lineHeight: 18 },
        searchRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
        },
        searchBox: {
            flex: 1,
            minWidth: 0,
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
            minWidth: 0,
            color: t.text,
            fontSize: 13,
            padding: 0,
        },
        filterTriggerBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            height: 44,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            flexShrink: 0,
        },
        filterTriggerBtnActive: {
            backgroundColor: t.accentSoft,
            borderColor: t.accent,
        },
        filterTriggerText: {
            fontSize: 13,
            fontWeight: "600",
            color: t.textSecondary,
        },
        filterBadge: {
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: t.accent,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 5,
        },
        filterBadgeText: {
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "800",
        },
        filterGroup: {
            gap: 7,
        },
        filterGroupLabel: {
            color: t.textSecondary,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.8,
        },
        quickActionLink: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "700",
        },
        inlineStatusText: {
            color: t.muted,
            fontSize: 12,
            fontStyle: "italic",
        },
        pillRow: {
            gap: 8,
            paddingRight: 8,
        },
        subjectHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
        },
        emptySubjectNotice: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            padding: 12,
            borderRadius: 10,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        emptySubjectText: {
            color: t.textSecondary,
            fontSize: 12,
            flex: 1,
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
        resultsHeaderBlock: {
            gap: 10,
            marginTop: 4,
            paddingBottom: 2,
        },
        resultsHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
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
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: t.accentSoft,
            flexShrink: 0,
        },
        clearLink: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "700",
        },
        activeSummaryRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
        activeChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: t.accentSoft,
            borderWidth: 1,
            borderColor: t.accent + "33",
            maxWidth: 240,
        },
        activeChipText: {
            color: t.accent,
            fontSize: 11,
            fontWeight: "700",
            flexShrink: 1,
        },
        pager: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: t.border,
            gap: 8,
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
        sheetSection: {
            gap: 10,
        },
        sheetWrapGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
    });
}
