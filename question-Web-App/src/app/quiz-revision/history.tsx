import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppShell from "../../components/AppShell";
import { useAppTheme } from "../../providers/ThemeProvider";
import { api, type QuizHistoryAttempt } from "../../services/api";
import type { AppTheme } from "../../constants/theme";

export default function QuizRevisionHistoryScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const [attempts, setAttempts] = useState<QuizHistoryAttempt[]>([]);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = useCallback(async (pageNum = 1, isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const res = await api.getQuizHistory(pageNum, 15);
            setAttempts(res.items || []);
            setTotal(res.total || 0);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load attempt history.",
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadHistory(1);
        }, 0);
        return () => clearTimeout(timer);
    }, [loadHistory]);

    const formatDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return isoString;
        }
    };

    const formatDuration = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        if (m === 0) return `${sec}s`;
        return `${m}m ${sec}s`;
    };

    return (
        <AppShell active="revision" scrollable={false}>
            <View style={s.container}>
                {/* Header */}
                <View style={s.headerRow}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [
                            s.backBtn,
                            pressed && { opacity: 0.8 },
                        ]}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={18}
                            color={theme.text}
                        />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Revision History</Text>
                        <Text style={s.headerSub}>
                            {total} completed practice{" "}
                            {total === 1 ? "session" : "sessions"}
                        </Text>
                    </View>
                </View>

                {loading && !refreshing ? (
                    <View style={s.centerBox}>
                        <ActivityIndicator size="large" color={theme.accent} />
                        <Text style={s.loadingText}>
                            Loading past attempts...
                        </Text>
                    </View>
                ) : error ? (
                    <View style={s.errorBox}>
                        <Ionicons
                            name="alert-circle-outline"
                            size={28}
                            color={theme.danger}
                        />
                        <Text style={s.errorText}>{error}</Text>
                        <Pressable
                            onPress={() => loadHistory(1)}
                            style={s.retryBtn}
                        >
                            <Text style={s.retryBtnText}>Retry</Text>
                        </Pressable>
                    </View>
                ) : attempts.length === 0 ? (
                    <View style={s.emptyCard}>
                        <View style={s.emptyIconWrap}>
                            <Ionicons
                                name="flash-outline"
                                size={32}
                                color={theme.accent}
                            />
                        </View>
                        <Text style={s.emptyTitle}>
                            No Revision Attempts Yet
                        </Text>
                        <Text style={s.emptySub}>
                            Start a quiz revision to test your knowledge with MCQs, Fillups, and True/False questions.
                        </Text>
                        <Pressable
                            onPress={() =>
                                router.replace("/quiz-revision" as never)
                            }
                            style={s.startBtn}
                        >
                            <Text style={s.startBtnText}>
                                Start Your First Revision
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    <FlatList
                        style={{ flex: 1, minHeight: 0 }}
                        data={attempts}
                        keyExtractor={(item) => String(item.attemptId)}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => loadHistory(1, true)}
                                tintColor={theme.accent}
                            />
                        }
                        contentContainerStyle={s.listContent}
                        renderItem={({ item }) => {
                            const isPassing = item.accuracyPercentage >= 70;
                            return (
                                <Pressable
                                    onPress={() =>
                                        router.push({
                                            pathname: "/quiz-revision/results",
                                            params: {
                                                attemptId: String(
                                                    item.attemptId,
                                                ),
                                            },
                                        } as never)
                                    }
                                    style={({ pressed }) => [
                                        s.attemptCard,
                                        pressed && { opacity: 0.9 },
                                    ]}
                                >
                                    <View style={s.attemptTop}>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text
                                                style={s.subjectName}
                                                numberOfLines={1}
                                            >
                                                {item.subjectName}
                                            </Text>
                                            {item.chapterName ? (
                                                <Text
                                                    style={s.chapterName}
                                                    numberOfLines={1}
                                                >
                                                    {item.chapterName}
                                                </Text>
                                            ) : null}
                                            <Text style={s.attemptDate}>
                                                {formatDate(item.createdAt)} •{" "}
                                                {formatDuration(
                                                    item.timeSpentSeconds,
                                                )}
                                            </Text>
                                        </View>

                                        <View style={s.scoreBox}>
                                            <Text
                                                style={[
                                                    s.accuracyText,
                                                    isPassing
                                                        ? {
                                                              color: theme.success,
                                                          }
                                                        : {
                                                              color: theme.warning,
                                                          },
                                                ]}
                                            >
                                                {item.accuracyPercentage}%
                                            </Text>
                                            <Text style={s.scoreText}>
                                                {item.score}/
                                                {item.totalQuestions}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={s.attemptFooter}>
                                        <View style={s.badgePills}>
                                            <View
                                                style={[
                                                    s.miniPill,
                                                    s.pillGreen,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        s.miniPillText,
                                                        {
                                                            color: theme.success,
                                                        },
                                                    ]}
                                                >
                                                    ✓ {item.correctCount}
                                                </Text>
                                            </View>
                                            <View
                                                style={[s.miniPill, s.pillRed]}
                                            >
                                                <Text
                                                    style={[
                                                        s.miniPillText,
                                                        { color: theme.danger },
                                                    ]}
                                                >
                                                    ✕ {item.incorrectCount}
                                                </Text>
                                            </View>
                                            {item.unansweredCount > 0 && (
                                                <View
                                                    style={[
                                                        s.miniPill,
                                                        s.pillGray,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            s.miniPillText,
                                                            {
                                                                color: theme.textSecondary,
                                                            },
                                                        ]}
                                                    >
                                                        – {item.unansweredCount}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={s.reviewArrow}>
                                            <Text style={s.reviewLink}>
                                                Review
                                            </Text>
                                            <Ionicons
                                                name="chevron-forward"
                                                size={14}
                                                color={theme.accent}
                                            />
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        }}
                    />
                )}
            </View>
        </AppShell>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            minHeight: 0,
            gap: 16,
            width: "100%",
            maxWidth: 880,
            alignSelf: "center",
        },
        headerRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingBottom: 4,
        },
        backBtn: {
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: "center",
            justifyContent: "center",
        },
        headerTitle: {
            fontSize: 22,
            fontWeight: "800",
            color: t.text,
            letterSpacing: -0.3,
        },
        headerSub: {
            fontSize: 12,
            color: t.textSecondary,
            marginTop: 2,
        },
        centerBox: {
            padding: 40,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
        },
        loadingText: {
            color: t.textSecondary,
            fontSize: 13,
        },
        errorBox: {
            padding: 20,
            backgroundColor: t.danger + "15",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.danger + "30",
            alignItems: "center",
            gap: 8,
        },
        errorText: {
            color: t.danger,
            fontSize: 13,
            textAlign: "center",
        },
        retryBtn: {
            marginTop: 8,
            backgroundColor: t.accent,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
        },
        retryBtnText: {
            color: "#FFF",
            fontSize: 12,
            fontWeight: "700",
        },
        emptyCard: {
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 32,
            alignItems: "center",
            gap: 10,
            marginTop: 10,
        },
        emptyIconWrap: {
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: t.accentSoft,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
        },
        emptyTitle: {
            fontSize: 16,
            fontWeight: "700",
            color: t.text,
        },
        emptySub: {
            fontSize: 13,
            color: t.textSecondary,
            textAlign: "center",
            lineHeight: 19,
            maxWidth: 380,
        },
        startBtn: {
            marginTop: 8,
            backgroundColor: t.accent,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 10,
        },
        startBtnText: {
            color: "#FFF",
            fontSize: 13,
            fontWeight: "700",
        },
        listContent: {
            gap: 12,
            paddingBottom: 96,
        },
        attemptCard: {
            backgroundColor: t.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: t.border,
            gap: 12,
        },
        attemptTop: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
        },
        subjectName: {
            fontSize: 15,
            fontWeight: "700",
            color: t.text,
        },
        chapterName: {
            fontSize: 12,
            color: t.textSecondary,
            marginTop: 2,
        },
        attemptDate: {
            fontSize: 11,
            color: t.muted,
            marginTop: 4,
        },
        scoreBox: {
            alignItems: "flex-end",
            gap: 2,
        },
        accuracyText: {
            fontSize: 18,
            fontWeight: "900",
        },
        scoreText: {
            fontSize: 11,
            color: t.muted,
            fontWeight: "600",
        },
        attemptFooter: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: t.border,
        },
        badgePills: {
            flexDirection: "row",
            gap: 6,
        },
        miniPill: {
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 5,
            borderWidth: 1,
        },
        pillGreen: {
            borderColor: t.success + "30",
            backgroundColor: t.success + "12",
        },
        pillRed: {
            borderColor: t.danger + "30",
            backgroundColor: t.danger + "12",
        },
        pillGray: {
            borderColor: t.border,
            backgroundColor: t.surfaceAlt,
        },
        miniPillText: {
            fontSize: 10,
            fontWeight: "700",
        },
        reviewArrow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
        },
        reviewLink: {
            fontSize: 12,
            fontWeight: "700",
            color: t.accent,
        },
    });
}
