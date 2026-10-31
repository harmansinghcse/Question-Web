import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../providers/ThemeProvider";
import {
    api,
    type StartQuizResponse,
    type QuizSessionQuestion,
} from "../../services/api";
import type { AppTheme } from "../../constants/theme";

export default function QuizRevisionSessionScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useAppTheme();
    const params = useLocalSearchParams<{ attemptId?: string; payload?: string }>();
    const s = useMemo(() => makeStyles(theme), [theme]);

    // Parse session payload
    const quizData = useMemo<StartQuizResponse | null>(() => {
        if (!params.payload) return null;
        try {
            return JSON.parse(params.payload);
        } catch {
            return null;
        }
    }, [params.payload]);

    const attemptId = useMemo(() => {
        if (params.attemptId) return Number(params.attemptId);
        return quizData?.attemptId ?? null;
    }, [params.attemptId, quizData]);

    const questions: QuizSessionQuestion[] = useMemo(() => {
        return quizData?.questions || [];
    }, [quizData]);

    // Session State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Timer
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setSecondsElapsed((sec) => sec + 1);
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const formatTimer = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${m < 10 ? "0" : ""}${m}:${sec < 10 ? "0" : ""}${sec}`;
    };

    const currentQ = questions[currentIndex];
    const totalQ = questions.length;

    // Answer handlers
    const handleSelectAnswer = (ans: string) => {
        if (!currentQ) return;
        setAnswers((prev) => ({
            ...prev,
            [currentQ.quizQuesId]: ans,
        }));
    };

    // Calculate answered vs unanswered
    const answeredCount = useMemo(() => {
        return Object.keys(answers).filter((k) => {
            const val = answers[Number(k)];
            return typeof val === "string" && val.trim().length > 0;
        }).length;
    }, [answers]);

    const unansweredCount = totalQ - answeredCount;

    // Submit handler
    const executeSubmit = async () => {
        if (!attemptId) return;
        setSubmitting(true);
        setShowConfirmModal(false);
        try {
            const formattedResponses = questions.map((q) => ({
                quizQuesId: q.quizQuesId,
                selectedAnswer: answers[q.quizQuesId] ?? null,
            }));

            await api.submitQuiz(attemptId, {
                responses: formattedResponses,
                timeSpentSeconds: secondsElapsed,
            });

            // Redirect to results
            router.replace({
                pathname: "/quiz-revision/results",
                params: { attemptId: String(attemptId) },
            } as never);
        } catch (err) {
            Alert.alert(
                "Submission Error",
                err instanceof Error ? err.message : "Failed to grade quiz answers."
            );
            setSubmitting(false);
        }
    };

    const handlePromptSubmit = () => {
        if (unansweredCount > 0) {
            setShowConfirmModal(true);
        } else {
            executeSubmit();
        }
    };

    // Exit confirmation
    const handleExit = () => {
        Alert.alert(
            "Quit Quiz Session?",
            "Your progress in this session will not be saved or graded.",
            [
                { text: "Continue Quiz", style: "cancel" },
                {
                    text: "Exit",
                    style: "destructive",
                    onPress: () => router.back(),
                },
            ]
        );
    };

    if (!quizData || questions.length === 0) {
        return (
            <View style={[s.centerScreen, { paddingTop: insets.top }]}>
                <Ionicons name="alert-circle-outline" size={44} color={theme.danger} />
                <Text style={s.centerTitle}>Quiz Session Not Found</Text>
                <Text style={s.centerSub}>Could not load the revision questions.</Text>
                <Pressable onPress={() => router.back()} style={s.primaryBtn}>
                    <Text style={s.primaryBtnText}>Return to Quiz Setup</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[s.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
            {/* Top Navigation Bar */}
            <View style={s.topBar}>
                <Pressable onPress={handleExit} hitSlop={10} style={s.exitBtn}>
                    <Ionicons name="close" size={20} color={theme.textSecondary} />
                </Pressable>

                <View style={s.progressTitleBlock}>
                    <Text style={s.progressTitle}>
                        Question {currentIndex + 1} of {totalQ}
                    </Text>
                    <View style={s.timerPill}>
                        <Ionicons name="time-outline" size={13} color={theme.accent} />
                        <Text style={s.timerText}>{formatTimer(secondsElapsed)}</Text>
                    </View>
                </View>

                <Pressable
                    onPress={handlePromptSubmit}
                    disabled={submitting}
                    style={({ pressed }) => [s.submitPill, pressed && { opacity: 0.85 }]}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={s.submitPillText}>Submit</Text>
                    )}
                </Pressable>
            </View>

            {/* Question Palette Indicator */}
            <View style={s.paletteContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.paletteScroll}
                >
                    {questions.map((q, idx) => {
                        const isCurrent = idx === currentIndex;
                        const isAnswered =
                            typeof answers[q.quizQuesId] === "string" &&
                            answers[q.quizQuesId].trim().length > 0;
                        return (
                            <Pressable
                                key={q.quizQuesId}
                                onPress={() => setCurrentIndex(idx)}
                                style={[
                                    s.dot,
                                    isAnswered && s.dotAnswered,
                                    isCurrent && s.dotCurrent,
                                ]}
                            >
                                <Text
                                    style={[
                                        s.dotText,
                                        isAnswered && s.dotTextAnswered,
                                        isCurrent && s.dotTextCurrent,
                                    ]}
                                >
                                    {idx + 1}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Main Question Card Area */}
            <ScrollView
                style={s.contentScroll}
                contentContainerStyle={s.contentScrollInner}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={s.questionCard}>
                    {/* Meta Badges */}
                    <View style={s.metaRow}>
                        <View style={s.typeBadge}>
                            <Ionicons
                                name={
                                    currentQ.questionType === "FILLUPS"
                                        ? "create-outline"
                                        : currentQ.questionType === "TRUE_FALSE"
                                        ? "checkmark-done-outline"
                                        : "list-outline"
                                }
                                size={12}
                                color={theme.accent}
                            />
                            <Text style={s.typeBadgeText}>
                                {currentQ.questionType === "FILLUPS"
                                    ? "Fill in the Blanks"
                                    : currentQ.questionType === "TRUE_FALSE"
                                    ? "True / False"
                                    : "Multiple Choice"}
                            </Text>
                        </View>

                        <View
                            style={[
                                s.diffBadge,
                                currentQ.difficulty === "EASY"
                                    ? { borderColor: theme.success + "40", backgroundColor: theme.success + "15" }
                                    : currentQ.difficulty === "HARD"
                                    ? { borderColor: theme.danger + "40", backgroundColor: theme.danger + "15" }
                                    : { borderColor: theme.warning + "40", backgroundColor: theme.warning + "15" },
                            ]}
                        >
                            <Text
                                style={[
                                    s.diffBadgeText,
                                    currentQ.difficulty === "EASY"
                                        ? { color: theme.success }
                                        : currentQ.difficulty === "HARD"
                                        ? { color: theme.danger }
                                        : { color: theme.warning },
                                ]}
                            >
                                {currentQ.difficulty}
                            </Text>
                        </View>
                    </View>

                    {/* Question Statement */}
                    <Text style={s.questionText}>{currentQ.quesText}</Text>

                    {/* Dynamic Answer Component */}
                    <View style={s.interactiveZone}>
                        {/* 1. MCQ OPTIONS */}
                        {currentQ.questionType === "MCQ" && currentQ.options && (
                            <View style={s.optionsContainer}>
                                {Object.entries(currentQ.options).map(([optKey, optText]) => {
                                    const selected = answers[currentQ.quizQuesId] === optKey;
                                    return (
                                        <Pressable
                                            key={optKey}
                                            onPress={() => handleSelectAnswer(optKey)}
                                            style={[s.optionItem, selected && s.optionItemSelected]}
                                        >
                                            <View
                                                style={[
                                                    s.optionKeyBox,
                                                    selected && s.optionKeyBoxSelected,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        s.optionKeyText,
                                                        selected && s.optionKeyTextSelected,
                                                    ]}
                                                >
                                                    {optKey}
                                                </Text>
                                            </View>
                                            <Text
                                                style={[
                                                    s.optionItemText,
                                                    selected && s.optionItemTextSelected,
                                                ]}
                                            >
                                                {optText}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}

                        {/* 2. FILL IN THE BLANKS */}
                        {currentQ.questionType === "FILLUPS" && (
                            <View style={s.fillupsContainer}>
                                <Text style={s.fillupPrompt}>Type your answer below:</Text>
                                <TextInput
                                    value={answers[currentQ.quizQuesId] || ""}
                                    onChangeText={handleSelectAnswer}
                                    placeholder="Enter your answer here..."
                                    placeholderTextColor={theme.muted}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    style={s.fillupInput}
                                />
                                <Text style={s.fillupHint}>
                                    Grading is case-insensitive and normalizes spacing automatically.
                                </Text>
                            </View>
                        )}

                        {/* 3. TRUE / FALSE */}
                        {currentQ.questionType === "TRUE_FALSE" && (
                            <View style={s.tfContainer}>
                                {["TRUE", "FALSE"].map((val) => {
                                    const isSel =
                                        (answers[currentQ.quizQuesId] || "").toUpperCase() === val;
                                    const isTrue = val === "TRUE";
                                    return (
                                        <Pressable
                                            key={val}
                                            onPress={() => handleSelectAnswer(val)}
                                            style={[
                                                s.tfCard,
                                                isSel && (isTrue ? s.tfCardTrue : s.tfCardFalse),
                                            ]}
                                        >
                                            <Ionicons
                                                name={
                                                    isTrue
                                                        ? isSel
                                                            ? "checkmark-circle"
                                                            : "checkmark-circle-outline"
                                                        : isSel
                                                        ? "close-circle"
                                                        : "close-circle-outline"
                                                }
                                                size={30}
                                                color={
                                                    isSel
                                                        ? "#FFF"
                                                        : isTrue
                                                        ? theme.success
                                                        : theme.danger
                                                }
                                            />
                                            <Text
                                                style={[
                                                    s.tfText,
                                                    isSel && s.tfTextActive,
                                                    !isSel && { color: isTrue ? theme.success : theme.danger },
                                                ]}
                                            >
                                                {val}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={s.bottomActionBar}>
                <Pressable
                    disabled={currentIndex === 0}
                    onPress={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                    style={[s.navBtn, currentIndex === 0 && s.navBtnDisabled]}
                >
                    <Ionicons name="arrow-back" size={16} color={theme.textSecondary} />
                    <Text style={s.navBtnText}>Previous</Text>
                </Pressable>

                {currentIndex < totalQ - 1 ? (
                    <Pressable
                        onPress={() => setCurrentIndex((idx) => Math.min(totalQ - 1, idx + 1))}
                        style={s.nextBtn}
                    >
                        <Text style={s.nextBtnText}>Next</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFF" />
                    </Pressable>
                ) : (
                    <Pressable
                        onPress={handlePromptSubmit}
                        disabled={submitting}
                        style={s.finishBtn}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Text style={s.finishBtnText}>Submit Quiz</Text>
                                <Ionicons name="checkmark-done" size={16} color="#FFF" />
                            </>
                        )}
                    </Pressable>
                )}
            </View>

            {/* Incomplete Submission Confirmation Modal */}
            {showConfirmModal && (
                <View style={s.modalOverlay}>
                    <View style={s.modalCard}>
                        <View style={s.modalIconWrap}>
                            <Ionicons name="help-circle" size={32} color={theme.warning} />
                        </View>
                        <Text style={s.modalTitle}>Submit Quiz?</Text>
                        <Text style={s.modalSub}>
                            You have left <Text style={{ color: theme.danger, fontWeight: "700" }}>{unansweredCount}</Text> of {totalQ} questions unanswered. Unanswered questions will receive 0 marks.
                        </Text>

                        <View style={s.modalBtnRow}>
                            <Pressable
                                onPress={() => setShowConfirmModal(false)}
                                style={s.modalCancelBtn}
                            >
                                <Text style={s.modalCancelText}>Review Answers</Text>
                            </Pressable>
                            <Pressable
                                onPress={executeSubmit}
                                style={s.modalSubmitBtn}
                            >
                                <Text style={s.modalSubmitText}>Submit Anyway</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: t.background,
        },
        centerScreen: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 30,
            gap: 12,
            backgroundColor: t.background,
        },
        centerTitle: {
            fontSize: 20,
            fontWeight: "800",
            color: t.text,
        },
        centerSub: {
            fontSize: 13,
            color: t.textSecondary,
            textAlign: "center",
        },
        primaryBtn: {
            marginTop: 12,
            backgroundColor: t.accent,
            paddingHorizontal: 22,
            paddingVertical: 12,
            borderRadius: 10,
        },
        primaryBtnText: {
            color: "#FFF",
            fontSize: 14,
            fontWeight: "700",
        },
        topBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
        },
        exitBtn: {
            padding: 8,
            borderRadius: 9,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        progressTitleBlock: {
            alignItems: "center",
            gap: 3,
        },
        progressTitle: {
            fontSize: 14,
            fontWeight: "800",
            color: t.text,
        },
        timerPill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: t.accentSoft,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
        },
        timerText: {
            fontSize: 11,
            fontWeight: "700",
            color: t.accent,
            fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        },
        submitPill: {
            backgroundColor: t.accent,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 9,
            shadowColor: t.accent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2,
        },
        submitPillText: {
            color: "#FFF",
            fontSize: 12,
            fontWeight: "700",
        },
        paletteContainer: {
            borderBottomWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
            paddingVertical: 10,
        },
        paletteScroll: {
            paddingHorizontal: 18,
            gap: 8,
        },
        dot: {
            width: 34,
            height: 34,
            borderRadius: 9,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        dotAnswered: {
            backgroundColor: t.success + "20",
            borderColor: t.success,
        },
        dotCurrent: {
            borderColor: t.accent,
            backgroundColor: t.accent,
        },
        dotText: {
            fontSize: 12,
            fontWeight: "600",
            color: t.textSecondary,
        },
        dotTextAnswered: {
            color: t.success,
            fontWeight: "700",
        },
        dotTextCurrent: {
            color: "#FFF",
            fontWeight: "800",
        },
        contentScroll: {
            flex: 1,
        },
        contentScrollInner: {
            padding: 18,
            maxWidth: 820,
            width: "100%",
            alignSelf: "center",
        },
        questionCard: {
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 20,
            gap: 16,
        },
        metaRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        typeBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: t.accentSoft,
            borderWidth: 1,
            borderColor: t.accent + "33",
        },
        typeBadgeText: {
            fontSize: 11,
            fontWeight: "700",
            color: t.accent,
        },
        diffBadge: {
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
        },
        diffBadgeText: {
            fontSize: 11,
            fontWeight: "700",
        },
        questionText: {
            fontSize: 17,
            fontWeight: "700",
            color: t.text,
            lineHeight: 26,
            letterSpacing: -0.2,
        },
        interactiveZone: {
            marginTop: 4,
        },
        optionsContainer: {
            gap: 10,
        },
        optionItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: 12,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1.5,
            borderColor: t.border,
            minHeight: 52,
        },
        optionItemSelected: {
            borderColor: t.accent,
            backgroundColor: t.accentSoft,
        },
        optionKeyBox: {
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        optionKeyBoxSelected: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },
        optionKeyText: {
            fontSize: 13,
            fontWeight: "700",
            color: t.textSecondary,
        },
        optionKeyTextSelected: {
            color: "#FFF",
        },
        optionItemText: {
            flex: 1,
            fontSize: 14,
            color: t.textSecondary,
            lineHeight: 20,
        },
        optionItemTextSelected: {
            color: t.text,
            fontWeight: "600",
        },
        fillupsContainer: {
            gap: 10,
        },
        fillupPrompt: {
            fontSize: 12,
            fontWeight: "600",
            color: t.textSecondary,
        },
        fillupInput: {
            backgroundColor: t.surfaceAlt,
            borderWidth: 1.5,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: t.text,
        },
        fillupHint: {
            fontSize: 11,
            color: t.muted,
            lineHeight: 16,
        },
        tfContainer: {
            flexDirection: "row",
            gap: 12,
        },
        tfCard: {
            flex: 1,
            paddingVertical: 24,
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 14,
            backgroundColor: t.surfaceAlt,
            borderWidth: 2,
            borderColor: t.border,
        },
        tfCardTrue: {
            backgroundColor: t.success,
            borderColor: t.success,
        },
        tfCardFalse: {
            backgroundColor: t.danger,
            borderColor: t.danger,
        },
        tfText: {
            fontSize: 15,
            fontWeight: "800",
            letterSpacing: 0.5,
        },
        tfTextActive: {
            color: "#FFF",
        },
        bottomActionBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 18,
            paddingVertical: 13,
            borderTopWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
            gap: 12,
        },
        navBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 9,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        navBtnDisabled: {
            opacity: 0.35,
        },
        navBtnText: {
            fontSize: 13,
            fontWeight: "600",
            color: t.textSecondary,
        },
        nextBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 20,
            paddingVertical: 11,
            borderRadius: 9,
            backgroundColor: t.accent,
        },
        nextBtnText: {
            fontSize: 13,
            fontWeight: "700",
            color: "#FFF",
        },
        finishBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 20,
            paddingVertical: 11,
            borderRadius: 9,
            backgroundColor: t.accent,
        },
        finishBtnText: {
            fontSize: 13,
            fontWeight: "700",
            color: "#FFF",
        },
        modalOverlay: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 99,
        },
        modalCard: {
            width: "100%",
            maxWidth: 380,
            backgroundColor: t.surface,
            borderRadius: 18,
            padding: 24,
            alignItems: "center",
            gap: 12,
            borderWidth: 1,
            borderColor: t.border,
        },
        modalIconWrap: {
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: t.warning + "20",
            alignItems: "center",
            justifyContent: "center",
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: "800",
            color: t.text,
        },
        modalSub: {
            fontSize: 13,
            color: t.textSecondary,
            textAlign: "center",
            lineHeight: 19,
        },
        modalBtnRow: {
            flexDirection: "row",
            gap: 10,
            width: "100%",
            marginTop: 8,
        },
        modalCancelBtn: {
            flex: 1,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        modalCancelText: {
            fontSize: 13,
            fontWeight: "600",
            color: t.textSecondary,
        },
        modalSubmitBtn: {
            flex: 1,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            backgroundColor: t.accent,
        },
        modalSubmitText: {
            fontSize: 13,
            fontWeight: "700",
            color: "#FFF",
        },
    });
}
