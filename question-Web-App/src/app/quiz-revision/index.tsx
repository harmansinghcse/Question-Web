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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppShell, { useLayout } from "../../components/AppShell";
import { useAppTheme } from "../../providers/ThemeProvider";

import {
    api,
    type QuizSubjectMeta,
    type QuizChapterMeta,
    type QuizTopicMeta,
    type QuizCountsResponse,
} from "../../services/api";
import type { AppTheme } from "../../constants/theme";

export default function QuizRevisionHomeScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();

    const { isWide } = useLayout();
    const s = useMemo(() => makeStyles(theme), [theme]);

    // Metadata
    const [loadingMeta, setLoadingMeta] = useState(true);
    const [metaError, setMetaError] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<QuizSubjectMeta[]>([]);
    const [chapters, setChapters] = useState<QuizChapterMeta[]>([]);
    const [, setTopics] = useState<QuizTopicMeta[]>([]);

    // User selections
    const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | null>(null);
    const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
    const [selectedType, setSelectedType] = useState<"ALL" | "MCQ" | "FILLUPS" | "TRUE_FALSE">("ALL");
    const [selectedDifficulty, setSelectedDifficulty] = useState<"ALL" | "EASY" | "MEDIUM" | "HARD">("ALL");
    const [questionLimit, setQuestionLimit] = useState<number>(10);

    // Live counts
    const [loadingCounts, setLoadingCounts] = useState(false);
    const [countsData, setCountsData] = useState<QuizCountsResponse | null>(null);
    const [starting, setStarting] = useState(false);

    // 1. Fetch metadata on mount
    useEffect(() => {
        let mounted = true;
        async function loadMeta() {
            setLoadingMeta(true);
            setMetaError(null);
            try {
                const res = await api.getQuizFilters();
                if (!mounted) return;
                setSubjects(res.subjects || []);
                setChapters(res.chapters || []);
                setTopics(res.topics || []);

                if (res.subjects && res.subjects.length > 0) {
                    // Pick a subject that has active revision questions available
                    const subjectsWithQs = res.subjects.filter((sub) => (sub.questionCount || 0) > 0);
                    const initialSubject = subjectsWithQs.length > 0 ? subjectsWithQs[0] : res.subjects[0];
                    setSelectedSubjectKey(initialSubject.subjectKey);
                }
            } catch (err) {
                if (mounted) {
                    setMetaError(err instanceof Error ? err.message : "Failed to load subjects.");
                }
            } finally {
                if (mounted) setLoadingMeta(false);
            }
        }
        loadMeta();
        return () => {
            mounted = false;
        };
    }, []);

    // Sort subjects so subjects with active question bank appear first
    const sortedSubjects = useMemo(() => {
        return [...subjects].sort((a, b) => {
            const countA = a.questionCount || 0;
            const countB = b.questionCount || 0;
            if (countA > 0 && countB === 0) return -1;
            if (countA === 0 && countB > 0) return 1;
            return a.semester - b.semester || a.subjectName.localeCompare(b.subjectName);
        });
    }, [subjects]);

    // Filtered chapters for current subject
    const subjectChapters = useMemo(() => {
        if (!selectedSubjectKey) return [];
        return chapters.filter((c) => c.subjectKey === selectedSubjectKey);
    }, [chapters, selectedSubjectKey]);

    // Filtered topics for current chapter
    const chapterTopics = useMemo(() => {
        if (!selectedChapterId) return [];
        const found = chapters.find((c) => c.chapterId === selectedChapterId);
        return found?.topics || [];
    }, [chapters, selectedChapterId]);

    // Total available count across filters
    const availableCount = countsData?.total ?? countsData?.availableQuestions ?? 0;

    // 2. Fetch live question counts when configuration changes
    useEffect(() => {
        if (!selectedSubjectKey) return;
        let cancelled = false;

        async function fetchCounts() {
            setLoadingCounts(true);
            try {
                const res = await api.getQuizCounts({
                    subjectKey: selectedSubjectKey!,
                    chapterId: selectedChapterId ?? undefined,
                    topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
                    difficulty: selectedDifficulty === "ALL" ? undefined : selectedDifficulty,
                    questionType: selectedType === "ALL" ? undefined : selectedType,
                });
                if (!cancelled) {
                    setCountsData(res);
                }
            } catch (err) {
                console.warn("[QuizRevision] counts error:", err);
            } finally {
                if (!cancelled) setLoadingCounts(false);
            }
        }

        fetchCounts();
        return () => {
            cancelled = true;
        };
    }, [selectedSubjectKey, selectedChapterId, selectedTopicIds, selectedType, selectedDifficulty]);

    // Handle Start Revision
    const handleStartRevision = async () => {
        if (!selectedSubjectKey) {
            Alert.alert("Select Subject", "Please choose a subject to begin revision.");
            return;
        }

        if (!countsData || availableCount === 0) {
            Alert.alert("No Questions Available", "Try picking another topic, chapter, or question format.");
            return;
        }

        setStarting(true);
        try {
            const res = await api.startQuiz({
                subjectKey: selectedSubjectKey,
                chapterId: selectedChapterId ?? undefined,
                topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
                difficulty: selectedDifficulty === "ALL" ? undefined : selectedDifficulty,
                questionType: selectedType,
                count: questionLimit,
                limit: questionLimit,
            });

            // Navigate to active session with attempt info
            router.push({
                pathname: "/quiz-revision/session",
                params: {
                    attemptId: String(res.attemptId),
                    payload: JSON.stringify(res),
                },
            } as never);
        } catch (err) {
            Alert.alert("Error Starting Quiz", err instanceof Error ? err.message : "Failed to start quiz session.");
        } finally {
            setStarting(false);
        }
    };

    const toggleTopic = (id: number) => {
        setSelectedTopicIds((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    };

    return (
        <AppShell active="revision">
            <View style={s.container}>
                {/* Header Banner */}
                <View style={s.headerCard}>
                    <View style={s.headerContent}>
                        <View style={s.badgeRow}>
                            <View style={s.quizBadge}>
                                <Ionicons name="flash" size={13} color={theme.accent} />
                                <Text style={s.quizBadgeText}>Interactive Quiz Engine</Text>
                            </View>
                            <Pressable
                                onPress={() => router.push("/quiz-revision/history" as never)}
                                style={({ pressed }) => [s.historyBtn, pressed && { opacity: 0.8 }]}
                            >
                                <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                                <Text style={s.historyBtnText}>Attempt History</Text>
                            </Pressable>
                        </View>
                        <Text style={s.title}>Quiz & Revision</Text>
                        <Text style={s.subtitle}>
                            Configure your custom practice session by course, chapter, format, and difficulty.
                        </Text>
                    </View>
                </View>

                {loadingMeta ? (
                    <View style={s.loadingBox}>
                        <ActivityIndicator size="large" color={theme.accent} />
                        <Text style={s.loadingText}>Loading curriculum and available questions...</Text>
                    </View>
                ) : metaError ? (
                    <View style={s.errorBox}>
                        <Ionicons name="alert-circle-outline" size={24} color={theme.danger} />
                        <Text style={s.errorText}>{metaError}</Text>
                    </View>
                ) : (
                    <View style={s.formGrid}>
                        {/* 1. Subject Selection */}
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>1. Select Subject</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillScroll}>
                                {sortedSubjects.map((sub) => {
                                    const isSel = sub.subjectKey === selectedSubjectKey;
                                    const hasQuestions = (sub.questionCount || 0) > 0;
                                    return (
                                        <Pressable
                                            key={sub.subjectKey}
                                            onPress={() => {
                                                setSelectedSubjectKey(sub.subjectKey);
                                                setSelectedChapterId(null);
                                                setSelectedTopicIds([]);
                                            }}
                                            style={[s.pill, isSel && s.pillActive]}
                                        >
                                            <Ionicons
                                                name={isSel ? "book" : "book-outline"}
                                                size={14}
                                                color={isSel ? "#FFF" : theme.textSecondary}
                                            />
                                            <Text style={[s.pillText, isSel && s.pillTextActive]}>
                                                {sub.subjectName}
                                            </Text>
                                            {hasQuestions && (
                                                <View
                                                    style={{
                                                        paddingHorizontal: 6,
                                                        paddingVertical: 1.5,
                                                        borderRadius: 5,
                                                        backgroundColor: isSel
                                                            ? "rgba(255,255,255,0.25)"
                                                            : theme.accentSoft,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 10,
                                                            fontWeight: "700",
                                                            color: isSel ? "#FFF" : theme.accent,
                                                        }}
                                                    >
                                                        {sub.questionCount} Qs
                                                    </Text>
                                                </View>
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* 2. Chapter Filter (Optional) */}
                        {subjectChapters.length > 0 && (
                            <View style={s.section}>
                                <View style={s.rowBetween}>
                                    <Text style={s.sectionTitle}>2. Chapter Filter (Optional)</Text>
                                    {selectedChapterId && (
                                        <Pressable onPress={() => { setSelectedChapterId(null); setSelectedTopicIds([]); }}>
                                            <Text style={s.clearText}>Clear</Text>
                                        </Pressable>
                                    )}
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillScroll}>
                                    <Pressable
                                        onPress={() => { setSelectedChapterId(null); setSelectedTopicIds([]); }}
                                        style={[s.pill, !selectedChapterId && s.pillActive]}
                                    >
                                        <Text style={[s.pillText, !selectedChapterId && s.pillTextActive]}>
                                            All Chapters
                                        </Text>
                                    </Pressable>
                                    {subjectChapters.map((ch) => {
                                        const isSel = ch.chapterId === selectedChapterId;
                                        return (
                                            <Pressable
                                                key={ch.chapterId}
                                                onPress={() => {
                                                    setSelectedChapterId(ch.chapterId);
                                                    setSelectedTopicIds([]);
                                                }}
                                                style={[s.pill, isSel && s.pillActive]}
                                            >
                                                <Text style={[s.pillText, isSel && s.pillTextActive]}>
                                                    Ch {ch.chapterNo}: {ch.chapterName}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* 3. Topics (if chapter selected) */}
                        {chapterTopics.length > 0 && (
                            <View style={s.section}>
                                <Text style={s.sectionTitle}>3. Specific Topics ({selectedTopicIds.length} selected)</Text>
                                <View style={s.chipsWrap}>
                                    {chapterTopics.map((top) => {
                                        const isSel = selectedTopicIds.includes(top.topicId);
                                        return (
                                            <Pressable
                                                key={top.topicId}
                                                onPress={() => toggleTopic(top.topicId)}
                                                style={[s.chip, isSel && s.chipActive]}
                                            >
                                                <Ionicons
                                                    name={isSel ? "checkbox" : "square-outline"}
                                                    size={13}
                                                    color={isSel ? theme.accent : theme.muted}
                                                />
                                                <Text style={[s.chipText, isSel && s.chipTextActive]}>
                                                    {top.topicName}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* 4. Question Format Selector */}
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>4. Question Format</Text>
                            <View style={s.buttonGroup}>
                                {[
                                    { key: "ALL", label: "All Formats", icon: "sparkles-outline" },
                                    { key: "MCQ", label: "Multiple Choice", icon: "list-outline" },
                                    { key: "FILLUPS", label: "Fill in Blanks", icon: "create-outline" },
                                    { key: "TRUE_FALSE", label: "True / False", icon: "checkmark-done-outline" },
                                ].map((item) => {
                                    const isSel = selectedType === item.key;
                                    return (
                                        <Pressable
                                            key={item.key}
                                            onPress={() => setSelectedType(item.key as any)}
                                            style={[s.typeCard, isSel && s.typeCardActive]}
                                        >
                                            <Ionicons
                                                name={item.icon as any}
                                                size={17}
                                                color={isSel ? theme.accent : theme.textSecondary}
                                            />
                                            <Text style={[s.typeCardText, isSel && s.typeCardTextActive]}>
                                                {item.label}
                                            </Text>
                                            {countsData?.typeBreakdown && item.key !== "ALL" && (
                                                <Text style={s.typeCount}>
                                                    {countsData.typeBreakdown[item.key as keyof typeof countsData.typeBreakdown] || 0}
                                                </Text>
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* 5. Difficulty & Question Count */}
                        <View style={[s.section, isWide && s.rowWrap]}>
                            <View style={{ flex: 1, minWidth: 240, gap: 8 }}>
                                <Text style={s.sectionTitle}>5. Difficulty</Text>
                                <View style={s.segRow}>
                                    {[
                                        { key: "ALL", label: "Any" },
                                        { key: "EASY", label: "Easy" },
                                        { key: "MEDIUM", label: "Medium" },
                                        { key: "HARD", label: "Hard" },
                                    ].map((d) => (
                                        <Pressable
                                            key={d.key}
                                            onPress={() => setSelectedDifficulty(d.key as any)}
                                            style={[s.segBtn, selectedDifficulty === d.key && s.segBtnActive]}
                                        >
                                            <Text style={[s.segText, selectedDifficulty === d.key && s.segTextActive]}>
                                                {d.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View style={{ flex: 1, minWidth: 240, gap: 8 }}>
                                <Text style={s.sectionTitle}>6. Question Count</Text>
                                <View style={s.segRow}>
                                    {[5, 10, 15, 20].map((num) => (
                                        <Pressable
                                            key={num}
                                            onPress={() => setQuestionLimit(num)}
                                            style={[s.segBtn, questionLimit === num && s.segBtnActive]}
                                        >
                                            <Text style={[s.segText, questionLimit === num && s.segTextActive]}>
                                                {num} Qs
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Live Summary & Start CTA */}
                        <View style={s.startCard}>
                            <View style={s.startLeft}>
                                <Text style={s.availLabel}>Matched In Question Bank</Text>
                                <View style={s.availCountRow}>
                                    {loadingCounts ? (
                                        <ActivityIndicator size="small" color={theme.accent} />
                                    ) : (
                                        <>
                                            <Text style={s.availNumber}>
                                                {availableCount}
                                            </Text>
                                            <Text style={s.availUnit}>
                                                {availableCount === 1 ? "question ready" : "questions ready"}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </View>

                            <Pressable
                                onPress={handleStartRevision}
                                disabled={starting || availableCount === 0}
                                style={({ pressed }) => [
                                    s.startBtn,
                                    (starting || availableCount === 0) && s.startBtnDisabled,
                                    pressed && { opacity: 0.85 },
                                ]}
                            >
                                {starting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="play" size={16} color="#FFF" />
                                        <Text style={s.startBtnText}>Start Quiz</Text>
                                    </>
                                )}
                            </Pressable>
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
            gap: 20,
            paddingBottom: 40,
            width: "100%",
            maxWidth: 880,
            alignSelf: "center",
        },
        headerCard: {
            backgroundColor: t.surface,
            borderRadius: 16,
            padding: 22,
            borderWidth: 1,
            borderColor: t.border,
        },
        headerContent: {
            gap: 8,
        },
        badgeRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        quizBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: t.accentSoft,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: t.accent + "33",
        },
        quizBadgeText: {
            color: t.accent,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.5,
        },
        historyBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: t.surfaceAlt,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: t.border,
        },
        historyBtnText: {
            color: t.textSecondary,
            fontSize: 12,
            fontWeight: "600",
        },
        title: {
            fontSize: 24,
            fontWeight: "800",
            color: t.text,
            letterSpacing: -0.4,
        },
        subtitle: {
            fontSize: 13,
            color: t.textSecondary,
            lineHeight: 19,
        },
        loadingBox: {
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
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.danger + "35",
            alignItems: "center",
            gap: 8,
        },
        errorText: {
            color: t.danger,
            fontSize: 13,
            textAlign: "center",
        },
        formGrid: {
            gap: 20,
        },
        section: {
            gap: 10,
        },
        sectionTitle: {
            fontSize: 12,
            fontWeight: "700",
            color: t.textSecondary,
            letterSpacing: 0.6,
        },
        rowBetween: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        clearText: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "600",
        },
        pillScroll: {
            gap: 8,
            paddingVertical: 2,
        },
        pill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 10,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        pillActive: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },
        pillText: {
            color: t.textSecondary,
            fontSize: 13,
            fontWeight: "600",
        },
        pillTextActive: {
            color: "#FFF",
            fontWeight: "700",
        },
        chipsWrap: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
        chip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 11,
            paddingVertical: 7,
            borderRadius: 8,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        chipActive: {
            backgroundColor: t.accentSoft,
            borderColor: t.accent,
        },
        chipText: {
            color: t.textSecondary,
            fontSize: 12,
            fontWeight: "500",
        },
        chipTextActive: {
            color: t.accent,
            fontWeight: "700",
        },
        buttonGroup: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
        },
        typeCard: {
            flex: 1,
            minWidth: 140,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            gap: 8,
        },
        typeCardActive: {
            borderColor: t.accent,
            backgroundColor: t.accentSoft,
        },
        typeCardText: {
            flex: 1,
            color: t.textSecondary,
            fontSize: 13,
            fontWeight: "600",
        },
        typeCardTextActive: {
            color: t.accent,
            fontWeight: "700",
        },
        typeCount: {
            color: t.textSecondary,
            fontSize: 11,
            fontWeight: "700",
            backgroundColor: t.surfaceAlt,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
        },
        rowWrap: {
            flexDirection: "row",
            gap: 16,
        },
        segRow: {
            flexDirection: "row",
            borderRadius: 10,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            overflow: "hidden",
        },
        segBtn: {
            flex: 1,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
        },
        segBtnActive: {
            backgroundColor: t.accent,
        },
        segText: {
            color: t.textSecondary,
            fontSize: 12,
            fontWeight: "600",
        },
        segTextActive: {
            color: "#FFF",
            fontWeight: "700",
        },
        startCard: {
            backgroundColor: t.surface,
            borderRadius: 16,
            padding: 18,
            borderWidth: 1,
            borderColor: t.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginTop: 6,
        },
        startLeft: {
            flex: 1,
            gap: 2,
        },
        availLabel: {
            fontSize: 11,
            color: t.textSecondary,
            fontWeight: "600",
            letterSpacing: 0.5,
        },
        availCountRow: {
            flexDirection: "row",
            alignItems: "baseline",
            gap: 6,
            marginTop: 2,
        },
        availNumber: {
            fontSize: 24,
            fontWeight: "900",
            color: t.accent,
        },
        availUnit: {
            fontSize: 13,
            color: t.textSecondary,
            fontWeight: "500",
        },
        startBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: t.accent,
            paddingHorizontal: 22,
            paddingVertical: 12,
            borderRadius: 11,
            shadowColor: t.accent,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 3,
        },
        startBtnDisabled: {
            opacity: 0.45,
            shadowOpacity: 0,
        },
        startBtnText: {
            color: "#FFF",
            fontSize: 14,
            fontWeight: "700",
        },
    });
}
