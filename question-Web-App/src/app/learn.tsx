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
                    <Text style={s.title}>Learn</Text>
                    <Text style={s.subtitle}>
                        Find examination questions, lecture notes, and textbook references.
                    </Text>
                </View>

                {/* Segmented Control (Minimal, elevated pill) */}
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
                            {["All", "Book", "Lecture Notes", "Curriculum"].map(
                                (f) => {
                                    const isSel = resourceFilter === f;
                                    return (
                                        <Pressable
                                            key={f}
                                            onPress={() => setResourceFilter(f)}
                                            style={[
                                                s.filterPill,
                                                isSel && s.filterPillActive,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    s.filterPillText,
                                                    isSel &&
                                                        s.filterPillTextActive,
                                                ]}
                                            >
                                                {f}
                                            </Text>
                                        </Pressable>
                                    );
                                },
                            )}
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
                                        <Text style={s.resTypeText}>
                                            {res.type}
                                        </Text>
                                    </View>

                                    <Text style={s.resTitle}>{res.title}</Text>
                                    <Text style={s.resAuthor}>
                                        by {res.author}
                                    </Text>
                                    <Text style={s.resDesc} numberOfLines={2}>
                                        {res.description}
                                    </Text>

                                    <View style={s.resFooter}>
                                        <Text style={s.resSubjectName}>
                                            {res.subject}
                                        </Text>
                                        <Pressable
                                            onPress={() =>
                                                router.push("/syllabus")
                                            }
                                            style={s.resActionBtn}
                                        >
                                            <Text style={s.resActionBtnText}>
                                                View in Syllabus
                                            </Text>
                                            <Ionicons
                                                name="chevron-forward"
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
        },
        header: {
            marginBottom: 2,
        },
        title: {
            fontSize: 22,
            fontWeight: "800",
            color: t.text,
            letterSpacing: -0.2,
        },
        subtitle: {
            fontSize: 13,
            color: t.muted,
            marginTop: 2,
        },
        segmentedContainer: {
            flexDirection: "row",
            backgroundColor: t.surfaceAlt,
            borderRadius: 10,
            padding: 3,
            borderWidth: 1,
            borderColor: t.border,
            gap: 4,
        },
        tabButton: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 8,
            borderRadius: 7,
        },
        tabButtonActive: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        tabButtonText: {
            fontSize: 13,
            fontWeight: "600",
            color: t.muted,
        },
        tabButtonTextActive: {
            color: t.text,
            fontWeight: "700",
        },
        resourcesContainer: {
            gap: 12,
        },
        filterRow: {
            gap: 8,
            paddingVertical: 2,
        },
        filterPill: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        filterPillActive: {
            backgroundColor: t.surfaceAlt,
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
            gap: 10,
        },
        resourceCard: {
            backgroundColor: t.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
            gap: 6,
        },
        resHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        subjectPill: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 5,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        subjectPillText: {
            fontSize: 10,
            fontWeight: "700",
            color: t.textSecondary,
        },
        resTypeText: {
            fontSize: 11,
            color: t.muted,
            fontWeight: "500",
        },
        resTitle: {
            fontSize: 15,
            fontWeight: "700",
            color: t.text,
        },
        resAuthor: {
            fontSize: 12,
            color: t.muted,
        },
        resDesc: {
            fontSize: 12,
            color: t.textSecondary,
            lineHeight: 17,
        },
        resFooter: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: t.border,
        },
        resSubjectName: {
            fontSize: 11,
            fontWeight: "500",
            color: t.muted,
        },
        resActionBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
        },
        resActionBtnText: {
            fontSize: 11,
            fontWeight: "600",
            color: t.accent,
        },
    });
}
