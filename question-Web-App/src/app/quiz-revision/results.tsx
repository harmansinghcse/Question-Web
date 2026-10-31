import React, { useEffect, useState, useMemo } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
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
            const timer = setTimeout(() => {
                setError("No attempt ID provided.");
                setLoading(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        let mounted = true;
        void api.getQuizReview(attemptId)
            .then((res) => {
                if (mounted) {
                    setReviewData(res);
                }
            })
            .catch((err) => {
                if (mounted) {
                    setError(err instanceof Error ? err.message : "Failed to load quiz results.");
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

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
        const sec = totalSec % 60;
        if (m === 0) return `${sec}s`;
        return `${m}m ${sec}s`;
    };

    if (loading) {
        return (
            <AppShell active="revision">
                <View style={s.centerBox}>
                    <ActivityIndicator size="large" color={theme.accent} />
                    <Text style={s.centerText}>Grading and preparing review report...</Text>
                </View>
            </AppShell>
        );
    }

    if (error || !reviewData) {
        return (
            <AppShell active="revision">
                <View style={s.centerBox}>
                    <Ionicons name="alert-circle-outline" size={44} color={theme.danger} />
                    <Text style={s.errorTitle}>Error Loading Results</Text>
                    <Text style={s.centerText}>{error || "Results data could not be found."}</Text>
                    <Pressable
                        onPress={() => router.replace("/quiz-revision" as never)}
                        style={s.returnBtn}
                    >
                        <Text style={s.returnBtnText}>Return to Quiz Setup</Text>
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
                                    name={isPassing ? "trophy" : "sparkles"}
                                    size={14}
                                    color={isPassing ? theme.success : theme.warning}
                                />
                                <Text
                                    style={[
                                        s.badgeText,
                                        isPassing ? { color: theme.success } : { color: theme.warning },
                                    ]}
                                >
                                    {isPassing ? "Revision Mastered" : "Revision Completed"}
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
                            <Text style={[s.accuracyNum, isPassing ? { color: theme.success } : { color: theme.warning }]}>
                                {accuracy}%
                            </Text>
                            <Text style={s.accuracyLabel}>Accuracy</Text>
                        </View>
                    </View>

                    {/* Counts Row */}
                    <View style={s.statsGrid}>
                        <View style={[s.statCard, s.statCorrect]}>
                            <Ionicons name="checkmark-circle" size={17} color={theme.success} />
                            <Text style={s.statVal}>{reviewData.correctCount}</Text>
                            <Text style={s.statLbl}>Correct</Text>
                        </View>
                        <View style={[s.statCard, s.statIncorrect]}>
                            <Ionicons name="close-circle" size={17} color={theme.danger} />
                            <Text style={s.statVal}>{reviewData.incorrectCount}</Text>
                            <Text style={s.statLbl}>Incorrect</Text>
                        </View>
                        <View style={[s.statCard, s.statUnanswered]}>
                            <Ionicons name="help-circle" size={17} color={theme.textSecondary} />
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
                                                        tp.accuracy >= 70 ? theme.success : theme.warning,
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
                    ? { borderColor: theme.success + "50" }
                    : isUnanswered
                    ? { borderColor: theme.border }
                    : { borderColor: theme.danger + "50" },
            ]}
        >
            <View style={styles.qHeader}>
                <View style={styles.qTitleRow}>
                    <View
                        style={[
                            styles.statusDot,
                            item.isCorrect
                                ? { backgroundColor: theme.success }
                                : isUnanswered
                                ? { backgroundColor: theme.muted }
                                : { backgroundColor: theme.danger },
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
                                ? { borderColor: theme.accent + "35", backgroundColor: theme.accentSoft }
                                : item.questionType === "TRUE_FALSE"
                                ? { borderColor: theme.warning + "35", backgroundColor: theme.warning + "15" }
                                : { borderColor: theme.secondaryAccent + "35", backgroundColor: theme.secondaryAccent + "15" },
                        ]}
                    >
                        <Text
                            style={[
                                styles.typeChipText,
                                item.questionType === "FILLUPS"
                                    ? { color: theme.accent }
                                    : item.questionType === "TRUE_FALSE"
                                    ? { color: theme.warning }
                                    : { color: theme.secondaryAccent },
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
                                    isExpected && { borderColor: theme.success, backgroundColor: theme.success + "15" },
                                    isStudent && !isExpected && { borderColor: theme.danger, backgroundColor: theme.danger + "15" },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.optKey,
                                        isExpected && { color: theme.success },
                                        isStudent && !isExpected && { color: theme.danger },
                                    ]}
                                >
                                    {k}.
                                </Text>
                                <Text
                                    style={[
                                        styles.optText,
                                        { color: theme.textSecondary },
                                        isExpected && { color: theme.success, fontWeight: "700" },
                                        isStudent && !isExpected && { color: theme.danger, fontWeight: "600" },
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
                <View style={[styles.answerComparisonBox, { backgroundColor: theme.surface }]}>
                    <View style={styles.comparisonRow}>
                        <Text style={[styles.compLabel, { color: theme.textSecondary }]}>Your Answer:</Text>
                        <Text
                            style={[
                                styles.compVal,
                                item.isCorrect ? { color: theme.success } : { color: theme.danger },
                            ]}
                        >
                            {isUnanswered ? "(No answer provided)" : item.studentAnswer}
                        </Text>
                    </View>

                    <View style={styles.comparisonRow}>
                        <Text style={[styles.compLabel, { color: theme.textSecondary }]}>Expected:</Text>
                        <Text style={[styles.compVal, { color: theme.success, fontWeight: "700" }]}>
                            {item.correctAnswer}
                        </Text>
                    </View>

                    {item.questionType === "FILLUPS" && item.acceptedAnswers && item.acceptedAnswers.length > 1 && (
                        <View style={styles.altsRow}>
                            <Text style={[styles.compLabel, { color: theme.textSecondary }]}>Accepted:</Text>
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
                    <Ionicons name="bulb-outline" size={14} color={theme.warning} />
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
        lineHeight: 21,
    },
    optionsWrap: {
        gap: 6,
    },
    optionLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 8,
        borderWidth: 1,
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
        gap: 6,
        padding: 12,
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
        width: 80,
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
        backgroundColor: "rgba(245, 158, 11, 0.10)",
        borderWidth: 1,
        borderColor: "rgba(245, 158, 11, 0.25)",
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
            width: "100%",
            maxWidth: 880,
            alignSelf: "center",
        },
        centerBox: {
            padding: 40,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
        },
        centerText: {
            color: t.textSecondary,
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
            padding: 22,
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
            paddingHorizontal: 9,
            paddingVertical: 3.5,
            borderRadius: 6,
            borderWidth: 1,
            alignSelf: "flex-start",
        },
        badgePass: {
            borderColor: t.success + "40",
            backgroundColor: t.success + "15",
        },
        badgeFail: {
            borderColor: t.warning + "40",
            backgroundColor: t.warning + "15",
        },
        badgeText: {
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.4,
        },
        scoreBig: {
            fontSize: 32,
            fontWeight: "900",
            color: t.text,
            letterSpacing: -0.6,
        },
        timeSpent: {
            fontSize: 12,
            color: t.textSecondary,
        },
        accuracyCircle: {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surfaceAlt,
            width: 84,
            height: 84,
            borderRadius: 42,
            borderWidth: 2,
            borderColor: t.border,
        },
        accuracyNum: {
            fontSize: 22,
            fontWeight: "900",
        },
        accuracyLabel: {
            fontSize: 10,
            fontWeight: "600",
            color: t.textSecondary,
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
            borderColor: t.success + "30",
        },
        statIncorrect: {
            borderWidth: 1,
            borderColor: t.danger + "30",
        },
        statUnanswered: {
            borderWidth: 1,
            borderColor: t.border,
        },
        statVal: {
            fontSize: 17,
            fontWeight: "800",
            color: t.text,
        },
        statLbl: {
            fontSize: 10,
            fontWeight: "600",
            color: t.textSecondary,
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
            backgroundColor: t.accent,
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
            borderRadius: 18,
            padding: 20,
            borderWidth: 1,
            borderColor: t.border,
            gap: 14,
        },
        sectionHeader: {
            fontSize: 14,
            fontWeight: "800",
            color: t.text,
            letterSpacing: 0.4,
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
            color: t.textSecondary,
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
            paddingHorizontal: 9,
            paddingVertical: 5,
            borderRadius: 7,
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
