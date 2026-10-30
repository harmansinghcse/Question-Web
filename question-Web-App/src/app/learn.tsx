import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppShell from "../components/AppShell";
import QuestionBankView from "../components/QuestionBankView";
import { useAppTheme } from "../providers/ThemeProvider";
import type { AppTheme } from "../constants/theme";

type LearnTab = "questions" | "resources";

interface AcademicResource {
    id: string;
    title: string;
    author: string;
    type: "Book" | "Lecture Notes" | "Curriculum";
    subject: string;
    subjectKey: string;
    description: string;
}

const FEATURED_RESOURCES: AcademicResource[] = [
    {
        id: "res-1",
        title: "Database System Concepts (7th Edition)",
        author: "Silberschatz, Korth, Sudarshan",
        type: "Book",
        subject: "Database Management Systems",
        subjectKey: "CS201",
        description: "Primary reference book covering relational algebra, SQL, indexing, and transaction management.",
    },
    {
        id: "res-2",
        title: "Computer Organization and Design: RISC-V Edition",
        author: "David A. Patterson, John L. Hennessy",
        type: "Book",
        subject: "Computer Organization",
        subjectKey: "CS203",
        description: "Standard text for processor datapath, pipelining, cache memory hierarchies, and virtual memory.",
    },
    {
        id: "res-3",
        title: "Discrete Mathematics and Its Applications (8th Edition)",
        author: "Kenneth H. Rosen",
        type: "Book",
        subject: "Discrete Mathematics",
        subjectKey: "CS205",
        description: "Comprehensive guide to set theory, logic, combinatorics, graph theory, and proof techniques.",
    },
    {
        id: "res-4",
        title: "Object-Oriented Programming with C++",
        author: "E. Balagurusamy",
        type: "Book",
        subject: "Object-Oriented Programming",
        subjectKey: "CS207",
        description: "Foundational guide covering classes, inheritance, polymorphism, templates, and exception handling.",
    },
    {
        id: "res-5",
        title: "SVNIT B.Tech Computer Science Syllabus & Scheme",
        author: "Department of Computer Science & Engineering",
        type: "Curriculum",
        subject: "Academic Regulations",
        subjectKey: "SVNIT",
        description: "Official course scheme, credit structure, and semester-wise examination evaluation policy.",
    },
];

const RESOURCE_CATEGORIES: {
    key: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
    { key: "All", label: "All", icon: "layers-outline" },
    { key: "Book", label: "Books", icon: "book-outline" },
    { key: "Lecture Notes", label: "Notes", icon: "document-text-outline" },
    { key: "Curriculum", label: "Curriculum", icon: "school-outline" },
];

