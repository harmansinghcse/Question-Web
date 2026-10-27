import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppShell, { useLayout } from "../components/AppShell";
import AcademicBannerIllustration from "../components/AcademicBannerIllustration";
import { ErrorBlock, LoadingBlock, ProgressBar } from "../components/ui";
import StudyToolsModals, {
    type ActiveToolModal,
} from "../components/StudyToolsModals";
import { useAppTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";
import { api, type Subject } from "../services/api";
import { useApiData } from "../hooks/use-api-data";
import { sortSubjects, subjectCode, subjectDisplayName } from "../constants/subjects";
import {
    studyStorage,
    type ExamItem,
    type ScheduleItem,
    type StudyGoal,
    type StudyStats,
} from "../services/study-storage";
import type { AppTheme } from "../constants/theme";

export default function HomeScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const { user } = useAuth();
    const { isWide } = useLayout();
    const s = useMemo(() => makeStyles(theme), [theme]);

    // ── Local Storage Data ───────────────────────────────────────────────────
    const [goals, setGoals] = useState<StudyGoal[]>([]);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [exams, setExams] = useState<ExamItem[]>([]);
    const [studyStats, setStudyStats] = useState<StudyStats>({
        totalMinutes: 0,
        sessionsCompleted: 0,
        lastStudyDate: new Date().toISOString(),
    });
    const [completedTopicIds, setCompletedTopicIds] = useState<Set<number>>(new Set());

    // ── Active Modal ────────────────────────────────────────────────────────
    const [activeModal, setActiveModal] = useState<ActiveToolModal>(null);

    // Load local storage on mount
    useEffect(() => {
        let isMounted = true;
        async function loadStoredData() {
            try {
                const [storedGoals, storedSchedule, storedExams, storedStats, storedTopics] =
                    await Promise.all([
                        studyStorage.getGoals(),
                        studyStorage.getSchedule(),
                        studyStorage.getExams(),
                        studyStorage.getStudyStats(),
                        studyStorage.getCompletedTopics(),
                    ]);
                if (isMounted) {
                    setGoals(storedGoals);
                    setSchedule(storedSchedule);
                    setExams(storedExams);
                    setStudyStats(storedStats);
                    setCompletedTopicIds(storedTopics);
                }
            } catch {
                // Silently fallback to defaults
            }
        }
        void loadStoredData();
        return () => {
            isMounted = false;
        };
    }, []);

    // ── Real Subjects Data for Syllabus Tracker ──────────────────────────────
    const fetchSubjects = useCallback(() => api.getSubjects(), []);
    const subjectsState = useApiData<Subject[]>(fetchSubjects);

    const subjects = useMemo(() => {
        if (subjectsState.status !== "success" || !subjectsState.data) return [];
        return sortSubjects(subjectsState.data);
    }, [subjectsState]);

    // ── Time & Greeting ──────────────────────────────────────────────────────
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    }, []);

    const displayName = useMemo(() => {
        if (user?.displayName) return user.displayName.split(" ")[0];
        if (user?.email) return user.email.split("@")[0];
        return "Student";
    }, [user]);

    const todayDateString = useMemo(() => {
        const now = new Date();
        return now.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
        });
    }, []);

    // ── Nearest Exam ────────────────────────────────────────────────────────
    const nearestExamInfo = useMemo(() => {
        if (!exams || exams.length === 0) return null;
        const sorted = [...exams].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        const next = sorted[0];
        const examDate = new Date(next.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        examDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil(
            (examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        let countdownLabel = `${diffDays} days left`;
        let countdownTone: "urgent" | "soon" | "normal" = "normal";
        if (diffDays < 0) {
            countdownLabel = "Concluded";
        } else if (diffDays === 0) {
            countdownLabel = "Today";
            countdownTone = "urgent";
        } else if (diffDays === 1) {
            countdownLabel = "Tomorrow";
            countdownTone = "soon";
        } else if (diffDays <= 7) {
            countdownTone = "soon";
        }

        const formattedDate = new Date(next.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });

        return {
            exam: next,
            countdownLabel,
            countdownTone,
            formattedDate,
        };
    }, [exams]);

    // Syllabus Preview (first 3 subjects)
    const syllabusPreview = useMemo(() => {
        return subjects.slice(0, 3).map((sub) => {
            const total = Math.max(1, (sub.credits ?? 3) * 5);
            const done = completedTopicIds.size > 0 ? Math.min(total, completedTopicIds.size) : 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return {
                subjectKey: sub.subjectKey,
                code: subjectCode(sub) || sub.subjectId,
                name: subjectDisplayName(sub),
                completedCount: done,
                totalCount: total,
                percentage: pct,
            };
        });
    }, [subjects, completedTopicIds]);

    return (
        <AppShell active="home">
            <View style={s.container}>
                {/* 1. MAKE TODAY COUNT WELCOME BANNER (Calm, neutral-dominant, refined) */}
                <View style={s.bannerCard}>
                    <View style={s.bannerContent}>
                        <View style={s.bannerTextCol}>
                            <Text style={s.bannerGreeting}>
                                {greeting}, {displayName}
                            </Text>
                            <Text style={s.bannerHeadline}>
                                {"Make today count."}
                            </Text>
                            <Text style={s.bannerSubtitle}>
                                Organize your daily lectures, upcoming tests, and syllabus goals.
                            </Text>
                            <Pressable
                                onPress={() => setActiveModal("daily-planner")}
                                accessibilityRole="button"
                                accessibilityLabel="Go to My Plan"
                                style={({ pressed }) => [
                                    s.bannerButton,
                                    pressed && { opacity: 0.85 },
                                ]}
                            >
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={15}
                                    color="#FFFFFF"
                                />
                                <Text style={s.bannerButtonText}>
                                    Go to My Plan
                                </Text>
                            </Pressable>
                        </View>
                        {isWide && (
                            <View style={s.bannerIllustrationWrapper}>
                                <AcademicBannerIllustration size={76} />
                            </View>
                        )}
                    </View>
                </View>

                {/* 2. UPCOMING EXAMS & TESTS */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>
                            Upcoming Exams & Tests
                        </Text>
                        <Pressable
                            onPress={() => setActiveModal("upcoming-exams")}
                            accessibilityRole="button"
                            accessibilityLabel="Manage exams"
                            style={s.actionLink}
                        >
                            <Text style={s.actionLinkText}>Manage</Text>
                            <Ionicons
                                name="chevron-forward"
                                size={13}
                                color={theme.accent}
                            />
                        </Pressable>
                    </View>

                    {nearestExamInfo ? (
                        <View style={s.card}>
                            <View style={s.examRow}>
                                <View style={{ flex: 1, gap: 3 }}>
                                    <View style={s.examTagRow}>
                                        <View style={s.subjectPill}>
                                            <Text style={s.subjectPillText}>
                                                {nearestExamInfo.exam.subject}
                                            </Text>
                                        </View>
                                        <Text style={s.examDateText}>
                                            {nearestExamInfo.formattedDate}
                                        </Text>
                                    </View>
                                    <Text style={s.examTitle} numberOfLines={1}>
                                        {nearestExamInfo.exam.title}
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        s.countdownPill,
                                        nearestExamInfo.countdownTone === "urgent" && s.countdownUrgent,
                                        nearestExamInfo.countdownTone === "soon" && s.countdownSoon,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            s.countdownText,
                                            nearestExamInfo.countdownTone === "urgent" && s.countdownTextUrgent,
                                            nearestExamInfo.countdownTone === "soon" && s.countdownTextSoon,
                                        ]}
                                    >
                                        {nearestExamInfo.countdownLabel}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={s.emptyCard}>
                            <Ionicons
                                name="calendar-outline"
                                size={22}
                                color={theme.muted}
                            />
                            <View style={s.emptyCardBody}>
                                <Text style={s.emptyCardTitle}>
                                    No upcoming exams scheduled
                                </Text>
                                <Text style={s.emptyCardSub}>
                                    Add your quizzes, mid-terms, or final exams.
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => setActiveModal("upcoming-exams")}
                                style={s.emptyCardBtn}
                            >
                                <Text style={s.emptyCardBtnText}>Add Exam</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* 3. TODAY'S TIMETABLE */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <View style={s.sectionTitleRow}>
                            <Text style={s.sectionTitle}>
                                {"Today's Timetable"}
                            </Text>
                            <Text style={s.sectionDot}>·</Text>
                            <Text style={s.sectionSubtitle}>
                                {todayDateString}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => setActiveModal("timetable")}
                            accessibilityRole="button"
                            accessibilityLabel="Manage timetable"
                            style={s.actionLink}
                        >
                            <Text style={s.actionLinkText}>Manage</Text>
                            <Ionicons
                                name="chevron-forward"
                                size={13}
                                color={theme.accent}
                            />
                        </Pressable>
                    </View>

                    {schedule.length > 0 ? (
                        <View style={s.scheduleContainer}>
                            {schedule.map((item, idx) => (
                                <View
                                    key={item.id}
                                    style={[
                                        s.scheduleRow,
                                        idx < schedule.length - 1 && s.scheduleDivider,
                                    ]}
                                >
                                    <Text style={s.scheduleTimeText}>
                                        {item.time}
                                    </Text>
                                    <View style={{ flex: 1, gap: 2 }}>
                                        <Text style={s.scheduleTitle} numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                        <View style={s.scheduleLocationRow}>
                                            <Ionicons
                                                name="location-outline"
                                                size={11}
                                                color={theme.muted}
                                            />
                                            <Text style={s.scheduleLocationText}>
                                                {item.location}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={s.emptyCard}>
                            <Ionicons
                                name="time-outline"
                                size={22}
                                color={theme.muted}
                            />
                            <View style={s.emptyCardBody}>
                                <Text style={s.emptyCardTitle}>
                                    {"No classes scheduled for today"}
                                </Text>
                                <Text style={s.emptyCardSub}>
                                    Customize your daily lectures and lab timings.
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => setActiveModal("timetable")}
                                style={s.emptyCardBtn}
                            >
                                <Text style={s.emptyCardBtnText}>Add Class</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* 4. SYLLABUS TRACKER */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>
                            Syllabus Tracker
                        </Text>
                        <Pressable
                            onPress={() => router.push("/syllabus" as never)}
                            accessibilityRole="button"
                            accessibilityLabel="View full syllabus"
                            style={s.actionLink}
                        >
                            <Text style={s.actionLinkText}>View All</Text>
                            <Ionicons
                                name="chevron-forward"
                                size={13}
                                color={theme.accent}
                            />
                        </Pressable>
                    </View>

                    {subjectsState.status === "loading" ? (
                        <LoadingBlock label="Loading syllabus progress..." />
                    ) : subjectsState.status === "error" ? (
                        <ErrorBlock
                            title="Couldn't load subjects"
                            message={subjectsState.message}
                            onRetry={subjectsState.refresh}
                        />
                    ) : syllabusPreview.length > 0 ? (
                        <View style={s.syllabusContainer}>
                            {syllabusPreview.map((item, idx) => (
                                <Pressable
                                    key={item.subjectKey}
                                    onPress={() =>
                                        router.push(
                                            `/syllabus?subjectKey=${encodeURIComponent(item.subjectKey)}` as never,
                                        )
                                    }
                                    style={({ pressed }) => [
                                        s.syllabusRow,
                                        idx < syllabusPreview.length - 1 && s.scheduleDivider,
                                        pressed && { opacity: 0.8 },
                                    ]}
                                >
                                    <View style={s.syllabusHeaderRow}>
                                        <View style={{ flex: 1, gap: 2 }}>
                                            <View style={s.syllabusCodeRow}>
                                                <View style={s.subjectPill}>
                                                    <Text style={s.subjectPillText}>
                                                        {item.code}
                                                    </Text>
                                                </View>
                                                <Text
                                                    style={s.syllabusName}
                                                    numberOfLines={1}
                                                >
                                                    {item.name}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={s.syllabusPctText}>
                                            {item.percentage}%
                                        </Text>
                                    </View>

                                    <View style={s.progressBarWrapper}>
                                        <ProgressBar
                                            progress={item.percentage}
                                            color={theme.accent}
                                            height={4}
                                        />
                                    </View>

                                    <Text style={s.syllabusTopicsCount}>
                                        {item.completedCount} of {item.totalCount} topics completed
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        <View style={s.emptyCard}>
                            <Ionicons
                                name="book-outline"
                                size={22}
                                color={theme.muted}
                            />
                            <View style={s.emptyCardBody}>
                                <Text style={s.emptyCardTitle}>
                                    No subjects available
                                </Text>
                                <Text style={s.emptyCardSub}>
                                    Subjects will appear here when connected to the curriculum.
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* 5. FOUR STUDY TOOLS CARDS (Balanced, calm 2x2 grid) */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>Study Tools</Text>
                    </View>

                    <View style={s.toolsGrid}>
                        {/* 1. Daily Planner */}
                        <Pressable
                            onPress={() => setActiveModal("daily-planner")}
                            style={({ pressed }) => [
                                s.toolCard,
                                pressed && { opacity: 0.85 },
                            ]}
                        >
                            <View style={s.toolIconWrap}>
                                <Ionicons
                                    name="checkbox-outline"
                                    size={18}
                                    color={theme.accent}
                                />
                            </View>
                            <View style={s.toolTextCol}>
                                <Text style={s.toolTitle}>Daily Planner</Text>
                                <Text style={s.toolSub}>Plan your day</Text>
                            </View>
                        </Pressable>

                        {/* 2. Study Report */}
                        <Pressable
                            onPress={() => setActiveModal("study-report")}
                            style={({ pressed }) => [
                                s.toolCard,
                                pressed && { opacity: 0.85 },
                            ]}
                        >
                            <View style={s.toolIconWrap}>
                                <Ionicons
                                    name="bar-chart-outline"
                                    size={18}
                                    color={theme.accent}
                                />
                            </View>
                            <View style={s.toolTextCol}>
                                <Text style={s.toolTitle}>Study Report</Text>
                                <Text style={s.toolSub}>Review progress</Text>
                            </View>
                        </Pressable>

                        {/* 3. Focus Timer */}
                        <Pressable
                            onPress={() => setActiveModal("focus-timer")}
                            style={({ pressed }) => [
                                s.toolCard,
                                pressed && { opacity: 0.85 },
                            ]}
                        >
                            <View style={s.toolIconWrap}>
                                <Ionicons
                                    name="timer-outline"
                                    size={18}
                                    color={theme.accent}
                                />
                            </View>
                            <View style={s.toolTextCol}>
                                <Text style={s.toolTitle}>Focus Timer</Text>
                                <Text style={s.toolSub}>25m Pomodoro</Text>
                            </View>
                        </Pressable>

                        {/* 4. Study Reminders */}
                        <Pressable
                            onPress={() => setActiveModal("study-reminders")}
                            style={({ pressed }) => [
                                s.toolCard,
                                pressed && { opacity: 0.85 },
                            ]}
                        >
                            <View style={s.toolIconWrap}>
                                <Ionicons
                                    name="notifications-outline"
                                    size={18}
                                    color={theme.accent}
                                />
                            </View>
                            <View style={s.toolTextCol}>
                                <Text style={s.toolTitle}>Study Reminders</Text>
                                <Text style={s.toolSub}>Manage alerts</Text>
                            </View>
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* SHARED MODALS */}
            <StudyToolsModals
                activeModal={activeModal}
                onClose={() => setActiveModal(null)}
                goals={goals}
                schedule={schedule}
                exams={exams}
                studyStats={studyStats}
                onGoalsChange={setGoals}
                onScheduleChange={setSchedule}
                onExamsChange={setExams}
                onStudyStatsChange={setStudyStats}
            />
        </AppShell>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        container: {
            gap: 20,
            maxWidth: 880,
            alignSelf: "center",
            width: "100%",
        },
        bannerCard: {
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            borderLeftWidth: 3,
            borderLeftColor: t.accent,
            padding: 18,
        },
        bannerContent: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        bannerTextCol: {
            flex: 1,
            gap: 4,
            maxWidth: 540,
        },
        bannerGreeting: {
            color: t.muted,
            fontSize: 12,
            fontWeight: "600",
        },
        bannerHeadline: {
            color: t.text,
            fontSize: 20,
            fontWeight: "800",
            letterSpacing: -0.3,
        },
        bannerSubtitle: {
            color: t.textSecondary,
            fontSize: 13,
            lineHeight: 18,
            marginBottom: 8,
        },
        bannerButton: {
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 6,
            backgroundColor: t.accent,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
        },
        bannerButtonText: {
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: "700",
        },
        bannerIllustrationWrapper: {
            marginLeft: 16,
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.9,
        },
        section: {
            gap: 8,
        },
        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 2,
        },
        sectionTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        sectionTitle: {
            fontSize: 15,
            fontWeight: "700",
            color: t.text,
            letterSpacing: -0.1,
        },
        sectionDot: {
            fontSize: 14,
            color: t.muted,
        },
        sectionSubtitle: {
            fontSize: 12,
            fontWeight: "500",
            color: t.muted,
        },
        actionLink: {
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            paddingVertical: 2,
            paddingHorizontal: 4,
        },
        actionLinkText: {
            fontSize: 12,
            fontWeight: "600",
            color: t.accent,
        },
        card: {
            backgroundColor: t.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            padding: 14,
        },
        examRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
        },
        examTagRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        subjectPill: {
            alignSelf: "flex-start",
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
        examDateText: {
            fontSize: 12,
            color: t.muted,
        },
        examTitle: {
            fontSize: 14,
            fontWeight: "700",
            color: t.text,
        },
        countdownPill: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        countdownUrgent: {
            borderColor: t.danger + "44",
            backgroundColor: t.danger + "14",
        },
        countdownSoon: {
            borderColor: t.warning + "44",
            backgroundColor: t.warning + "14",
        },
        countdownText: {
            fontSize: 11,
            fontWeight: "700",
            color: t.accent,
        },
        countdownTextUrgent: {
            color: t.danger,
        },
        countdownTextSoon: {
            color: t.warning,
        },
        emptyCard: {
            backgroundColor: t.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        emptyCardBody: {
            flex: 1,
            gap: 2,
        },
        emptyCardTitle: {
            fontSize: 13,
            fontWeight: "600",
            color: t.text,
        },
        emptyCardSub: {
            fontSize: 11,
            color: t.muted,
        },
        emptyCardBtn: {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 6,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        emptyCardBtnText: {
            fontSize: 11,
            fontWeight: "600",
            color: t.accent,
        },
        scheduleContainer: {
            backgroundColor: t.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            overflow: "hidden",
        },
        scheduleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
        },
        scheduleDivider: {
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        scheduleTimeText: {
            fontSize: 12,
            fontWeight: "700",
            color: t.accent,
            width: 70,
        },
        scheduleTitle: {
            fontSize: 13,
            fontWeight: "600",
            color: t.text,
        },
        scheduleLocationRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
        },
        scheduleLocationText: {
            fontSize: 11,
            color: t.muted,
        },
        syllabusContainer: {
            backgroundColor: t.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            overflow: "hidden",
        },
        syllabusRow: {
            padding: 14,
            gap: 8,
        },
        syllabusHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
        },
        syllabusCodeRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        syllabusName: {
            fontSize: 13,
            fontWeight: "600",
            color: t.text,
            flex: 1,
        },
        syllabusPctText: {
            fontSize: 12,
            fontWeight: "700",
            color: t.accent,
        },
        progressBarWrapper: {
            width: "100%",
        },
        syllabusTopicsCount: {
            fontSize: 11,
            color: t.muted,
        },
        toolsGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
        },
        toolCard: {
            flex: 1,
            minWidth: Platform.OS === "web" ? 180 : 140,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: t.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            padding: 14,
        },
        toolIconWrap: {
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: "center",
            justifyContent: "center",
        },
        toolTextCol: {
            flex: 1,
            gap: 2,
        },
        toolTitle: {
            fontSize: 13,
            fontWeight: "700",
            color: t.text,
        },
        toolSub: {
            fontSize: 11,
            color: t.muted,
        },
    });
}
