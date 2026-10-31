import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AppShell from "../components/AppShell";
import { SearchBar } from "../components/ui";
import {
    parseStudentEmail,
    sortSubjects,
    subjectColour,
    subjectDisplayName,
    subjectIcon,
} from "../constants/subjects";
import type { AppTheme } from "../constants/theme";
import { useApiData } from "../hooks/use-api-data";
import { useAuth } from "../providers/AuthProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import {
    api,
    type Chapter,
    type Department,
    type Subject,
    type Topic,
} from "../services/api";

const SP = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
} as const;

type SliceState<T> =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; data: T };

function pickDefaultDeptId(
    departments: Department[],
    deptCode: string | null | undefined,
): number | null {
    if (departments.length === 0) return null;
    if (deptCode) {
        const needle = deptCode.toLowerCase();
        const match = departments.find((d) => {
            const name = d.deptName.toLowerCase();
            if (needle === "co") {
                return (
                    name.includes("computer") ||
                    name.includes("cse") ||
                    name === "co"
                );
            }
            return name.includes(needle);
        });
        if (match) return match.deptId;
    }
    return departments[0].deptId;
}

export default function SyllabusScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const { user } = useAuth();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const studentProfile = useMemo(
        () => (user?.email ? parseStudentEmail(user.email) : null),
        [user],
    );

    const fetchDepartments = useCallback(() => api.getDepartments(), []);
    const departmentsState = useApiData<Department[]>(fetchDepartments);

    const fetchAllSubjects = useCallback(() => api.getSubjects(), []);
    const allSubjectsState = useApiData<Subject[]>(fetchAllSubjects);

    const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
    const [semesterFilter, setSemesterFilter] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedSubjects, setExpandedSubjects] = useState<
        Record<number, boolean>
    >({});
    const [expandedChapters, setExpandedChapters] = useState<
        Record<number, boolean>
    >({});
    const [chaptersBySubject, setChaptersBySubject] = useState<
        Record<number, SliceState<Chapter[]>>
    >({});
    const [topicsByChapter, setTopicsByChapter] = useState<
        Record<number, SliceState<Topic[]>>
    >({});

    const departments = useMemo(
        () =>
            departmentsState.status === "success" ? departmentsState.data : [],
        [departmentsState],
    );

    const activeDeptId = useMemo(() => {
        if (selectedDeptId !== null) return selectedDeptId;
        return pickDefaultDeptId(departments, studentProfile?.deptCode);
    }, [selectedDeptId, departments, studentProfile]);

    const activeDepartment = useMemo(
        () => departments.find((d) => d.deptId === activeDeptId) ?? null,
        [departments, activeDeptId],
    );

    const deptSubjects = useMemo(() => {
        if (allSubjectsState.status !== "success") return [];
        const filtered =
            activeDeptId === null
                ? allSubjectsState.data
                : allSubjectsState.data.filter(
                      (sub) => sub.deptId === activeDeptId,
                  );
        return sortSubjects(filtered);
    }, [allSubjectsState, activeDeptId]);

    const availableSemesters = useMemo(() => {
        const set = new Set<number>();
        for (const sub of deptSubjects) {
            if (typeof sub.semester === "number") {
                set.add(sub.semester);
            }
        }
        return Array.from(set).sort((a, b) => a - b);
    }, [deptSubjects]);

    const visibleSubjects = useMemo(() => {
        let base = deptSubjects;
        if (semesterFilter !== null) {
            base = base.filter((sub) => sub.semester === semesterFilter);
        }
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            base = base.filter(
                (sub) =>
                    (sub.subjectName ?? "").toLowerCase().includes(q) ||
                    sub.subjectId.toLowerCase().includes(q),
            );
        }
        return base;
    }, [deptSubjects, semesterFilter, searchQuery]);

    const groupedBySemester = useMemo(() => {
        const groups = new Map<number | "other", Subject[]>();
        for (const sub of visibleSubjects) {
            const key =
                typeof sub.semester === "number" ? sub.semester : "other";
            const bucket = groups.get(key);
            if (bucket) {
                bucket.push(sub);
            } else {
                groups.set(key, [sub]);
            }
        }
        return Array.from(groups.entries()).sort(([a], [b]) => {
            if (a === "other") return 1;
            if (b === "other") return -1;
            return a - b;
        });
    }, [visibleSubjects]);

    const loadChapters = useCallback(async (subjectKey: number) => {
        setChaptersBySubject((prev) => ({
            ...prev,
            [subjectKey]: { status: "loading" },
        }));
        try {
            const chapters = await api.getChapters(subjectKey);
            const sorted = [...chapters].sort(
                (a, b) =>
                    (a.chapterNumber ?? a.chapterNo ?? a.chapterId) -
                    (b.chapterNumber ?? b.chapterNo ?? b.chapterId),
            );
            setChaptersBySubject((prev) => ({
                ...prev,
                [subjectKey]: { status: "success", data: sorted },
            }));
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to load chapters";
            setChaptersBySubject((prev) => ({
                ...prev,
                [subjectKey]: { status: "error", message },
            }));
        }
    }, []);

    const loadTopics = useCallback(async (chapterId: number) => {
        setTopicsByChapter((prev) => ({
            ...prev,
            [chapterId]: { status: "loading" },
        }));
        try {
            const topics = await api.getTopics(chapterId);
            setTopicsByChapter((prev) => ({
                ...prev,
                [chapterId]: { status: "success", data: topics },
            }));
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to load topics";
            setTopicsByChapter((prev) => ({
                ...prev,
                [chapterId]: { status: "error", message },
            }));
        }
    }, []);

    const toggleSubject = useCallback(
        (subjectKey: number) => {
            setExpandedSubjects((prev) => {
                const nextOpen = !prev[subjectKey];
                if (nextOpen && !chaptersBySubject[subjectKey]) {
                    void loadChapters(subjectKey);
                }
                return { ...prev, [subjectKey]: nextOpen };
            });
        },
        [chaptersBySubject, loadChapters],
    );

    const toggleChapter = useCallback(
        (chapterId: number) => {
            setExpandedChapters((prev) => {
                const nextOpen = !prev[chapterId];
                if (nextOpen && !topicsByChapter[chapterId]) {
                    void loadTopics(chapterId);
                }
                return { ...prev, [chapterId]: nextOpen };
            });
        },
        [topicsByChapter, loadTopics],
    );

    const selectDepartment = (deptId: number) => {
        setSelectedDeptId(deptId);
        setSemesterFilter(null);
    };

    const isLoadingInitial =
        departmentsState.status === "loading" ||
        allSubjectsState.status === "loading";
    const initialError =
        departmentsState.status === "error"
            ? departmentsState.message
            : allSubjectsState.status === "error"
              ? allSubjectsState.message
              : null;

    const retryInitial = () => {
        departmentsState.refresh();
        allSubjectsState.refresh();
    };

    const hasActiveFilters = semesterFilter !== null || searchQuery.trim().length > 0;

    return (
        <AppShell active="syllabus">
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={s.backBtn}
                        hitSlop={8}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={20}
                            color={theme.text}
                        />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={s.eyebrow}>COURSE CURRICULUM</Text>
                        <Text style={s.title}>Syllabus</Text>
                    </View>
                    <Pressable
                        onPress={() => router.push("/syllabus-tracker" as never)}
                        style={s.trackerBannerBtn}
                    >
                        <Ionicons
                            name="git-network-outline"
                            size={15}
                            color="#FFFFFF"
                        />
                        <Text style={s.trackerBannerBtnText}>
                            Open Tracker
                        </Text>
                    </Pressable>
                </View>

                <Text style={s.subtitle}>
                    Select your department and semester to explore subjects,
                    chapters, and topics.
                </Text>

                {/* Department Selector */}
                {departments.length > 0 && (
                    <View style={s.sectionBlock}>
                        <Text style={s.filterLabel}>DEPARTMENT</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.pillRow}
                        >
                            {departments.map((dept) => {
                                const active = dept.deptId === activeDeptId;
                                return (
                                    <Pressable
                                        key={dept.deptId}
                                        onPress={() =>
                                            selectDepartment(dept.deptId)
                                        }
                                        style={[
                                            s.deptCard,
                                            active && s.deptCardActive,
                                        ]}
                                    >
                                        <View
                                            style={[
                                                s.deptIconWrap,
                                                active && s.deptIconWrapActive,
                                            ]}
                                        >
                                            <Ionicons
                                                name="school-outline"
                                                size={16}
                                                color={
                                                    active
                                                        ? "#FFFFFF"
                                                        : theme.accent
                                                }
                                            />
                                        </View>
                                        <Text
                                            style={[
                                                s.deptText,
                                                active && s.deptTextActive,
                                            ]}
                                        >
                                            {dept.deptName}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Search Bar */}
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search subjects by name or code (e.g. CS201, Operating Systems)..."
                />

                {/* Semester Filter */}
                {availableSemesters.length > 0 && (
                    <View style={s.sectionBlock}>
                        <View style={s.filterHeaderRow}>
                            <Text style={s.filterLabel}>SEMESTER</Text>
                            {hasActiveFilters && (
                                <Pressable
                                    onPress={() => {
                                        setSemesterFilter(null);
                                        setSearchQuery("");
                                    }}
                                    hitSlop={8}
                                >
                                    <Text style={s.clearFiltersText}>Clear filters</Text>
                                </Pressable>
                            )}
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.pillRow}
                        >
                            {studentProfile?.currentSemester &&
                                availableSemesters.includes(
                                    studentProfile.currentSemester,
                                ) && (
                                    <Pressable
                                        onPress={() =>
                                            setSemesterFilter(
                                                semesterFilter ===
                                                    studentProfile.currentSemester
                                                    ? null
                                                    : studentProfile.currentSemester,
                                            )
                                        }
                                        style={[
                                            s.semPill,
                                            semesterFilter ===
                                                studentProfile.currentSemester &&
                                                s.semPillActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                s.semPillText,
                                                semesterFilter ===
                                                    studentProfile.currentSemester &&
                                                    s.semPillTextActive,
                                            ]}
                                        >
                                            ★ Sem{" "}
                                            {studentProfile.currentSemester}{" "}
                                            (My Sem)
                                        </Text>
                                    </Pressable>
                                )}
                            <Pressable
                                onPress={() => setSemesterFilter(null)}
                                style={[
                                    s.semPill,
                                    semesterFilter === null && s.semPillActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        s.semPillText,
                                        semesterFilter === null &&
                                            s.semPillTextActive,
                                    ]}
                                >
                                    All Semesters ({deptSubjects.length})
                                </Text>
                            </Pressable>
                            {availableSemesters.map((sem) => {
                                const active = semesterFilter === sem;
                                return (
                                    <Pressable
                                        key={sem}
                                        onPress={() =>
                                            setSemesterFilter(
                                                active ? null : sem,
                                            )
                                        }
                                        style={[
                                            s.semPill,
                                            active && s.semPillActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                s.semPillText,
                                                active && s.semPillTextActive,
                                            ]}
                                        >
                                            Semester {sem}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Content */}
                {isLoadingInitial && (
                    <View style={s.centerCard}>
                        <ActivityIndicator size="large" color={theme.accent} />
                        <Text style={s.mutedText}>Loading syllabus...</Text>
                    </View>
                )}

                {!isLoadingInitial && initialError && (
                    <View style={s.errorCard}>
                        <Ionicons
                            name="alert-circle-outline"
                            size={24}
                            color={theme.danger}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={s.errorTitle}>
                                Couldn&apos;t load syllabus
                            </Text>
                            <Text style={s.errorMessage}>{initialError}</Text>
                        </View>
                        <Pressable onPress={retryInitial} style={s.retryButton}>
                            <Text style={s.retryText}>Retry</Text>
                        </Pressable>
                    </View>
                )}

                {!isLoadingInitial &&
                    !initialError &&
                    visibleSubjects.length === 0 && (
                        <View style={s.emptyCard}>
                            <Ionicons
                                name="book-outline"
                                size={32}
                                color={theme.muted}
                            />
                            <Text style={s.emptyText}>
                                {activeDepartment
                                    ? `No subjects found for ${activeDepartment.deptName}${
                                          semesterFilter !== null
                                              ? ` in Semester ${semesterFilter}`
                                              : ""
                                      }.`
                                    : "No subjects available yet."}
                            </Text>
                            {hasActiveFilters && (
                                <Pressable
                                    onPress={() => {
                                        setSemesterFilter(null);
                                        setSearchQuery("");
                                    }}
                                    style={s.retryButton}
                                >
                                    <Text style={s.retryText}>Clear Filters</Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                {!isLoadingInitial &&
                    !initialError &&
                    groupedBySemester.map(([semKey, subjects]) => (
                        <View key={String(semKey)} style={s.semesterGroup}>
                            <View style={s.semesterBanner}>
                                <View style={s.semesterBadge}>
                                    <Text style={s.semesterBadgeText}>
                                        {semKey === "other"
                                            ? "GENERAL"
                                            : `SEMESTER ${semKey}`}
                                    </Text>
                                </View>
                                <Text style={s.semesterCount}>
                                    {subjects.length}{" "}
                                    {subjects.length === 1
                                        ? "subject"
                                        : "subjects"}
                                </Text>
                            </View>

                            <View style={s.subjectList}>
                                {subjects.map((subject) => {
                                    const accent = subjectColour(subject);
                                    const icon = subjectIcon(subject);
                                    const isOpen =
                                        !!expandedSubjects[subject.subjectKey];
                                    const chaptersSlice =
                                        chaptersBySubject[subject.subjectKey];

                                    return (
                                        <View
                                            key={subject.subjectKey}
                                            style={s.subjectCard}
                                        >
                                            <View
                                                style={[
                                                    s.subjectAccent,
                                                    { backgroundColor: accent },
                                                ]}
                                            />
                                            <Pressable
                                                onPress={() =>
                                                    toggleSubject(
                                                        subject.subjectKey,
                                                    )
                                                }
                                                style={s.subjectPressable}
                                            >
                                                <View style={s.subjectRow}>
                                                    <View
                                                        style={[
                                                            s.subjectIconBox,
                                                            {
                                                                backgroundColor: `${accent}20`,
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                s.subjectIcon,
                                                                {
                                                                    color: accent,
                                                                },
                                                            ]}
                                                        >
                                                            {icon}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={
                                                                s.subjectTitle
                                                            }
                                                        >
                                                            {subjectDisplayName(
                                                                subject,
                                                            )}
                                                        </Text>
                                                        <Text
                                                            style={
                                                                s.subjectMeta
                                                            }
                                                        >
                                                            {subject.subjectId}
                                                            {subject.department
                                                                ?.deptName
                                                                ? ` • ${subject.department.deptName}`
                                                                : ""}
                                                        </Text>
                                                    </View>
                                                    <Ionicons
                                                        name={
                                                            isOpen
                                                                ? "chevron-up"
                                                                : "chevron-down"
                                                        }
                                                        size={18}
                                                        color={theme.muted}
                                                    />
                                                </View>
                                            </Pressable>

                                            {isOpen && (
                                                <View style={s.chapterList}>
                                                    {(!chaptersSlice ||
                                                        chaptersSlice.status ===
                                                            "loading") && (
                                                        <View
                                                            style={s.inlineRow}
                                                        >
                                                            <ActivityIndicator
                                                                size="small"
                                                                color={accent}
                                                            />
                                                            <Text
                                                                style={
                                                                    s.mutedText
                                                                }
                                                            >
                                                                Loading
                                                                chapters...
                                                            </Text>
                                                        </View>
                                                    )}

                                                    {chaptersSlice?.status ===
                                                        "error" && (
                                                        <View
                                                            style={s.inlineRow}
                                                        >
                                                            <Text
                                                                style={
                                                                    s.errorMessage
                                                                }
                                                            >
                                                                {
                                                                    chaptersSlice.message
                                                                }
                                                            </Text>
                                                            <Pressable
                                                                onPress={() =>
                                                                    loadChapters(
                                                                        subject.subjectKey,
                                                                    )
                                                                }
                                                            >
                                                                <Text
                                                                    style={[
                                                                        s.retryInline,
                                                                        {
                                                                            color: accent,
                                                                        },
                                                                    ]}
                                                                >
                                                                    Retry
                                                                </Text>
                                                            </Pressable>
                                                        </View>
                                                    )}

                                                    {chaptersSlice?.status ===
                                                        "success" &&
                                                        chaptersSlice.data
                                                            .length === 0 && (
                                                            <Text
                                                                style={
                                                                    s.inlineEmpty
                                                                }
                                                            >
                                                                No chapters
                                                                listed for this
                                                                subject yet.
                                                            </Text>
                                                        )}

                                                    {chaptersSlice?.status ===
                                                        "success" &&
                                                        chaptersSlice.data.map(
                                                            (chapter, cIdx) => {
                                                                const chOpen =
                                                                    !!expandedChapters[
                                                                        chapter
                                                                            .chapterId
                                                                    ];
                                                                const topicsSlice =
                                                                    topicsByChapter[
                                                                        chapter
                                                                            .chapterId
                                                                    ];
                                                                const numberLabel =
                                                                    chapter.chapterNumber ??
                                                                    chapter.chapterNo ??
                                                                    cIdx + 1;

                                                                return (
                                                                    <View
                                                                        key={
                                                                            chapter.chapterId
                                                                        }
                                                                        style={
                                                                            s.chapterCard
                                                                        }
                                                                    >
                                                                        <Pressable
                                                                            onPress={() =>
                                                                                toggleChapter(
                                                                                    chapter.chapterId,
                                                                                )
                                                                            }
                                                                            style={
                                                                                s.chapterPressable
                                                                            }
                                                                        >
                                                                            <View
                                                                                style={[
                                                                                    s.chapterNumberBadge,
                                                                                    {
                                                                                        backgroundColor: `${accent}20`,
                                                                                    },
                                                                                ]}
                                                                            >
                                                                                <Text
                                                                                    style={[
                                                                                        s.chapterNumberText,
                                                                                        {
                                                                                            color: accent,
                                                                                        },
                                                                                    ]}
                                                                                >
                                                                                    Ch{" "}
                                                                                    {
                                                                                        numberLabel
                                                                                    }
                                                                                </Text>
                                                                            </View>
                                                                            <Text
                                                                                style={
                                                                                    s.chapterName
                                                                                }
                                                                            >
                                                                                {
                                                                                    chapter.chapterName
                                                                                }
                                                                            </Text>
                                                                            <Ionicons
                                                                                name={
                                                                                    chOpen
                                                                                        ? "remove-circle-outline"
                                                                                        : "add-circle-outline"
                                                                                }
                                                                                size={
                                                                                    18
                                                                                }
                                                                                color={
                                                                                    chOpen
                                                                                        ? accent
                                                                                        : theme.muted
                                                                                }
                                                                            />
                                                                        </Pressable>

                                                                        {chOpen && (
                                                                            <View
                                                                                style={[
                                                                                    s.topicList,
                                                                                    {
                                                                                        borderLeftColor: `${accent}50`,
                                                                                    },
                                                                                ]}
                                                                            >
                                                                                {(!topicsSlice ||
                                                                                    topicsSlice.status ===
                                                                                        "loading") && (
                                                                                    <View
                                                                                        style={
                                                                                            s.inlineRow
                                                                                        }
                                                                                    >
                                                                                        <ActivityIndicator
                                                                                            size="small"
                                                                                            color={
                                                                                                accent
                                                                                            }
                                                                                        />
                                                                                        <Text
                                                                                            style={
                                                                                                s.mutedText
                                                                                            }
                                                                                        >
                                                                                            Loading
                                                                                            topics...
                                                                                        </Text>
                                                                                    </View>
                                                                                )}

                                                                                {topicsSlice?.status ===
                                                                                    "error" && (
                                                                                    <View
                                                                                        style={
                                                                                            s.inlineRow
                                                                                        }
                                                                                    >
                                                                                        <Text
                                                                                            style={
                                                                                                s.errorMessage
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                topicsSlice.message
                                                                                            }
                                                                                        </Text>
                                                                                        <Pressable
                                                                                            onPress={() =>
                                                                                                loadTopics(
                                                                                                    chapter.chapterId,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Text
                                                                                                style={[
                                                                                                    s.retryInline,
                                                                                                    {
                                                                                                        color: accent,
                                                                                                    },
                                                                                                ]}
                                                                                            >
                                                                                                Retry
                                                                                            </Text>
                                                                                        </Pressable>
                                                                                    </View>
                                                                                )}

                                                                                {topicsSlice?.status ===
                                                                                    "success" &&
                                                                                    topicsSlice
                                                                                        .data
                                                                                        .length ===
                                                                                        0 && (
                                                                                        <Text
                                                                                            style={
                                                                                                s.inlineEmpty
                                                                                            }
                                                                                        >
                                                                                            No
                                                                                            topics
                                                                                            added
                                                                                            for
                                                                                            this
                                                                                            chapter
                                                                                            yet.
                                                                                        </Text>
                                                                                    )}

                                                                                {topicsSlice?.status ===
                                                                                    "success" &&
                                                                                    topicsSlice.data.map(
                                                                                        (
                                                                                            topic,
                                                                                            tIdx,
                                                                                        ) => (
                                                                                            <View
                                                                                                key={
                                                                                                    topic.topicId
                                                                                                }
                                                                                                style={
                                                                                                    s.topicRow
                                                                                                }
                                                                                            >
                                                                                                <View
                                                                                                    style={[
                                                                                                        s.topicDot,
                                                                                                        {
                                                                                                            backgroundColor:
                                                                                                                accent,
                                                                                                        },
                                                                                                    ]}
                                                                                                />
                                                                                                <Text
                                                                                                    style={
                                                                                                        s.topicIdx
                                                                                                    }
                                                                                                >
                                                                                                    {
                                                                                                        numberLabel
                                                                                                    }
                                                                                                    .
                                                                                                    {tIdx +
                                                                                                        1}
                                                                                                </Text>
                                                                                                <Text
                                                                                                    style={[
                                                                                                        s.topicName,
                                                                                                        {
                                                                                                            flex: 1,
                                                                                                        },
                                                                                                    ]}
                                                                                                >
                                                                                                    {
                                                                                                        topic.topicName
                                                                                                    }
                                                                                                </Text>
                                                                                            </View>
                                                                                        ),
                                                                                    )}
                                                                            </View>
                                                                        )}
                                                                    </View>
                                                                );
                                                            },
                                                        )}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
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
            gap: SP.lg,
            paddingBottom: SP.xxl,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            gap: SP.md,
        },
        backBtn: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: "center",
            justifyContent: "center",
        },
        eyebrow: {
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 1.1,
            color: t.accent,
        },
        title: {
            fontSize: 22,
            fontWeight: "900",
            color: t.text,
        },
        trackerBannerBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#8B5CF6",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
        },
        trackerBannerBtnText: {
            fontSize: 12,
            fontWeight: "800",
            color: "#FFFFFF",
        },
        subtitle: {
            fontSize: 13,
            color: t.muted,
            lineHeight: 19,
        },
        sectionBlock: {
            gap: SP.sm,
        },
        filterHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        filterLabel: {
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.8,
            color: t.muted,
        },
        clearFiltersText: {
            fontSize: 11,
            fontWeight: "700",
            color: t.accent,
        },
        pillRow: {
            gap: SP.sm,
            paddingVertical: 2,
        },
        deptCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: SP.sm,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        deptCardActive: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },
        deptIconWrap: {
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: t.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
        },
        deptIconWrapActive: {
            backgroundColor: "rgba(255,255,255,0.2)",
        },
        deptText: {
            fontSize: 13,
            fontWeight: "700",
            color: t.text,
        },
        deptTextActive: {
            color: "#FFFFFF",
        },
        semPill: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 9,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        semPillActive: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },
        semPillText: {
            fontSize: 12,
            fontWeight: "600",
            color: t.text,
        },
        semPillTextActive: {
            color: "#FFFFFF",
            fontWeight: "700",
        },
        centerCard: {
            alignItems: "center",
            justifyContent: "center",
            padding: SP.xxl,
            gap: SP.sm,
        },
        mutedText: {
            fontSize: 12,
            color: t.muted,
        },
        inlineRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: SP.sm,
            paddingVertical: SP.xs,
        },
        retryInline: {
            fontSize: 12,
            fontWeight: "700",
        },
        semesterGroup: {
            gap: SP.sm,
        },
        semesterBanner: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: SP.xs,
        },
        semesterBadge: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        semesterBadgeText: {
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.8,
            color: t.accent,
        },
        semesterCount: {
            fontSize: 11,
            color: t.muted,
            fontWeight: "600",
        },
        subjectList: {
            gap: SP.md,
        },
        subjectCard: {
            backgroundColor: t.surface,
            borderRadius: 14,
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
            width: 42,
            height: 42,
            borderRadius: 10,
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
        chapterList: {
            paddingHorizontal: SP.md,
            paddingBottom: SP.md,
            gap: SP.sm,
            borderTopWidth: 1,
            borderTopColor: t.border,
            paddingTop: SP.md,
        },
        chapterCard: {
            backgroundColor: t.surfaceAlt,
            borderRadius: 10,
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
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderRadius: 6,
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
            paddingVertical: 3,
        },
        topicDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
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
            borderRadius: 10,
            padding: SP.md,
            gap: SP.md,
            borderWidth: 1,
            borderColor: t.danger,
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
            borderRadius: 8,
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
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            gap: SP.xs,
        },
        emptyText: {
            fontSize: 13,
            color: t.muted,
            textAlign: "center",
        },
    });
}
