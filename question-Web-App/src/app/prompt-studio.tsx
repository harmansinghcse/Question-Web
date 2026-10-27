import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AppShell from "../components/AppShell";
import { useAppTheme } from "../providers/ThemeProvider";
import type { AppTheme } from "../constants/theme";

export default function PromptStudioScreen() {
    const { theme } = useAppTheme();
    const router = useRouter();
    const styles = useMemo(() => makeStyles(theme), [theme]);

    return (
        <AppShell active="prompt">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.eyebrow}>AI STUDY ASSISTANT</Text>
                    <Text style={styles.title}>Prompt Studio</Text>
                    <Text style={styles.subtitle}>
                        Generate AI study prompts, model exam solutions, and flashcard summaries from selected questions.
                    </Text>
                </View>

                {/* Selected questions section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Ionicons
                            name="sparkles"
                            size={16}
                            color={theme.accent}
                        />
                        <Text style={styles.sectionLabel}>
                            Selected Questions
                        </Text>
                    </View>

                    <View style={styles.emptyBox}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons
                                name="clipboard-outline"
                                size={24}
                                color={theme.accent}
                            />
                        </View>
                        <Text style={styles.emptyTitle}>
                            No questions selected
                        </Text>
                        <Text style={styles.emptyText}>
                            Go to the Question Bank and select questions to generate an AI study prompt or practice test.
                        </Text>
                        <Pressable
                            onPress={() => router.push("/learn" as never)}
                            style={styles.button}
                            accessibilityRole="button"
                        >
                            <Ionicons
                                name="library-outline"
                                size={15}
                                color="#FFFFFF"
                            />
                            <Text style={styles.buttonText}>
                                Browse Questions
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Settings stub */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Ionicons
                            name="settings-outline"
                            size={16}
                            color={theme.accent}
                        />
                        <Text style={styles.sectionLabel}>Prompt Settings</Text>
                    </View>

                    <View style={styles.settingsCard}>
                        {[
                            {
                                label: "Answer Detail",
                                value: "Detailed (Exam Style)",
                            },
                            {
                                label: "Include Diagram / Code",
                                value: "Auto-detect",
                            },
                            {
                                label: "SVNIT Marking Scheme",
                                value: "Enabled (Standard 7/14 Marks)",
                            },
                        ].map((item) => (
                            <View key={item.label} style={styles.settingRow}>
                                <Text style={styles.settingLabel}>
                                    {item.label}
                                </Text>
                                <View style={styles.settingValue}>
                                    <Text style={styles.settingValueText}>
                                        {item.value}
                                    </Text>
                                    <Ionicons
                                        name="chevron-down"
                                        size={12}
                                        color={theme.muted}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </AppShell>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        container: {
            width: "100%",
            maxWidth: 1000,
            alignSelf: "center",
            gap: 20,
        },
        header: {
            marginBottom: 4,
        },
        eyebrow: {
            color: t.muted,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.8,
            marginBottom: 4,
        },
        title: {
            color: t.text,
            fontSize: 24,
            fontWeight: "700",
            letterSpacing: -0.3,
        },
        subtitle: {
            color: t.muted,
            fontSize: 13,
            marginTop: 4,
            lineHeight: 18,
        },
        section: {
            gap: 12,
        },
        sectionHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        sectionLabel: {
            color: t.text,
            fontSize: 15,
            fontWeight: "700",
        },
        emptyBox: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 14,
            padding: 28,
            alignItems: "center",
            gap: 10,
        },
        emptyIconCircle: {
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: t.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
        },
        emptyTitle: {
            color: t.text,
            fontSize: 15,
            fontWeight: "700",
        },
        emptyText: {
            color: t.muted,
            fontSize: 13,
            textAlign: "center",
            lineHeight: 19,
            maxWidth: 360,
        },
        button: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: t.accent,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 9,
            marginTop: 6,
        },
        buttonText: {
            color: "#FFFFFF",
            fontWeight: "700",
            fontSize: 13,
        },
        settingsCard: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 14,
            overflow: "hidden",
        },
        settingRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        settingLabel: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
        },
        settingValue: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: t.surfaceAlt,
            borderRadius: 6,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: t.border,
        },
        settingValueText: {
            color: t.textSecondary,
            fontSize: 12,
            fontWeight: "500",
        },
    });
}
