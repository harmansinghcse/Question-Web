import React, { useMemo, useState } from "react";
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

import AppShell from "../components/AppShell";
import { EmptyBlock } from "../components/ui";
import { useAppTheme } from "../providers/ThemeProvider";
import { FEATURED_RESOURCES } from "./learn";
import type { AppTheme } from "../constants/theme";

const RESOURCE_CATEGORIES: {
    key: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
    { key: "All", label: "All Resources", icon: "layers-outline" },
    { key: "Book", label: "Books", icon: "book-outline" },
    { key: "Lecture Notes", label: "Notes", icon: "document-text-outline" },
    { key: "Curriculum", label: "Curriculum", icon: "school-outline" },
];

function getResourceTypeIcon(type: string): React.ComponentProps<typeof Ionicons>["name"] {
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

export default function ResourcesScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [categoryFilter, setCategoryFilter] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = useMemo(() => {
        let list = FEATURED_RESOURCES;
        if (categoryFilter !== "All") {
            list = list.filter((r) => r.type === categoryFilter);
        }
        if (searchQuery.trim().length > 0) {
            const q = searchQuery.toLowerCase().trim();
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
    }, [categoryFilter, searchQuery]);

    return (
        <AppShell active="resources">
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <View style={s.headerTitleRow}>
                        <View style={s.headerAccent} />
                        <Text style={s.title}>Study Resources</Text>
                    </View>
                    <Text style={s.subtitle}>
                        Textbooks, course lecture slides, reference guides, and SVNIT academic scheme documents.
                    </Text>
                </View>

                {/* Search */}
                <View style={s.searchBox}>
                    <Ionicons
                        name="search-outline"
                        size={18}
                        color={theme.textSecondary}
                    />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search resources, topics, or book titles..."
                        placeholderTextColor={theme.muted}
                        style={s.searchInput}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable
                            onPress={() => setSearchQuery("")}
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

                {/* Category Pills */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.filterRow}
                >
                    {RESOURCE_CATEGORIES.map((cat) => {
                        const isSel = categoryFilter === cat.key;
                        return (
                            <Pressable
                                key={cat.key}
                                onPress={() => setCategoryFilter(cat.key)}
                                accessibilityRole="button"
                                style={[
                                    s.filterPill,
                                    isSel && s.filterPillActive,
                                ]}
                            >
                                <Ionicons
                                    name={cat.icon}
                                    size={14}
                                    color={isSel ? theme.accent : theme.textSecondary}
                                />
                                <Text
                                    style={[
                                        s.filterPillText,
                                        isSel && s.filterPillTextActive,
                                    ]}
                                >
                                    {cat.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* Resources List */}
                {filtered.length === 0 ? (
                    <EmptyBlock
                        icon="book-outline"
                        title="No matching resources"
                        text="No documents match your query. Try broadening your terms or resetting filters."
                        actionLabel="Show all resources"
                        onAction={() => {
                            setCategoryFilter("All");
                            setSearchQuery("");
                        }}
                    />
                ) : (
                    <View style={s.resourceList}>
                        {filtered.map((res) => (
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
                                    <Text style={s.resAuthor}>
                                        {res.author}
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
                                            color={theme.textSecondary}
                                        />
                                        <Text style={s.resSubjectName} numberOfLines={1}>
                                            {res.subject}
                                        </Text>
                                    </View>
                                    <Pressable
                                        onPress={() => router.push("/syllabus")}
                                        accessibilityRole="button"
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
        filterRow: {
            gap: 8,
            paddingVertical: 2,
        },
        filterPill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            height: 38,
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
            color: t.textSecondary,
        },
        filterPillTextActive: {
            color: t.accent,
            fontWeight: "700",
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
        },
        resTagsRow: {
            flexDirection: "row",
            alignItems: "center",
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
            paddingTop: 12,
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
            color: t.textSecondary,
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
        },
        resActionBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: t.accent,
        },
    });
}
