import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppShell from "../components/AppShell";
import QuestionBankView from "../components/QuestionBankView";
import { EmptyBlock, Pill } from "../components/ui";
import { useAppTheme } from "../providers/ThemeProvider";
import type { AppTheme } from "../constants/theme";

type LearnTab = "questions" | "resources";

export interface AcademicResource {
    id: string;
    title: string;
    author: string;
    type: "Book" | "Lecture Notes" | "Curriculum";
    subject: string;
    subjectKey: string;
    semester?: number;
    description: string;
}

export const FEATURED_RESOURCES: AcademicResource[] = [
    {
        id: "res-1",
        title: "Database System Concepts (7th Edition)",
        author: "Silberschatz, Korth, Sudarshan",
        type: "Book",
        subject: "Database Management Systems",
        subjectKey: "CS201",
        semester: 3,
        description:
            "Primary reference book covering relational algebra, SQL, indexing, and transaction management.",
    },
    {
        id: "res-2",
        title: "Computer Organization and Design: RISC-V Edition",
        author: "David A. Patterson, John L. Hennessy",
        type: "Book",
        subject: "Computer Organization",
        subjectKey: "CS203",
        semester: 3,
        description:
            "Standard text for processor datapath, pipelining, cache memory hierarchies, and virtual memory.",
    },
    {
        id: "res-3",
        title: "Discrete Mathematics and Its Applications (8th Edition)",
        author: "Kenneth H. Rosen",
        type: "Book",
        subject: "Discrete Mathematics",
        subjectKey: "CS205",
        semester: 3,
        description:
            "Comprehensive guide to set theory, logic, combinatorics, graph theory, and proof techniques.",
    },
    {
        id: "res-4",
        title: "Object-Oriented Programming with C++",
        author: "E. Balagurusamy",
        type: "Book",
        subject: "Object-Oriented Programming",
        subjectKey: "CS207",
        semester: 3,
        description:
            "Foundational guide covering classes, inheritance, polymorphism, templates, and exception handling.",
    },
    {
        id: "res-5",
        title: "SVNIT B.Tech Computer Science Syllabus & Scheme",
        author: "Department of Computer Science & Engineering",
        type: "Curriculum",
        subject: "Academic Regulations",
        subjectKey: "SVNIT",
        semester: 4,
        description:
            "Official course scheme, credit structure, and semester-wise examination evaluation policy.",
    },
    {
        id: "res-6",
        title: "Design and Analysis of Computer Algorithms",
        author: "Aho, Hopcroft, Ullman",
        type: "Book",
        subject: "Data Structures & Algorithms",
        subjectKey: "CS202",
        semester: 4,
        description:
            "Classic text on asymptotic complexity, divide-and-conquer, dynamic programming, and graph algorithms.",
    },
    {
        id: "res-7",
        title: "Operating System Concepts (10th Edition)",
        author: "Silberschatz, Galvin, Gagne",
        type: "Book",
        subject: "Operating Systems",
        subjectKey: "CS204",
        semester: 4,
        description:
            "Comprehensive coverage of processes, threads, synchronization, memory management, and file systems.",
    },
    {
        id: "res-8",
        title: "DBMS Complete Lecture Notes & SQL Workbook",
        author: "CSE Faculty Notes",
        type: "Lecture Notes",
        subject: "Database Management Systems",
        subjectKey: "CS201",
        semester: 3,
        description:
            "Structured lecture summaries covering ER modeling, normalization (1NF–BCNF), and concurrency control.",
    },
    {
        id: "res-9",
        title: "Operating Systems Kernel & Scheduling Notes",
        author: "CSE Faculty Notes",
        type: "Lecture Notes",
        subject: "Operating Systems",
        subjectKey: "CS204",
        semester: 4,
        description:
            "Concise revision notes for CPU scheduling, deadlocks, paging, and disk scheduling algorithms.",
    },
];

export const RESOURCE_CATEGORIES: {
    key: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
    { key: "All", label: "All Resources", icon: "layers-outline" },
    { key: "Book", label: "Books", icon: "book-outline" },
    { key: "Lecture Notes", label: "Notes", icon: "document-text-outline" },
    { key: "Curriculum", label: "Curriculum", icon: "school-outline" },
];

export function getResourceTypeIcon(
    type: string,
): React.ComponentProps<typeof Ionicons>["name"] {
    switch (type) {
        case "Book":
            return "book-outline";
        case "Lecture Notes":
            return "document-text-outline";
        case "Curriculum":
            return "school-outline";
        default:
            return "folder-outline";
    }
}

