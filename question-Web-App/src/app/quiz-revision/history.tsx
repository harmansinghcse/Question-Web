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
            setError(err instanceof Error ? err.message : "Failed to load attempt history.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => { void loadHistory(1); }, 0);
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
        <AppShell active="revision">
            <View style={s.container}>
                {/* Header */}
                <View style={s.headerRow}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.8 }]}
                    >
                        <Ionicons name="arrow-back" size={18} color={theme.text} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Revision History</Text>
                        <Text style={s.headerSub}>
                            {total} completed practice {total === 1 ? "session" : "sessions"}
                        </Text>
                    </View>
                </View>

                {loading && !refreshing ? (
                    <View style={s.centerBox}>
                        <ActivityIndicator size="large" color={theme.accent} />
                        <Text style={s.loadingText}>Loading past attempts...</Text>
                    </View>
                ) : error ? (
                    <View style={s.errorBox}>
                        <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
                        <Text style={s.errorText}>{error}</Text>
                        <Pressable onPress={() => loadHistory(1)} style={s.retryBtn}>
                            <Text style={s.retryBtnText}>Retry</Text>
                        </Pressable>
                    </View>
                ) : attempts.length === 0 ? (
                    <View style={s.emptyCard}>
                        <View style={s.emptyIconWrap}>
                            <Ionicons name="flash-outline" size={32} color={theme.muted} />
                        </View>
                        <Text style={s.emptyTitle}>No Revision Attempts Yet</Text>
                        <Text style={s.emptySub}>
                            Start a quiz revision to test your knowledge with MCQs, Fillups, and True/False questions.
                        </Text>
                        <Pressable
                            onPress={() => router.replace("/quiz-revision" as never)}
                            style={s.startBtn}
                        >
                            <Text style={s.startBtnText}>Start Your First Revision</Text>
                        </Pressable>
                    </View>
                ) : (
                    <FlatList
                        data={attempts}
                        keyExtractor={(item) => String(item.attemptId)}
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
                                            params: { attemptId: String(item.attemptId) },
                                        } as never)
                                    }
                                    style={({ pressed }) => [
                                        s.attemptCard,
                                        pressed && { opacity: 0.9 },
                                    ]}
                                >
                                    <View style={s.attemptTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.subjectName} numberOfLines={1}>
                                                {item.subjectName}
                                            </Text>
                                            {item.chapterName ? (
                                                <Text style={s.chapterName} numberOfLines={1}>
                                                    {item.chapterName}
                                                </Text>
                                            ) : null}
                                            <Text style={s.attemptDate}>
                                                {formatDate(item.createdAt)} • {formatDuration(item.timeSpentSeconds)}
                                            </Text>
                                        </View>

                                        <View style={s.scoreBox}>
                                            <Text
                                                style={[
                                                    s.accuracyText,
                                                    isPassing ? { color: "#10B981" } : { color: "#F59E0B" },
                                                ]}
                                            >
                                                {item.accuracyPercentage}%
                                            </Text>
                                            <Text style={s.scoreText}>
                                                {item.score}/{item.totalQuestions}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={s.attemptFooter}>
                                        <View style={s.badgePills}>
                                            <View style={[s.miniPill, s.pillGreen]}>
                                                <Text style={[s.miniPillText, { color: "#10B981" }]}>
                                                    ✓ {item.correctCount}
                                                </Text>
                                            </View>
                                            <View style={[s.miniPill, s.pillRed]}>
                                                <Text style={[s.miniPillText, { color: "#EF4444" }]}>
                                                    ✕ {item.incorrectCount}
                                                </Text>
                                            </View>
                                            {item.unansweredCount > 0 && (
                                                <View style={[s.miniPill, s.pillGray]}>
                                                    <Text style={[s.miniPillText, { color: theme.muted }]}>
                                                        – {item.unansweredCount}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={s.reviewArrow}>
                                            <Text style={s.reviewLink}>Review</Text>
                                            <Ionicons name="chevron-forward" size={14} color={theme.accent} />
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
            gap: 16,
            paddingBottom: 40,
        },
        headerRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingBottom: 4,
        },
        backBtn: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: "center",
            justifyContent: "center",
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: "800",
            color: t.text,
        },
        headerSub: {
            fontSize: 12,
            color: t.muted,
        },
        centerBox: {
            padding: 40,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
        },
        loadingText: {
            fontSize: 13,
            color: t.muted,
        },
        errorBox: {
            padding: 20,
            backgroundColor: "#EF444415",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#EF444435",
            alignItems: "center",
            gap: 8,
        },
        errorText: {
            color: "#EF4444",
            fontSize: 13,
            textAlign: "center",
        },
        retryBtn: {
            marginTop: 4,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 6,
            backgroundColor: t.surface,
        },
        retryBtnText: {
            color: t.text,
            fontSize: 12,
            fontWeight: "600",
        },
        emptyCard: {
            backgroundColor: t.surface,
            borderRadius: 16,
            padding: 32,
            alignItems: "center",
            gap: 12,
            borderWidth: 1,
            borderColor: t.border,
            marginTop: 20,
        },
        emptyIconWrap: {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: t.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
        },
        emptyTitle: {
            fontSize: 16,
            fontWeight: "800",
            color: t.text,
        },
        emptySub: {
            fontSize: 13,
            color: t.muted,
            textAlign: "center",
            lineHeight: 18,
            maxWidth: 280,
        },
        startBtn: {
            marginTop: 8,
            backgroundColor: "#EF4444",
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 10,
        },
        startBtnText: {
            color: "#FFF",
            fontSize: 13,
            fontWeight: "700",
        },
        listContent: {
            gap: 12,
        },
        attemptCard: {
            backgroundColor: t.surface,
            borderRadius: 14,
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
            fontWeight: "500",
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
            paddingTop: 8,
            borderTopWidth: 1,
            borderColor: t.border,
        },
        badgePills: {
            flexDirection: "row",
            gap: 6,
        },
        miniPill: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 5,
        },
        miniPillText: {
            fontSize: 11,
            fontWeight: "700",
        },
        pillGreen: {
            backgroundColor: "#10B98115",
        },
        pillRed: {
            backgroundColor: "#EF444415",
        },
        pillGray: {
            backgroundColor: t.surfaceAlt,
        },
        reviewArrow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
        },
        reviewLink: {
            fontSize: 12,
            fontWeight: "700",
            color: t.accent,
        },
    });
}
