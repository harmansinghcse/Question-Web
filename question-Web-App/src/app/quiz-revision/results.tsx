import React, { useEffect, useState, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppShell from "../../components/AppShell";
import { useAppTheme } from "../../providers/ThemeProvider";
import {
    api,
    type SubmitQuizResponse,
    type SubmitQuizResponseItem,
} from "../../services/api";
import type { AppTheme } from "../../constants/theme";

export default function QuizRevisionResultsScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const params = useLocalSearchParams<{ attemptId?: string }>();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const attemptId = params.attemptId ? Number(params.attemptId) : null;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reviewData, setReviewData] = useState<SubmitQuizResponse | null>(null);
    const [retrying, setRetrying] = useState(false);
    const [reviewFilter, setReviewFilter] = useState<"ALL" | "CORRECT" | "INCORRECT" | "UNANSWERED">("ALL");

    // Fetch review details from backend
    useEffect(() => {
        if (!attemptId) {
            setError("No attempt ID provided.");
            setLoading(false);
            return;
        }

        let mounted = true;
        async function fetchReview() {
            setLoading(true);
            try {
                const res = await api.getQuizReview(attemptId!);
                if (mounted) {
                    setReviewData(res);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : "Failed to load quiz results.");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchReview();
        return () => {
            mounted = false;
        };
    }, [attemptId]);

    // Retry incorrect questions
    const handleRetryMissed = async () => {
        if (!attemptId || !reviewData) return;
        setRetrying(true);
        try {
            const res = await api.startQuiz({
                subjectKey: 0, // In retry mode, backend gets subject from attemptId
                retryAttemptId: attemptId,
            });

            router.push({
                pathname: "/quiz-revision/session",
                params: {
                    attemptId: String(res.attemptId),
                    payload: JSON.stringify(res),
                },
            } as never);
        } catch (err) {
            Alert.alert("Retry Failed", err instanceof Error ? err.message : "Could not initialize retry session.");
        } finally {
            setRetrying(false);
        }
    };

    // Filter questions
    const filteredQuestions = useMemo(() => {
        if (!reviewData?.questions) return [];
        return reviewData.questions.filter((q) => {
            if (reviewFilter === "CORRECT") return q.isCorrect;
            if (reviewFilter === "INCORRECT") return !q.isCorrect && q.studentAnswer !== null;
            if (reviewFilter === "UNANSWERED") return q.studentAnswer === null;
            return true;
        });
    }, [reviewData, reviewFilter]);

    const formatDuration = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        if (m === 0) return `${s}s`;
        return `${m}m ${s}s`;
    };

    if (loading) {
        return (
            <AppShell active="revision">
                <View style={s.centerBox}>
                    <ActivityIndicator size="large" color={theme.accent} />
                    <Text style={s.centerText}>Grading and loading review...</Text>
                </View>
            </AppShell>
        );
    }

    if (error || !reviewData) {
        return (
            <AppShell active="revision">
                <View style={s.centerBox}>
                    <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
                    <Text style={s.errorTitle}>Error Loading Results</Text>
                    <Text style={s.centerText}>{error || "Results data could not be found."}</Text>
                    <Pressable
                        onPress={() => router.replace("/quiz-revision" as never)}
                        style={s.returnBtn}
                    >
                        <Text style={s.returnBtnText}>Return to Revision Home</Text>
                    </Pressable>
                </View>
            </AppShell>
        );
    }

    const accuracy = reviewData.accuracyPercentage;
    const isPassing = accuracy >= 70;

    return (
        <AppShell active="revision">
            <View style={s.container}>
                {/* Score Summary Card */}
                <View style={s.summaryCard}>
                    <View style={s.summaryTop}>
                        <View style={s.summaryLeft}>
                            <View style={[s.badgeWrap, isPassing ? s.badgePass : s.badgeFail]}>
                                <Ionicons
                                    name={isPassing ? "trophy" : "analytics"}
                                    size={14}
                                    color={isPassing ? "#10B981" : "#F59E0B"}
                                />
                                <Text
                                    style={[
                                        s.badgeText,
                                        isPassing ? { color: "#10B981" } : { color: "#F59E0B" },
                                    ]}
                                >
                                    {isPassing ? "Revision Passed" : "Needs Practice"}
                                </Text>
                            </View>

                            <Text style={s.scoreBig}>
                                {reviewData.score} / {reviewData.totalQuestions}
                            </Text>
                            <Text style={s.timeSpent}>
                                Completed in {formatDuration(reviewData.timeSpentSeconds)}
                            </Text>
                        </View>

                        <View style={s.accuracyCircle}>
                            <Text style={[s.accuracyNum, isPassing ? { color: "#10B981" } : { color: "#F59E0B" }]}>
                                {accuracy}%
                            </Text>
                            <Text style={s.accuracyLabel}>Accuracy</Text>
                        </View>
                    </View>

                    {/* Counts Row */}
                    <View style={s.statsGrid}>
                        <View style={[s.statCard, s.statCorrect]}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={s.statVal}>{reviewData.correctCount}</Text>
                            <Text style={s.statLbl}>Correct</Text>
                        </View>
                        <View style={[s.statCard, s.statIncorrect]}>
                            <Ionicons name="close-circle" size={16} color="#EF4444" />
                            <Text style={s.statVal}>{reviewData.incorrectCount}</Text>
                            <Text style={s.statLbl}>Incorrect</Text>
                        </View>
                        <View style={[s.statCard, s.statUnanswered]}>
                            <Ionicons name="help-circle" size={16} color={theme.muted} />
                            <Text style={s.statVal}>{reviewData.unansweredCount}</Text>
                            <Text style={s.statLbl}>Skipped</Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={s.actionRow}>
                        {reviewData.incorrectCount > 0 && (
                            <Pressable
                                onPress={handleRetryMissed}
                                disabled={retrying}
                                style={({ pressed }) => [
                                    s.retryBtn,
                                    pressed && { opacity: 0.85 },
                                ]}
                            >
                                {retrying ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="refresh" size={16} color="#FFF" />
                                        <Text style={s.retryBtnText}>
                                            Retry Missed ({reviewData.incorrectCount})
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        )}

                        <Pressable
                            onPress={() => router.replace("/quiz-revision" as never)}
                            style={({ pressed }) => [
                                s.newRevisionBtn,
                                pressed && { opacity: 0.85 },
                            ]}
                        >
                            <Ionicons name="add-circle-outline" size={16} color={theme.text} />
                            <Text style={s.newRevisionBtnText}>New Revision</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Topic Breakdown (if available) */}
                {reviewData.topicPerformance && reviewData.topicPerformance.length > 0 && (
                    <View style={s.sectionCard}>
                        <Text style={s.sectionHeader}>Topic Performance</Text>
                        <View style={s.topicList}>
                            {reviewData.topicPerformance.map((tp) => (
                                <View key={tp.topicId} style={s.topicItem}>
                                    <View style={s.topicRow}>
                                        <Text style={s.topicName}>{tp.topicName}</Text>
                                        <Text style={s.topicScore}>
                                            {tp.correct}/{tp.total} ({tp.accuracy}%)
                                        </Text>
                                    </View>
                                    <View style={s.progressBarTrack}>
                                        <View
                                            style={[
                                                s.progressBarFill,
                                                {
                                                    width: `${tp.accuracy}%`,
                                                    backgroundColor:
                                                        tp.accuracy >= 70 ? "#10B981" : "#F59E0B",
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Detailed Questions Review */}
                <View style={s.sectionCard}>
                    <View style={s.reviewHeaderRow}>
                        <Text style={s.sectionHeader}>Answers Review</Text>
                        <View style={s.filterPills}>
                            {[
                                { key: "ALL", label: `All (${reviewData.totalQuestions})` },
                                { key: "CORRECT", label: `✓ ${reviewData.correctCount}` },
                                { key: "INCORRECT", label: `✕ ${reviewData.incorrectCount}` },
                            ].map((f) => (
                                <Pressable
                                    key={f.key}
                                    onPress={() => setReviewFilter(f.key as any)}
                                    style={[s.filterPill, reviewFilter === f.key && s.filterPillActive]}
                                >
                                    <Text
                                        style={[
                                            s.filterPillText,
                                            reviewFilter === f.key && s.filterPillTextActive,
                                        ]}
                                    >
                                        {f.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <View style={s.questionsList}>
                        {filteredQuestions.map((q, idx) => (
                            <QuestionReviewCard key={q.quizQuesId} item={q} index={idx + 1} theme={theme} />
                        ))}
                    </View>
                </View>
            </View>
        </AppShell>
    );
}

function QuestionReviewCard({
    item,
    index,
    theme,
}: {
    item: SubmitQuizResponseItem;
    index: number;
    theme: AppTheme;
}) {
    const isUnanswered = item.studentAnswer === null || item.studentAnswer === "";

    return (
        <View
            style={[
                styles.qCard,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                item.isCorrect
                    ? styles.qCardCorrect
                    : isUnanswered
                    ? styles.qCardUnanswered
                    : styles.qCardIncorrect,
            ]}
        >
            <View style={styles.qHeader}>
                <View style={styles.qTitleRow}>
                    <View
                        style={[
                            styles.statusDot,
                            item.isCorrect
                                ? { backgroundColor: "#10B981" }
                                : isUnanswered
                                ? { backgroundColor: theme.muted }
                                : { backgroundColor: "#EF4444" },
                        ]}
                    >
                        <Ionicons
                            name={
                                item.isCorrect
                                    ? "checkmark"
                                    : isUnanswered
                                    ? "remove"
                                    : "close"
                            }
                            size={12}
                            color="#FFF"
                        />
                    </View>
                    <Text style={[styles.qIndex, { color: theme.textSecondary }]}>Q{index}.</Text>
                    <View
                        style={[
                            styles.typeChip,
                            item.questionType === "FILLUPS"
                                ? { borderColor: "#A855F735", backgroundColor: "#A855F715" }
                                : item.questionType === "TRUE_FALSE"
                                ? { borderColor: "#F59E0B35", backgroundColor: "#F59E0B15" }
                                : { borderColor: "#3B82F635", backgroundColor: "#3B82F615" },
                        ]}
                    >
                        <Text
                            style={[
                                styles.typeChipText,
                                item.questionType === "FILLUPS"
                                    ? { color: "#A855F7" }
                                    : item.questionType === "TRUE_FALSE"
                                    ? { color: "#F59E0B" }
                                    : { color: "#3B82F6" },
                            ]}
                        >
                            {item.questionType}
                        </Text>
                    </View>
                </View>
            </View>

            <Text style={[styles.qText, { color: theme.text }]}>{item.quesText}</Text>

            {/* MCQ Options Display if applicable */}
            {item.questionType === "MCQ" && item.options && (
                <View style={styles.optionsWrap}>
                    {Object.entries(item.options).map(([k, text]) => {
                        const isStudent = item.studentAnswer === k;
                        const isExpected = item.correctAnswer === k;
                        return (
                            <View
                                key={k}
                                style={[
                                    styles.optionLine,
                                    { backgroundColor: theme.surface, borderColor: theme.border },
                                    isExpected && styles.optionLineCorrect,
                                    isStudent && !isExpected && styles.optionLineWrong,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.optKey,
                                        isExpected && { color: "#10B981" },
                                        isStudent && !isExpected && { color: "#EF4444" },
                                    ]}
                                >
                                    {k}.
                                </Text>
                                <Text
                                    style={[
                                        styles.optText,
                                        { color: theme.textSecondary },
                                        isExpected && { color: "#10B981", fontWeight: "700" },
                                        isStudent && !isExpected && { color: "#EF4444", fontWeight: "600" },
                                    ]}
                                >
                                    {text}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Fillups / TF Comparison */}
            {item.questionType !== "MCQ" && (
                <View style={styles.answerComparisonBox}>
                    <View style={styles.comparisonRow}>
                        <Text style={[styles.compLabel, { color: theme.muted }]}>Your Answer:</Text>
                        <Text
                            style={[
                                styles.compVal,
                                item.isCorrect ? { color: "#10B981" } : { color: "#EF4444" },
                            ]}
                        >
                            {isUnanswered ? "(No answer provided)" : item.studentAnswer}
                        </Text>
                    </View>

                    <View style={styles.comparisonRow}>
                        <Text style={[styles.compLabel, { color: theme.muted }]}>Expected:</Text>
                        <Text style={[styles.compVal, { color: "#10B981", fontWeight: "700" }]}>
                            {item.correctAnswer}
                        </Text>
                    </View>

                    {item.questionType === "FILLUPS" && item.acceptedAnswers && item.acceptedAnswers.length > 1 && (
                        <View style={styles.altsRow}>
                            <Text style={[styles.compLabel, { color: theme.muted }]}>Accepted:</Text>
                            <Text style={[styles.compVal, { color: theme.textSecondary }]}>
                                {item.acceptedAnswers.join(", ")}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Explanation card */}
            {item.explanation ? (
                <View style={styles.explanationBox}>
                    <Ionicons name="bulb-outline" size={14} color="#F59E0B" />
                    <Text style={[styles.explanationText, { color: theme.textSecondary }]}>
                        {item.explanation}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    qCard: {
        borderRadius: 14,
        padding: 16,
        borderWidth: 1.5,
        gap: 12,
    },
    qCardCorrect: {
        borderColor: "#10B98130",
    },
    qCardIncorrect: {
        borderColor: "#EF444440",
    },
    qCardUnanswered: {
        borderColor: "transparent",
    },
    qHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    qTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statusDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
    },
    qIndex: {
        fontSize: 13,
        fontWeight: "800",
    },
    typeChip: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 5,
        borderWidth: 1,
    },
    typeChipText: {
        fontSize: 10,
        fontWeight: "700",
    },
    qText: {
        fontSize: 14,
        fontWeight: "600",
        lineHeight: 20,
    },
    optionsWrap: {
        gap: 6,
    },
    optionLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    optionLineCorrect: {
        borderColor: "#10B981",
        backgroundColor: "#10B98115",
    },
    optionLineWrong: {
        borderColor: "#EF4444",
        backgroundColor: "#EF444415",
    },
    optKey: {
        fontSize: 12,
        fontWeight: "800",
        color: "#64748B",
    },
    optText: {
        fontSize: 13,
    },
    answerComparisonBox: {
        gap: 4,
        padding: 10,
        backgroundColor: "rgba(0,0,0,0.15)",
        borderRadius: 8,
    },
    comparisonRow: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
    },
    altsRow: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        marginTop: 2,
    },
    compLabel: {
        fontSize: 11,
        fontWeight: "600",
        width: 75,
    },
    compVal: {
        fontSize: 12,
        fontWeight: "600",
        flex: 1,
    },
    explanationBox: {
        flexDirection: "row",
        gap: 8,
        padding: 10,
        borderRadius: 8,
        backgroundColor: "#F59E0B10",
        borderWidth: 1,
        borderColor: "#F59E0B25",
        alignItems: "flex-start",
    },
    explanationText: {
        fontSize: 12,
        lineHeight: 18,
        flex: 1,
    },
});

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        container: {
            gap: 20,
            paddingBottom: 40,
        },
        centerBox: {
            padding: 40,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
        },
        centerText: {
            color: t.muted,
            fontSize: 13,
            textAlign: "center",
        },
        errorTitle: {
            fontSize: 18,
            fontWeight: "800",
            color: t.text,
        },
        returnBtn: {
            marginTop: 10,
            backgroundColor: t.accent,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 8,
        },
        returnBtnText: {
            color: "#FFF",
            fontSize: 13,
            fontWeight: "700",
        },
        summaryCard: {
            backgroundColor: t.surface,
            borderRadius: 18,
            padding: 20,
            borderWidth: 1,
            borderColor: t.border,
            gap: 18,
        },
        summaryTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        summaryLeft: {
            gap: 4,
        },
        badgeWrap: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            borderWidth: 1,
            alignSelf: "flex-start",
        },
        badgePass: {
            borderColor: "#10B98135",
            backgroundColor: "#10B98115",
        },
        badgeFail: {
            borderColor: "#F59E0B35",
            backgroundColor: "#F59E0B15",
        },
        badgeText: {
            fontSize: 11,
            fontWeight: "700",
            textTransform: "uppercase",
        },
        scoreBig: {
            fontSize: 28,
            fontWeight: "900",
            color: t.text,
            letterSpacing: -0.5,
        },
        timeSpent: {
            fontSize: 12,
            color: t.muted,
        },
        accuracyCircle: {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surfaceAlt,
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 2,
            borderColor: t.border,
        },
        accuracyNum: {
            fontSize: 20,
            fontWeight: "900",
        },
        accuracyLabel: {
            fontSize: 10,
            fontWeight: "600",
            color: t.muted,
            textTransform: "uppercase",
        },
        statsGrid: {
            flexDirection: "row",
            gap: 10,
        },
        statCard: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: t.surfaceAlt,
            gap: 3,
        },
        statCorrect: {
            borderWidth: 1,
            borderColor: "#10B98125",
        },
        statIncorrect: {
            borderWidth: 1,
            borderColor: "#EF444425",
        },
        statUnanswered: {
            borderWidth: 1,
            borderColor: t.border,
        },
        statVal: {
            fontSize: 16,
            fontWeight: "800",
            color: t.text,
        },
        statLbl: {
            fontSize: 10,
            fontWeight: "600",
            color: t.muted,
            textTransform: "uppercase",
        },
        actionRow: {
            flexDirection: "row",
            gap: 10,
            paddingTop: 4,
        },
        retryBtn: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: "#EF4444",
            paddingVertical: 12,
            borderRadius: 12,
        },
        retryBtnText: {
            color: "#FFF",
            fontSize: 13,
            fontWeight: "700",
        },
        newRevisionBtn: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: t.surfaceAlt,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
        },
        newRevisionBtnText: {
            color: t.text,
            fontSize: 13,
            fontWeight: "700",
        },
        sectionCard: {
            backgroundColor: t.surface,
            borderRadius: 16,
            padding: 18,
            borderWidth: 1,
            borderColor: t.border,
            gap: 14,
        },
        sectionHeader: {
            fontSize: 14,
            fontWeight: "800",
            color: t.text,
            textTransform: "uppercase",
            letterSpacing: 0.5,
        },
        topicList: {
            gap: 12,
        },
        topicItem: {
            gap: 6,
        },
        topicRow: {
            flexDirection: "row",
            justifyContent: "space-between",
        },
        topicName: {
            fontSize: 12,
            fontWeight: "600",
            color: t.text,
        },
        topicScore: {
            fontSize: 11,
            fontWeight: "700",
            color: t.muted,
        },
        progressBarTrack: {
            height: 6,
            backgroundColor: t.surfaceAlt,
            borderRadius: 3,
            overflow: "hidden",
        },
        progressBarFill: {
            height: "100%",
            borderRadius: 3,
        },
        reviewHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
        },
        filterPills: {
            flexDirection: "row",
            gap: 6,
        },
        filterPill: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        filterPillActive: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },
        filterPillText: {
            fontSize: 11,
            fontWeight: "600",
            color: t.textSecondary,
        },
        filterPillTextActive: {
            color: "#FFF",
            fontWeight: "700",
        },
        questionsList: {
            gap: 12,
        },
    });
}