export function StudyResourcesCatalogView() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [resourceFilter, setResourceFilter] = useState<string>("All");
    const [selectedSemester, setSelectedSemester] = useState<number | null>(
        null,
    );
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [resourceSearch, setResourceSearch] = useState<string>("");

    const availableSemesters = useMemo(() => {
        const set = new Set<number>();
        for (const r of FEATURED_RESOURCES) {
            if (r.semester) set.add(r.semester);
        }
        return Array.from(set).sort((a, b) => a - b);
    }, []);

    const availableSubjects = useMemo(() => {
        const list =
            selectedSemester === null
                ? FEATURED_RESOURCES
                : FEATURED_RESOURCES.filter(
                      (r) => r.semester === selectedSemester,
                  );
        const map = new Map<string, string>();
        for (const r of list) {
            map.set(r.subjectKey, `${r.subjectKey} — ${r.subject}`);
        }
        return Array.from(map.entries()).map(([key, label]) => ({
            key,
            label,
        }));
    }, [selectedSemester]);

    const filteredResources = useMemo(() => {
        let list = FEATURED_RESOURCES;
        if (resourceFilter !== "All") {
            list = list.filter((r) => r.type === resourceFilter);
        }
        if (selectedSemester !== null) {
            list = list.filter((r) => r.semester === selectedSemester);
        }
        if (selectedSubject !== null) {
            list = list.filter((r) => r.subjectKey === selectedSubject);
        }
        if (resourceSearch.trim().length > 0) {
            const q = resourceSearch.toLowerCase().trim();
            list = list.filter(
                (r) =>
                    r.title.toLowerCase().includes(q) ||
                    r.author.toLowerCase().includes(q) ||
                    r.subject.toLowerCase().includes(q) ||
                    r.subjectKey.toLowerCase().includes(q) ||
                    r.description.toLowerCase().includes(q),
            );
        }
        return list;
    }, [resourceFilter, selectedSemester, selectedSubject, resourceSearch]);

    const hasActiveFilters =
        resourceFilter !== "All" ||
        selectedSemester !== null ||
        selectedSubject !== null ||
        resourceSearch.trim().length > 0;

    function resetFilters() {
        setResourceFilter("All");
        setSelectedSemester(null);
        setSelectedSubject(null);
        setResourceSearch("");
    }

    return (
        <View style={s.resourcesContainer}>
            {/* Resource Search */}
            <View style={s.searchBox}>
                <Ionicons
                    name="search-outline"
                    size={18}
                    color={theme.textSecondary}
                />
                <TextInput
                    value={resourceSearch}
                    onChangeText={setResourceSearch}
                    placeholder="Search books, author, subject, or notes..."
                    placeholderTextColor={theme.muted}
                    style={s.searchInput}
                />
                {resourceSearch.length > 0 && (
                    <Pressable
                        onPress={() => setResourceSearch("")}
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

            {/* Category Filter */}
            <View style={s.filterGroup}>
                <Text style={s.filterGroupLabel}>CATEGORY</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.filterRow}
                >
                    {RESOURCE_CATEGORIES.map((cat) => (
                        <Pill
                            key={cat.key}
                            label={cat.label}
                            icon={cat.icon}
                            compact
                            active={resourceFilter === cat.key}
                            onPress={() => setResourceFilter(cat.key)}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Semester Filter */}
            <View style={s.filterGroup}>
                <Text style={s.filterGroupLabel}>SEMESTER</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.filterRow}
                >
                    <Pill
                        label="All Semesters"
                        compact
                        active={selectedSemester === null}
                        onPress={() => {
                            setSelectedSemester(null);
                        }}
                    />
                    {availableSemesters.map((sem) => (
                        <Pill
                            key={sem}
                            label={`Sem ${sem}`}
                            compact
                            active={selectedSemester === sem}
                            onPress={() => {
                                const next =
                                    selectedSemester === sem ? null : sem;
                                setSelectedSemester(next);
                                setSelectedSubject(null);
                            }}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Subject Filter */}
            <View style={s.filterGroup}>
                <Text style={s.filterGroupLabel}>SUBJECT</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.filterRow}
                >
                    <Pill
                        label="All Subjects"
                        compact
                        active={selectedSubject === null}
                        onPress={() => setSelectedSubject(null)}
                    />
                    {availableSubjects.map((sub) => (
                        <Pill
                            key={sub.key}
                            label={sub.label}
                            compact
                            active={selectedSubject === sub.key}
                            onPress={() =>
                                setSelectedSubject(
                                    selectedSubject === sub.key
                                        ? null
                                        : sub.key,
                                )
                            }
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Results summary & Clear All */}
            <View style={s.resultsHeader}>
                <Text style={s.resultsCountText}>
                    Showing {filteredResources.length} of{" "}
                    {FEATURED_RESOURCES.length} study resources
                </Text>
                {hasActiveFilters && (
                    <Pressable
                        onPress={resetFilters}
                        accessibilityRole="button"
                        style={s.clearBtn}
                    >
                        <Ionicons
                            name="close-circle-outline"
                            size={14}
                            color={theme.accent}
                        />
                        <Text style={s.clearBtnText}>Clear all</Text>
                    </Pressable>
                )}
            </View>

            {/* Resource Cards */}
            {filteredResources.length === 0 ? (
                <EmptyBlock
                    icon="book-outline"
                    title="No resources found"
                    text="Try clearing your search query or choosing another semester or category."
                    actionLabel="Reset filters"
                    onAction={resetFilters}
                />
            ) : (
                <View style={s.resourceList}>
                    {filteredResources.map((res) => (
                        <View key={res.id} style={s.resourceCard}>
                            <View style={s.resHeaderRow}>
                                <View style={s.resTagsRow}>
                                    <View style={s.subjectPill}>
                                        <Text style={s.subjectPillText}>
                                            {res.subjectKey}
                                        </Text>
                                    </View>
                                    {res.semester && (
                                        <View style={s.semPill}>
                                            <Text style={s.semPillText}>
                                                Sem {res.semester}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <View style={s.resTypeBadge}>
                                    <Ionicons
                                        name={getResourceTypeIcon(res.type)}
                                        size={13}
                                        color={theme.accent}
                                    />
                                    <Text style={s.resTypeText}>
                                        {res.type}
                                    </Text>
                                </View>
                            </View>

                            <Text style={s.resTitle}>{res.title}</Text>

                            <View style={s.authorRow}>
                                <Ionicons
                                    name="person-outline"
                                    size={13}
                                    color={theme.textSecondary}
                                />
                                <Text
                                    style={s.resAuthor}
                                    numberOfLines={1}
                                >
                                    {res.author}
                                </Text>
                            </View>

                            <Text style={s.resDesc} numberOfLines={3}>
                                {res.description}
                            </Text>

                            <View style={s.resFooter}>
                                <View style={s.resSubjectRow}>
                                    <Ionicons
                                        name="school-outline"
                                        size={13}
                                        color={theme.textSecondary}
                                    />
                                    <Text
                                        style={s.resSubjectName}
                                        numberOfLines={1}
                                    >
                                        {res.subject}
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() =>
                                        router.push("/syllabus" as never)
                                    }
                                    accessibilityRole="button"
                                    accessibilityLabel={`View ${res.title} in syllabus`}
                                    style={({ pressed }) => [
                                        s.resActionBtn,
                                        pressed && { opacity: 0.8 },
                                    ]}
                                >
                                    <Text style={s.resActionBtnText}>
                                        View in Syllabus
                                    </Text>
                                    <Ionicons
                                        name="arrow-forward"
                                        size={13}
                                        color={theme.accent}
                                    />
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

export default function LearnScreen() {
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);
    const params = useLocalSearchParams<{ tab?: string }>();

    const initialTab: LearnTab =
        params.tab === "resources" ? "resources" : "questions";
    const [activeTab, setActiveTab] = useState<LearnTab>(initialTab);

    // Sync if route params change during render
    const [prevTabParam, setPrevTabParam] = useState(params.tab);
    if (params.tab !== prevTabParam) {
        setPrevTabParam(params.tab);
        if (params.tab === "resources" || params.tab === "questions") {
            setActiveTab(params.tab);
        }
    }

    return (
        <AppShell active="learn" hideTopSearch>
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <View style={s.headerTitleRow}>
                        <View style={s.headerAccent} />
                        <Text style={s.title}>Academic Repository</Text>
                    </View>
                    <Text style={s.subtitle}>
                        Browse examination questions, curriculum reference materials, and academic texts.
                    </Text>
                </View>

                {/* Segmented Control */}
                <View style={s.segmentedContainer}>
                    <Pressable
                        onPress={() => setActiveTab("questions")}
                        accessibilityRole="button"
                        accessibilityLabel="Question Bank Tab"
                        style={[
                            s.tabButton,
                            activeTab === "questions" && s.tabButtonActive,
                        ]}
                    >
                        <Ionicons
                            name={
                                activeTab === "questions"
                                    ? "library"
                                    : "library-outline"
                            }
                            size={17}
                            color={
                                activeTab === "questions"
                                    ? theme.accent
                                    : theme.textSecondary
                            }
                        />
                        <Text
                            style={[
                                s.tabButtonText,
                                activeTab === "questions" &&
                                    s.tabButtonTextActive,
                            ]}
                            numberOfLines={1}
                        >
                            Question Bank
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => setActiveTab("resources")}
                        accessibilityRole="button"
                        accessibilityLabel="Resources Tab"
                        style={[
                            s.tabButton,
                            activeTab === "resources" && s.tabButtonActive,
                        ]}
                    >
                        <Ionicons
                            name={
                                activeTab === "resources"
                                    ? "book"
                                    : "book-outline"
                            }
                            size={17}
                            color={
                                activeTab === "resources"
                                    ? theme.accent
                                    : theme.textSecondary
                            }
                        />
                        <Text
                            style={[
                                s.tabButtonText,
                                activeTab === "resources" &&
                                    s.tabButtonTextActive,
                            ]}
                            numberOfLines={1}
                        >
                            Study Resources
                        </Text>
                    </Pressable>
                </View>

                {/* Tab Content */}
                {activeTab === "questions" ? (
                    <QuestionBankView showHeader={false} />
                ) : (
                    <StudyResourcesCatalogView />
                )}
            </View>
        </AppShell>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        container: {
            width: "100%",
            maxWidth: 880,
            alignSelf: "center",
            gap: 18,
            paddingBottom: 28,
        },
        header: {
            gap: 4,
            marginBottom: 2,
        },
        headerTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
        },
        headerAccent: {
            width: 3.5,
            height: 18,
            borderRadius: 2,
            backgroundColor: t.accent,
        },
        title: {
            fontSize: 22,
            fontWeight: "800",
            color: t.text,
            letterSpacing: -0.3,
        },
        subtitle: {
            fontSize: 13,
            color: t.textSecondary,
            lineHeight: 18,
        },
        segmentedContainer: {
            flexDirection: "row",
            backgroundColor: t.surfaceAlt,
            borderRadius: 12,
            padding: 4,
            borderWidth: 1,
            borderColor: t.border,
            gap: 6,
        },
        tabButton: {
            flex: 1,
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 10,
            paddingHorizontal: 8,
            borderRadius: 9,
        },
        tabButtonActive: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.accent + "33",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 1,
        },
        tabButtonText: {
            fontSize: 13,
            fontWeight: "600",
            color: t.textSecondary,
            flexShrink: 1,
        },
        tabButtonTextActive: {
            color: t.accent,
            fontWeight: "700",
        },
        resourcesContainer: {
            gap: 14,
        },
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
            minWidth: 0,
            color: t.text,
            fontSize: 13,
            padding: 0,
        },
        filterGroup: {
            gap: 6,
        },
        filterGroupLabel: {
            color: t.textSecondary,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.8,
        },
        filterRow: {
            gap: 8,
            paddingVertical: 2,
            paddingRight: 8,
        },
        resultsHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 2,
        },
        resultsCountText: {
            fontSize: 12,
            fontWeight: "600",
            color: t.textSecondary,
        },
        clearBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: t.accentSoft,
        },
        clearBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: t.accent,
        },
        resourceList: {
            gap: 14,
        },
        resourceCard: {
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 18,
            gap: 9,
        },
        resHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
        },
        resTagsRow: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
        },
        subjectPill: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        subjectPillText: {
            fontSize: 11,
            fontWeight: "700",
            color: t.textSecondary,
        },
        semPill: {
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: t.accentSoft,
        },
        semPillText: {
            fontSize: 11,
            fontWeight: "700",
            color: t.accent,
        },
        resTypeBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 9,
            paddingVertical: 3.5,
            borderRadius: 6,
            backgroundColor: t.accentSoft,
        },
        resTypeText: {
            fontSize: 11,
            color: t.accent,
            fontWeight: "700",
        },
        resTitle: {
            fontSize: 16,
            fontWeight: "700",
            color: t.text,
            letterSpacing: -0.2,
        },
        authorRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        resAuthor: {
            fontSize: 12,
            color: t.textSecondary,
            fontWeight: "500",
            flex: 1,
        },
        resDesc: {
            fontSize: 13,
            color: t.textSecondary,
            lineHeight: 19,
        },
        resFooter: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 4,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: t.border,
        },
        resSubjectRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 150,
        },
        resSubjectName: {
            fontSize: 12,
            fontWeight: "500",
            color: t.textSecondary,
            flex: 1,
        },
        resActionBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: t.accentSoft,
            borderWidth: 1,
            borderColor: t.accent + "25",
            flexShrink: 0,
        },
        resActionBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: t.accent,
        },
    });
}
