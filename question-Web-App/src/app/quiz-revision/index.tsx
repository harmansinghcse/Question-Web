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
                    const subjectsWithQs = res.subjects.filter((s) => (s.questionCount || 0) > 0);
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
                                <Ionicons name="flash" size={13} color="#EF4444" />
                                <Text style={s.quizBadgeText}>Interactive Practice</Text>
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
                            Test your knowledge and strengthen your concepts.
                        </Text>
                    </View>
                </View>

                {loadingMeta ? (
                    <View style={s.loadingBox}>
                        <ActivityIndicator size="large" color={theme.accent} />
                        <Text style={s.loadingText}>Loading curriculum and questions...</Text>
                    </View>
                ) : metaError ? (
                    <View style={s.errorBox}>
                        <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
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
                                                        paddingVertical: 1,
                                                        borderRadius: 4,
                                                        backgroundColor: isSel
                                                            ? "rgba(255,255,255,0.25)"
                                                            : "#10B98120",
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 10,
                                                            fontWeight: "700",
                                                            color: isSel ? "#FFF" : "#10B981",
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
                                    <Text style={s.sectionTitle}>2. Chapter (Optional)</Text>
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
                                                    color={isSel ? "#FFF" : theme.muted}
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
                            <Text style={s.sectionTitle}>Question Format</Text>
                            <View style={s.buttonGroup}>
                                {[
                                    { key: "ALL", label: "All Formats", icon: "sparkles-outline" },
                                    { key: "MCQ", label: "MCQ", icon: "list-outline" },
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
                                                size={16}
                                                color={isSel ? "#EF4444" : theme.muted}
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
                            <View style={{ flex: 1, minWidth: 240 }}>
                                <Text style={s.sectionTitle}>Difficulty</Text>
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

                            <View style={{ flex: 1, minWidth: 240 }}>
                                <Text style={s.sectionTitle}>Number of Questions</Text>
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
                                <Text style={s.availLabel}>Available in Question Bank</Text>
                                <View style={s.availCountRow}>
                                    {loadingCounts ? (
                                        <ActivityIndicator size="small" color={theme.accent} />
                                    ) : (
                                        <>
                                            <Text style={s.availNumber}>
                                                {availableCount}
                                            </Text>
                                            <Text style={s.availUnit}>questions match your filter</Text>
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
        },
        headerCard: {
            backgroundColor: t.surface,
            borderRadius: 16,
            padding: 20,
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
            gap: 5,
            backgroundColor: "#EF444415",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "#EF444435",
        },
        quizBadgeText: {
            color: "#EF4444",
            fontSize: 11,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.5,
        },
        historyBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: t.surfaceAlt,
            paddingHorizontal: 10,
            paddingVertical: 5,
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
        loadingBox: {
            padding: 40,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
        },
        loadingText: {
            color: t.muted,
            fontSize: 13,
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
        formGrid: {
            gap: 18,
        },
        section: {
            gap: 10,
        },
        sectionTitle: {
            fontSize: 13,
            fontWeight: "700",
            color: t.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
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
            gap: 6,
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
            gap: 8,
        },
        typeCard: {
            flex: 1,
            minWidth: 140,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            gap: 6,
        },
        typeCardActive: {
            borderColor: "#EF4444",
            backgroundColor: "#EF444410",
        },
        typeCardText: {
            flex: 1,
            color: t.textSecondary,
            fontSize: 12,
            fontWeight: "600",
        },
        typeCardTextActive: {
            color: t.text,
            fontWeight: "700",
        },
        typeCount: {
            color: t.muted,
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
            marginTop: 10,
        },
        startLeft: {
            flex: 1,
            gap: 2,
        },
        availLabel: {
            fontSize: 11,
            color: t.muted,
            textTransform: "uppercase",
            fontWeight: "600",
        },
        availCountRow: {
            flexDirection: "row",
            alignItems: "baseline",
            gap: 6,
        },
        availNumber: {
            fontSize: 22,
            fontWeight: "900",
            color: "#10B981",
        },
        availUnit: {
            fontSize: 12,
            color: t.textSecondary,
        },
        startBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#EF4444",
            paddingHorizontal: 20,
            paddingVertical: 13,
            borderRadius: 12,
            shadowColor: "#EF4444",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        },
        startBtnDisabled: {
            opacity: 0.4,
            shadowOpacity: 0,
        },
        startBtnText: {
            color: "#FFF",
            fontSize: 14,
            fontWeight: "700",
        },
    });
}
