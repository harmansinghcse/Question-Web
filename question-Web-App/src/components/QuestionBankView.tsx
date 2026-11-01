import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
    Keyboard,
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    UIManager,
    useWindowDimensions,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
    EmptyBlock,
    ErrorBlock,
    FilterBottomSheet,
    LoadingBlock,
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
    subjectDisplayName,
} from "../constants/subjects";
import type { AppTheme } from "../constants/theme";

if (
    Platform.OS === "android" &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ==========================================
   CONSTANTS & UTILS
========================================== */

const PAGE_SIZE = 10;
const MAX_FONT_SCALE = 1.3;
const WIDE_BREAKPOINT = 768;
const CONTENT_MAX_WIDTH = 960;

type Styles = ReturnType<typeof makeStyles>;

function asType(value?: string): QuestionType | null {
    return QUESTION_TYPES.find((t) => t === value) ?? null;
}

/* ==========================================
   CUSTOM DROPDOWN COMPONENTS
========================================== */

function CustomDropdown({
    label,
    value,
    onValueChange,
    items,
    placeholder = "Select an option",
    s,
    theme,
}: {
    label: string;
    value: string | number | null;
    onValueChange: (val: string) => void;
    items: { label: string; value: string }[];
    placeholder?: string;
    s: Styles;
    theme: AppTheme;
}) {
    const [open, setOpen] = useState(false);
    const selectedItem = items.find((i) => i.value === String(value));

    return (
        <View style={s.dropdownContainer}>
            <Text
                style={s.dropdownLabel}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
                {label}
            </Text>
            <Pressable
                style={[s.dropdownHeader, open && s.dropdownHeaderActive]}
                onPress={() => {
                    LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut,
                    );
                    setOpen(!open);
                }}
            >
                <Text
                    style={
                        selectedItem
                            ? s.dropdownHeaderText
                            : s.dropdownPlaceholder
                    }
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                    numberOfLines={1}
                >
                    {selectedItem ? selectedItem.label : placeholder}
                </Text>
                <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={theme.textSecondary}
                />
            </Pressable>

            {open && (
                <View style={s.dropdownList}>
                    {items.length === 0 ? (
                        <Text style={s.dropdownEmptyText}>
                            No options available.
                        </Text>
                    ) : (
                        items.map((item) => {
                            const isSelected = item.value === String(value);
                            return (
                                <Pressable
                                    key={item.value}
                                    style={[
                                        s.dropdownItem,
                                        isSelected && s.dropdownItemSelected,
                                    ]}
                                    onPress={() => {
                                        onValueChange(item.value);
                                        LayoutAnimation.configureNext(
                                            LayoutAnimation.Presets
                                                .easeInEaseOut,
                                        );
                                        setOpen(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            s.dropdownItemText,
                                            isSelected &&
                                                s.dropdownItemTextSelected,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {isSelected && (
                                        <Ionicons
                                            name="checkmark"
                                            size={18}
                                            color={theme.text}
                                        />
                                    )}
                                </Pressable>
                            );
                        })
                    )}
                </View>
            )}
        </View>
    );
}

function MultiSelectDropdown({
    label,
    selectedValues,
    onToggleValue,
    items,
    placeholder = "Select options",
    s,
    theme,
}: {
    label: string;
    selectedValues: number[];
    onToggleValue: (val: number) => void;
    items: { label: string; value: number }[];
    placeholder?: string;
    s: Styles;
    theme: AppTheme;
}) {
    const [open, setOpen] = useState(false);

    return (
        <View style={s.dropdownContainer}>
            <Text
                style={s.dropdownLabel}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
                {label}
            </Text>
            <Pressable
                style={[s.dropdownHeader, open && s.dropdownHeaderActive]}
                onPress={() => {
                    LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut,
                    );
                    setOpen(!open);
                }}
            >
                <Text
                    style={
                        selectedValues.length > 0
                            ? s.dropdownHeaderText
                            : s.dropdownPlaceholder
                    }
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                    numberOfLines={1}
                >
                    {selectedValues.length === 0
                        ? placeholder
                        : `${selectedValues.length} selected`}
                </Text>
                <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={theme.textSecondary}
                />
            </Pressable>

            {open && (
                <View style={s.dropdownList}>
                    {items.length === 0 ? (
                        <Text style={s.dropdownEmptyText}>
                            No options available.
                        </Text>
                    ) : (
                        items.map((item) => {
                            const isSelected = selectedValues.includes(
                                item.value,
                            );
                            return (
                                <Pressable
                                    key={item.value}
                                    style={s.dropdownItem}
                                    onPress={() => onToggleValue(item.value)}
                                >
                                    <View
                                        style={[
                                            s.checkbox,
                                            isSelected && s.checkboxSelected,
                                        ]}
                                    >
                                        {isSelected && (
                                            <Ionicons
                                                name="checkmark"
                                                size={14}
                                                color="#FFF"
                                            />
                                        )}
                                    </View>
                                    <Text
                                        style={[
                                            s.dropdownItemText,
                                            isSelected &&
                                                s.dropdownItemTextSelected,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                </Pressable>
                            );
                        })
                    )}
                </View>
            )}
        </View>
    );
}

/* ==========================================
   MAIN VIEW
========================================== */

export default function QuestionBankView({
    showHeader = true,
    onPageChange,
}: {
    showHeader?: boolean;
    onPageChange?: () => void;
}) {
    const { theme } = useAppTheme();
    const { user } = useAuth();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const { width: windowWidth } = useWindowDimensions();
    const isWide = windowWidth >= WIDE_BREAKPOINT;

    const params = useLocalSearchParams<{
        q?: string;
        subjectKey?: string;
        type?: string;
    }>();
    const studentProfile = useMemo(
        () => (user?.email ? parseStudentEmail(user.email) : null),
        [user],
    );

    /* ----- Search State ----- */
    const [search, setSearch] = useState(params.q ?? "");
    const [debouncedSearch, setDebouncedSearch] = useState(
        (params.q ?? "").trim(),
    );
    const [searchFocused, setSearchFocused] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const id = setTimeout(() => {
            setDebouncedSearch((prev) => {
                const next = search.trim();
                if (next !== prev) setPage(1);
                return next;
            });
        }, 300);
        return () => clearTimeout(id);
    }, [search]);

    /* ----- Active Filters State (Controls API requests) ----- */
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
    const [topicIds, setTopicIds] = useState<number[]>([]);
    const [quesType, setQuesType] = useState<QuestionType | null>(
        asType(params.type),
    );

    /* ----- Draft Filters State (Controls the dropdown modal) ----- */
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [draftSemester, setDraftSemester] = useState<number | null>(
        selectedSemester,
    );
    const [draftSubjectKey, setDraftSubjectKey] = useState<number | null>(
        subjectKey,
    );
    const [draftChapterId, setDraftChapterId] = useState<number | null>(
        chapterId,
    );
    const [draftTopicIds, setDraftTopicIds] = useState<number[]>(topicIds);
    const [draftQuesType, setDraftQuesType] = useState<QuestionType | null>(
        quesType,
    );

    /* ----- Data Fetching ----- */
    const subjectsState = useApiData<Subject[]>(
        useCallback(() => api.getSubjects(), []),
    );
    const statsState = useApiData<QuestionStats>(
        useCallback(() => api.getQuestionStats(), []),
    );

    // Dynamic fetch for chapters & topics based on DRAFT selections to populate dropdowns interactively
    const fetchChapters = useCallback(
        () =>
            draftSubjectKey != null
                ? api.getChapters(draftSubjectKey)
                : Promise.resolve([]),
        [draftSubjectKey],
    );
    const chaptersState = useApiData<Chapter[]>(
        fetchChapters,
        draftSubjectKey !== null,
    );

    const fetchTopics = useCallback(
        () =>
            draftChapterId != null
                ? api.getTopics(draftChapterId)
                : Promise.resolve([]),
        [draftChapterId],
    );
    const topicsState = useApiData<Topic[]>(
        fetchTopics,
        draftChapterId !== null,
    );

    // Primary question fetch relies on ACTIVE selections
    const fetchQuestions = useCallback(
        () =>
            api.searchQuestions({
                search: debouncedSearch || undefined,
                semester:
                    subjectKey == null
                        ? (selectedSemester ?? undefined)
                        : undefined,
                subjectKey: subjectKey ?? undefined,
                chapterId: chapterId ?? undefined,
                topicId:
                    topicIds.length > 0
                        ? (topicIds.join(",") as any)
                        : undefined,
                quesType: quesType ?? undefined,
                page,
                pageSize: PAGE_SIZE,
            }),
        [
            debouncedSearch,
            selectedSemester,
            subjectKey,
            chapterId,
            topicIds,
            quesType,
            page,
        ],
    );
    const questionsState = useApiData<QuestionPage>(fetchQuestions);

    /* ----- Derived Filter Data (For Draft Selections) ----- */
    const allSortedSubjects = useMemo(
        () =>
            subjectsState.status === "success"
                ? sortSubjects(subjectsState.data)
                : [],
        [subjectsState],
    );

    const availableSemesters = useMemo(() => {
        const sems = new Set<number>();
        allSortedSubjects.forEach((sub) => {
            if (sub.semester && sub.semester > 0) sems.add(sub.semester);
        });
        if (studentProfile?.currentSemester)
            sems.add(studentProfile.currentSemester);
        return Array.from(sems).sort((a, b) => a - b);
    }, [allSortedSubjects, studentProfile]);

    const displayedSubjects = useMemo(() => {
        if (draftSemester === null) return allSortedSubjects;
        return allSortedSubjects.filter(
            (sub) => sub.semester === draftSemester,
        );
    }, [allSortedSubjects, draftSemester]);

    const chapters = useMemo(
        () =>
            draftSubjectKey !== null && chaptersState.status === "success"
                ? [...chaptersState.data].sort(
                      (a, b) => a.chapterNo - b.chapterNo,
                  )
                : [],
        [draftSubjectKey, chaptersState],
    );

    const topics = useMemo(
        () =>
            draftChapterId !== null && topicsState.status === "success"
                ? topicsState.data
                : [],
        [draftChapterId, topicsState],
    );

    /* ----- Counters & Meta ----- */
    const activeFilterCount =
        (debouncedSearch ? 1 : 0) +
        (selectedSemester !== null ? 1 : 0) +
        (subjectKey !== null ? 1 : 0) +
        (chapterId !== null ? 1 : 0) +
        (topicIds.length > 0 ? 1 : 0) +
        (quesType !== null ? 1 : 0);

    const total =
        questionsState.status === "success" ? questionsState.data.total : null;
    const totalPages =
        total !== null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

    /* ----- Actions ----- */
    const openFilterPanel = () => {
        setDraftSemester(selectedSemester);
        setDraftSubjectKey(subjectKey);
        setDraftChapterId(chapterId);
        setDraftTopicIds(topicIds);
        setDraftQuesType(quesType);
        Keyboard.dismiss();
        setFilterSheetOpen(true);
    };

    const resetDraftFilters = () => {
        setDraftSemester(null);
        setDraftSubjectKey(null);
        setDraftChapterId(null);
        setDraftTopicIds([]);
        setDraftQuesType(null);
    };

    const applyFilters = () => {
        setSelectedSemester(draftSemester);
        setSubjectKey(draftSubjectKey);
        setChapterId(draftChapterId);
        setTopicIds(draftTopicIds);
        setQuesType(draftQuesType);
        setPage(1);
        setFilterSheetOpen(false);
    };

    /* ----- Draft Handlers ----- */
    const handleDraftSemesterChange = (val: string) => {
        const sem = val ? Number(val) : null;
        setDraftSemester(sem);
        if (sem !== null && draftSubjectKey !== null) {
            const sub = allSortedSubjects.find(
                (x) => x.subjectKey === draftSubjectKey,
            );
            if (sub && sub.semester !== sem) {
                setDraftSubjectKey(null);
                setDraftChapterId(null);
                setDraftTopicIds([]);
            }
        }
    };

    const handleDraftSubjectChange = (val: string) => {
        setDraftSubjectKey(val ? Number(val) : null);
        setDraftChapterId(null);
        setDraftTopicIds([]);
    };

    const handleDraftChapterChange = (val: string) => {
        setDraftChapterId(val ? Number(val) : null);
        setDraftTopicIds([]);
    };

    const handleDraftTopicToggle = (id: number) => {
        setDraftTopicIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    /* ----- Render ----- */
    return (
        <View style={[s.container, isWide && s.containerWide]}>
            {/* Header */}
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

            {/* Search Bar & Filter Toggle */}
            <View style={s.searchRow}>
                <View
                    style={[s.searchBox, searchFocused && s.searchBoxFocused]}
                >
                    <Ionicons
                        name="search-outline"
                        size={20}
                        color={theme.textSecondary}
                    />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search questions"
                        placeholderTextColor={theme.muted}
                        returnKeyType="search"
                        onSubmitEditing={Keyboard.dismiss}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        autoCorrect={false}
                        autoCapitalize="none"
                        style={s.searchInput}
                    />
                    {search.length > 0 && (
                        <Pressable
                            onPress={() => {
                                setSearch("");
                                setDebouncedSearch("");
                                setPage(1);
                            }}
                            hitSlop={12}
                        >
                            <Ionicons
                                name="close-circle"
                                size={20}
                                color={theme.muted}
                            />
                        </Pressable>
                    )}
                </View>

                <Pressable
                    onPress={openFilterPanel}
                    style={({ pressed }) => [
                        s.filterButton,
                        isWide && s.filterButtonWide,
                        activeFilterCount > 0 && s.filterButtonActive,
                        pressed && { opacity: 0.8 },
                    ]}
                >
                    <Ionicons
                        name="options-outline"
                        size={22}
                        color={
                            activeFilterCount > 0
                                ? theme.text
                                : theme.textSecondary
                        }
                    />
                    {isWide && (
                        <Text
                            style={[
                                s.filterButtonText,
                                activeFilterCount > 0 && { color: theme.text },
                            ]}
                        >
                            Filters
                        </Text>
                    )}
                    {activeFilterCount > 0 && (
                        <View
                            style={[
                                s.filterBadge,
                                isWide && s.filterBadgeInline,
                            ]}
                        >
                            <Text style={s.filterBadgeText}>
                                {activeFilterCount}
                            </Text>
                        </View>
                    )}
                </Pressable>
            </View>

            {/* Results Header (Count) - NO PILLS OR CHIPS ANYWHERE */}
            <View style={s.resultsHeaderBlock}>
                <Text style={s.resultsTitle}>
                    {total === null
                        ? "All questions"
                        : `${total.toLocaleString()} found`}
                </Text>
                {total !== null && totalPages > 1 && (
                    <Text style={s.resultsSub}>
                        Page {page} of {totalPages}
                    </Text>
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
                            activeFilterCount > 0
                                ? "Try a broader search or adjust your filters."
                                : "The question bank has no questions yet."
                        }
                    />
                )}

            {questionsState.status === "success" &&
                questionsState.data.items.length > 0 && (
                    <>
                        <View style={s.questionList}>
                            {questionsState.data.items.map((q) => (
                                <QuestionCard key={q.quesId} question={q} />
                            ))}
                        </View>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <View style={s.pager}>
                                <Pressable
                                    onPress={() => {
                                        setPage(page - 1);
                                        onPageChange?.();
                                    }}
                                    disabled={page <= 1}
                                    style={[
                                        s.pagerButton,
                                        page <= 1 && s.pagerDisabled,
                                    ]}
                                >
                                    <Ionicons
                                        name="chevron-back"
                                        size={18}
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
                                    {page} / {totalPages}
                                </Text>
                                <Pressable
                                    onPress={() => {
                                        setPage(page + 1);
                                        onPageChange?.();
                                    }}
                                    disabled={page >= totalPages}
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
                                        size={18}
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

            {/* Vertically Stacked Dropdown Filter Panel */}
            <FilterBottomSheet
                visible={filterSheetOpen}
                title="Filter Questions"
                subtitle="Select from the dropdowns below to refine results"
                activeCount={0}
                onClose={() => setFilterSheetOpen(false)}
                onReset={resetDraftFilters}
                // hideDefaultReset // Hides legacy pill reset if component supports it
            >
                <ScrollView
                    contentContainerStyle={s.filterPanelContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <CustomDropdown
                        label="Semester"
                        value={
                            draftSemester !== null ? String(draftSemester) : ""
                        }
                        onValueChange={handleDraftSemesterChange}
                        items={[
                            { label: "All Semesters", value: "" },
                            ...availableSemesters.map((sem) => ({
                                label: `Semester ${sem}`,
                                value: String(sem),
                            })),
                        ]}
                        placeholder="All Semesters"
                        s={s}
                        theme={theme}
                    />

                    <CustomDropdown
                        label="Subject"
                        value={
                            draftSubjectKey !== null
                                ? String(draftSubjectKey)
                                : ""
                        }
                        onValueChange={handleDraftSubjectChange}
                        items={[
                            { label: "All Subjects", value: "" },
                            ...displayedSubjects.map((sub) => ({
                                label: subjectDisplayName(sub),
                                value: String(sub.subjectKey),
                            })),
                        ]}
                        placeholder="All Subjects"
                        s={s}
                        theme={theme}
                    />

                    <CustomDropdown
                        label="Chapter"
                        value={
                            draftChapterId !== null
                                ? String(draftChapterId)
                                : ""
                        }
                        onValueChange={handleDraftChapterChange}
                        items={[
                            { label: "All Chapters", value: "" },
                            ...chapters.map((ch) => ({
                                label: `Ch ${ch.chapterNo}: ${ch.chapterName}`,
                                value: String(ch.chapterId),
                            })),
                        ]}
                        placeholder={
                            draftSubjectKey === null
                                ? "Select a subject first"
                                : "All Chapters"
                        }
                        s={s}
                        theme={theme}
                    />

                    <MultiSelectDropdown
                        label="Topics"
                        selectedValues={draftTopicIds}
                        onToggleValue={handleDraftTopicToggle}
                        items={topics.map((t) => ({
                            label: t.topicName,
                            value: t.topicId,
                        }))}
                        placeholder={
                            draftChapterId === null
                                ? "Select a chapter first"
                                : "Select topics..."
                        }
                        s={s}
                        theme={theme}
                    />

                    <CustomDropdown
                        label="Question Type"
                        value={draftQuesType ?? ""}
                        onValueChange={(val) => setDraftQuesType(asType(val))}
                        items={[
                            { label: "All Types", value: "" },
                            ...QUESTION_TYPES.map((type) => ({
                                label: TYPE_META[type].label,
                                value: type,
                            })),
                        ]}
                        placeholder="All Types"
                        s={s}
                        theme={theme}
                    />
                </ScrollView>

                {/* Explicit Bottom Actions */}
                <View style={s.filterActionsPanel}>
                    <Pressable
                        onPress={resetDraftFilters}
                        style={s.resetPanelBtn}
                    >
                        <Text style={s.resetPanelBtnText}>Reset</Text>
                    </Pressable>
                    <Pressable onPress={applyFilters} style={s.applyPanelBtn}>
                        <Text style={s.applyPanelBtnText}>Apply Filters</Text>
                    </Pressable>
                </View>
            </FilterBottomSheet>
        </View>
    );
}

/* ==========================================
   STYLES
========================================== */

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        container: { gap: 20, width: "100%" },
        containerWide: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },

        header: { gap: 6 },
        title: {
            color: t.text,
            fontSize: 26,
            fontWeight: "800",
            letterSpacing: -0.4,
        },
        subtitle: { color: t.textSecondary, fontSize: 14, lineHeight: 20 },

        searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
        searchBox: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            height: 50,
            borderRadius: 14,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        searchBoxFocused: { borderColor: t.accent },
        searchInput: {
            flex: 1,
            color: t.text,
            fontSize: 16,
            padding: 0,
            ...(Platform.OS === "web" ? ({ outlineWidth: 0 } as any) : {}),
        },

        filterButton: {
            width: 50,
            height: 50,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        filterButtonActive: {
            backgroundColor: t.surface,
            borderColor: t.accent,
        },
        filterButtonWide: {
            width: "auto",
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: 16,
        },
        filterButtonText: {
            color: t.textSecondary,
            fontSize: 14,
            fontWeight: "600",
        },

        filterBadge: {
            position: "absolute",
            top: -7,
            right: -7,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: t.accent,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: t.surface,
        },
        filterBadgeInline: {
            position: "relative",
            top: 0,
            right: 0,
            borderWidth: 0,
        },
        filterBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800" },

        resultsHeaderBlock: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
        },
        resultsTitle: {
            color: t.text,
            fontSize: 18,
            fontWeight: "700",
            letterSpacing: -0.2,
        },
        resultsSub: { color: t.textSecondary, fontSize: 13 },

        questionList: { gap: 14 },

        pager: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 16,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: t.border,
            gap: 8,
        },
        pagerButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            minHeight: 44,
            minWidth: 104,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            justifyContent: "center",
        },
        pagerDisabled: { opacity: 0.45 },
        pagerText: { color: t.text, fontSize: 14, fontWeight: "600" },
        pagerInfo: { color: t.textSecondary, fontSize: 14, fontWeight: "600" },

        /* --- Dropdown Styles (No external libraries) --- */
        filterPanelContent: {
            gap: 20,
            paddingVertical: 10,
        },
        dropdownContainer: {
            gap: 8,
        },
        dropdownLabel: {
            color: t.text,
            fontSize: 13,
            fontWeight: "700",
            letterSpacing: 0.2,
            marginLeft: 2,
        },
        dropdownHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.borderStrong,
            borderRadius: 10,
            paddingHorizontal: 14,
            height: 52,
        },
        dropdownHeaderActive: {
            borderColor: t.accent,
        },
        dropdownHeaderText: {
            color: t.text,
            fontSize: 15,
            fontWeight: "500",
            flex: 1,
            paddingRight: 10,
        },
        dropdownPlaceholder: {
            color: t.muted,
            fontSize: 15,
            flex: 1,
        },
        dropdownList: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.borderStrong,
            borderRadius: 10,
            marginTop: 4,
            overflow: "hidden",
            maxHeight: 240, // Keeps long lists scrollable inline
        },
        dropdownEmptyText: {
            padding: 14,
            color: t.muted,
            fontSize: 14,
            textAlign: "center",
        },
        dropdownItem: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: t.border,
        },
        dropdownItemSelected: {
            backgroundColor: t.surfaceAlt,
        },
        dropdownItemText: {
            color: t.text,
            fontSize: 14,
            flex: 1,
            paddingRight: 10,
        },
        dropdownItemTextSelected: {
            fontWeight: "700",
            color: t.text,
        },

        /* Multi-select Checkbox */
        checkbox: {
            width: 20,
            height: 20,
            borderRadius: 5,
            borderWidth: 1.5,
            borderColor: t.muted,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
        },
        checkboxSelected: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },

        /* Panel Bottom Action Buttons */
        filterActionsPanel: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: t.border,
        },
        resetPanelBtn: {
            flex: 1,
            height: 50,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        resetPanelBtnText: {
            color: t.text,
            fontSize: 15,
            fontWeight: "700",
        },
        applyPanelBtn: {
            flex: 2,
            height: 50,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: t.accent,
        },
        applyPanelBtnText: {
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: "800",
        },
    });
}