function getResourceTypeIcon(type: AcademicResource["type"]): React.ComponentProps<typeof Ionicons>["name"] {
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

export default function LearnScreen() {
    const router = useRouter();
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

    const [resourceFilter, setResourceFilter] = useState<string>("All");

    const filteredResources = useMemo(() => {
        if (resourceFilter === "All") return FEATURED_RESOURCES;
        return FEATURED_RESOURCES.filter((r) => r.type === resourceFilter);
    }, [resourceFilter]);

    return (
        <AppShell active="learn" hideTopSearch>
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <View style={s.headerTitleRow}>
                        <View style={s.headerAccent} />
                        <Text style={s.title}>Learn</Text>
                    </View>
                    <Text style={s.subtitle}>
                        Explore questions and study resources.
                    </Text>
                </View>

                {/* Segmented Control (Elevated, polished tabs) */}
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
                            size={16}
                            color={
                                activeTab === "questions"
                                    ? theme.accent
                                    : theme.muted
                            }
                        />
                        <Text
                            style={[
                                s.tabButtonText,
                                activeTab === "questions" &&
                                    s.tabButtonTextActive,
                            ]}
                        >
                            Questions
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
                            size={16}
                            color={
                                activeTab === "resources"
                                    ? theme.accent
                                    : theme.muted
                            }
                        />
                        <Text
                            style={[
                                s.tabButtonText,
                                activeTab === "resources" &&
                                    s.tabButtonTextActive,
                            ]}
                        >
                            Resources
                        </Text>
                    </Pressable>
                </View>

                {/* Tab Content */}
                {activeTab === "questions" ? (
                    <QuestionBankView showHeader={false} />
                ) : (
                    <View style={s.resourcesContainer}>
                        {/* Resource Category Filter */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.filterRow}
                        >
                            {RESOURCE_CATEGORIES.map((cat) => {
                                const isSel = resourceFilter === cat.key;
                                return (
                                    <Pressable
                                        key={cat.key}
                                        onPress={() => setResourceFilter(cat.key)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Filter by ${cat.label}`}
                                        style={[
                                            s.filterPill,
                                            isSel && s.filterPillActive,
                                        ]}
                                    >
                                        <Ionicons
                                            name={cat.icon}
                                            size={13}
                                            color={isSel ? theme.accent : theme.muted}
                                        />
                                        <Text
                                            style={[
                                                s.filterPillText,
                                                isSel &&
                                                    s.filterPillTextActive,
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {/* Resource Cards */}
                        <View style={s.resourceList}>
                            {filteredResources.map((res) => (
                                <View key={res.id} style={s.resourceCard}>
                                    <View style={s.resHeaderRow}>
                                        <View style={s.subjectPill}>
                                            <Text style={s.subjectPillText}>
                                                {res.subjectKey}
                                            </Text>
                                        </View>
                                        <View style={s.resTypeBadge}>
                                            <Ionicons
                                                name={getResourceTypeIcon(res.type)}
                                                size={12}
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
                                            size={12}
                                            color={theme.muted}
                                        />
                                        <Text style={s.resAuthor}>
                                            by {res.author}
                                        </Text>
                                    </View>

                                    <Text style={s.resDesc} numberOfLines={2}>
                                        {res.description}
                                    </Text>

                                    <View style={s.resFooter}>
                                        <View style={s.resSubjectRow}>
                                            <Ionicons
                                                name="school-outline"
                                                size={13}
                                                color={theme.muted}
                                            />
                                            <Text style={s.resSubjectName}>
                                                {res.subject}
                                            </Text>
                                        </View>
                                        <Pressable
                                            onPress={() =>
                                                router.push("/syllabus")
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
                                                size={12}
                                                color={theme.accent}
                                            />
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
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
            gap: 16,
            paddingBottom: 28,
        },
        header: {
            gap: 4,
            marginBottom: 2,
        },
        headerTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
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
            color: t.muted,
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
            gap: 7,
            paddingVertical: 10,
            borderRadius: 8,
        },
        tabButtonActive: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.accent + "40",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 1,
        },
        tabButtonText: {
            fontSize: 13,
            fontWeight: "600",
            color: t.muted,
        },
        tabButtonTextActive: {
            color: t.accent,
            fontWeight: "700",
        },
        resourcesContainer: {
            gap: 14,
        },
        filterRow: {
            gap: 8,
            paddingVertical: 2,
        },
        filterPill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            height: 36,
            paddingHorizontal: 14,
            borderRadius: 10,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        filterPillActive: {
            backgroundColor: t.accentSoft,
            borderColor: t.accent,
        },
        filterPillText: {
            fontSize: 12,
            fontWeight: "600",
            color: t.muted,
        },
        filterPillTextActive: {
            color: t.accent,
            fontWeight: "700",
        },
        resourceList: {
            gap: 12,
        },
        resourceCard: {
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
            gap: 8,
        },
        resHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
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
        resTypeBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 8,
            paddingVertical: 3,
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
            gap: 5,
        },
        resAuthor: {
            fontSize: 12,
            color: t.muted,
            fontWeight: "500",
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
            marginTop: 4,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: t.border,
        },
        resSubjectRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flex: 1,
            marginRight: 8,
        },
        resSubjectName: {
            fontSize: 12,
            fontWeight: "500",
            color: t.muted,
        },
        resActionBtn: {
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
        resActionBtnText: {
            fontSize: 11,
            fontWeight: "600",
            color: t.accent,
        },
    });
}
