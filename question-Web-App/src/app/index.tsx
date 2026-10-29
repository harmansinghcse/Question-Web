import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
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

    // ── Today's Schedule (at most 3 entries on Home) ────────────────────────
    const todaySchedule = useMemo(() => {
        return schedule.slice(0, 3);
    }, [schedule]);

    // ── Syllabus Progress Preview (at most 3 subject rows) ───────────────────
    const syllabusPreview = useMemo(() => {
        if (!subjects || subjects.length === 0) return [];
        return subjects.slice(0, 3).map((sub) => {
            const totalCount = sub.credits ? sub.credits * 3 : 12;
            const completedCount = Math.min(
                totalCount,
                Array.from(completedTopicIds).filter(
                    (id) => Math.abs(id % 100) === sub.subjectKey % 100,
                ).length,
            );
            const percentage =
                totalCount > 0
                    ? Math.min(100, Math.round((completedCount / totalCount) * 100))
                    : 0;
            return {
                subjectKey: sub.subjectKey,
                code: subjectCode(sub),
                name: subjectDisplayName(sub),
                completedCount,
                totalCount,
                percentage,
            };
        });
    }, [subjects, completedTopicIds]);

    // ── 4 Study Tools Shortcuts (Balanced 2x2 grid) ──────────────────────────
    const homeStudyTools = useMemo(
        () => [
            {
                id: "planner",
                title: "Daily Planner",
                subtitle: `${goals.filter((g) => g.completed).length} of ${goals.length} goals completed`,
                icon: "checkbox-outline" as const,
                onPress: () => setActiveModal("daily-planner"),
            },
            {
                id: "report",
                title: "Study Report",
                subtitle: `${studyStats.totalMinutes} mins recorded`,
                icon: "bar-chart-outline" as const,
                onPress: () => setActiveModal("study-report"),
            },
            {
                id: "timer",
                title: "Focus Timer",
                subtitle: "25m Interval",
                icon: "timer-outline" as const,
                onPress: () => setActiveModal("focus-timer"),
            },
            {
                id: "reminders",
                title: "Study Reminders",
                subtitle: "Daily study alerts",
                icon: "notifications-outline" as const,
                onPress: () => setActiveModal("study-reminders"),
            },
        ],
        [goals, studyStats],
    );

    return (
        <AppShell active="home">
            <View style={s.container}>
                {/* 1. WELCOME BANNER */}
                <View style={s.bannerCard}>
                    <View style={s.bannerContent}>
                        <View style={s.bannerTextCol}>
                            <Text style={s.bannerGreeting}>
                                {greeting} 👋, {displayName}
                            </Text>
                            <Text style={s.bannerHeadline}>
                                Make today count.
                            </Text>
                            <Text style={s.bannerSubtitle}>
                                Stay consistent, keep learning, and achieve your goals.
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
                                <Text style={s.bannerButtonText}>
                                    Go to My Plan
                                </Text>
                                <Ionicons
                                    name="arrow-forward"
                                    size={14}
                                    color="#FFFFFF"
                                />
                            </Pressable>
                        </View>
                        {isWide && (
                            <View style={s.bannerIllustrationWrapper}>
                                <AcademicBannerIllustration size={76} />
                            </View>
                        )}
                    </View>
                </View>

                {/* Section Divider */}
                <View style={s.sectionDivider} />

                {/* 2. UPCOMING EXAM */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <View style={s.sectionHeaderLeft}>
                            <View style={s.sectionAccentBar} />
                            <Text style={s.sectionTitle}>
                                Upcoming Exam
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => setActiveModal("upcoming-exams")}
                            accessibilityRole="button"
                            accessibilityLabel="View all exams"
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

                    {nearestExamInfo ? (
                        <View style={s.card}>
                            <View style={s.examRow}>
                                <View style={{ flex: 1, gap: 4 }}>
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
                                    Add your upcoming tests and assignment deadlines to track countdowns.
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => setActiveModal("upcoming-exams")}
                                style={s.emptyAction}
                            >
                                <Text style={s.emptyActionText}>Add Exam</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Section Divider */}
                <View style={s.sectionDivider} />

                {/* 3. TODAY'S TIMETABLE */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <View style={s.sectionHeaderLeft}>
                            <View style={[s.sectionAccentBar, { backgroundColor: "#3B82F6" }]} />
                            <Text style={s.sectionTitle}>
                                {"Today's Timetable"}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => setActiveModal("timetable")}
                            accessibilityRole="button"
                            accessibilityLabel="View full timetable"
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

                    {todaySchedule.length > 0 ? (
                        <View style={s.card}>
                            {todaySchedule.map((item, idx) => (
                                <View
                                    key={item.id}
                                    style={[
                                        s.scheduleRow,
                                        idx < todaySchedule.length - 1 && s.scheduleDivider,
                                    ]}
                                >
                                    <Text style={s.scheduleTime}>{item.time}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.scheduleTitle}>{item.title}</Text>
                                        <Text style={s.scheduleLocation}>
                                            {item.location}
                                        </Text>
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
                                    No classes scheduled today
                                </Text>
                                <Text style={s.emptyCardSub}>
                                    Add your daily lectures and lab timings to keep your routine organized.
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => setActiveModal("timetable")}
                                style={s.emptyAction}
                            >
                                <Text style={s.emptyActionText}>Add Class</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Section Divider */}
                <View style={s.sectionDivider} />

                {/* 4. SYLLABUS TRACKER */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <View style={s.sectionHeaderLeft}>
                            <View style={[s.sectionAccentBar, { backgroundColor: "#10B981" }]} />
                            <Text style={s.sectionTitle}>Syllabus Tracker</Text>
                        </View>
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
                        <View style={s.card}>
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
                                        idx < syllabusPreview.length - 1 && s.syllabusDivider,
                                        pressed && { opacity: 0.8 },
                                    ]}
                                >
                                    <View style={s.syllabusHeaderRow}>
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
                                        <View style={s.syllabusPctBadge}>
                                            <Text style={s.syllabusPctText}>
                                                {item.percentage}%
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={s.progressBarWrapper}>
                                        <ProgressBar
                                            progress={item.percentage}
                                            color={theme.accent}
                                            height={6}
                                        />
                                    </View>

                                    <View style={s.syllabusFooterRow}>
                                        <View style={s.syllabusTopicsCountCol}>
                                            <Ionicons
                                                name="checkmark-circle-outline"
                                                size={13}
                                                color={theme.muted}
                                            />
                                            <Text style={s.syllabusTopicsCount}>
                                                {item.completedCount} of {item.totalCount} topics completed
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={12}
                                            color={theme.muted}
                                        />
                                    </View>
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

                {/* Section Divider */}
                <View style={s.sectionDivider} />

                {/* 5. FOUR STUDY TOOLS CARDS (Balanced 2x2 grid) */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <View style={s.sectionHeaderLeft}>
                            <View style={[s.sectionAccentBar, { backgroundColor: theme.accent }]} />
                            <Text style={s.sectionTitle}>Study Tools</Text>
                        </View>
                    </View>

                    <View style={s.toolsGrid}>
                        {homeStudyTools.map((tool) => (
                            <Pressable
                                key={tool.id}
                                onPress={tool.onPress}
                                accessibilityRole="button"
                                accessibilityLabel={tool.title}
                                style={({ pressed }) => [
                                    s.toolCard,
                                    pressed && { opacity: 0.85 },
                                ]}
                            >
                                <View style={s.toolCardTop}>
                                    <View style={s.toolIconWrapper}>
                                        <Ionicons
                                            name={tool.icon}
                                            size={18}
                                            color={theme.accent}
                                        />
                                    </View>
                                    <View style={s.toolChevronWrapper}>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={12}
                                            color={theme.muted}
                                        />
                                    </View>
                                </View>
                                <View style={s.toolCardBottom}>
                                    <Text style={s.toolTitle} numberOfLines={1}>
                                        {tool.title}
                                    </Text>
                                    <Text style={s.toolSub} numberOfLines={1}>
                                        {tool.subtitle}
                                    </Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                </View>
            </View>

            {/* Shared Study Tools Modals */}
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
            width: "100%",
            maxWidth: 900,
            alignSelf: "center",
            gap: 24,
            paddingBottom: 32,
        },

        // ── 1. Welcome Banner ────────────────────────────────────────────────
        bannerCard: {
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            borderLeftWidth: 3,
            borderLeftColor: t.accent,
            padding: 20,
        },
        bannerContent: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        bannerTextCol: {
            flex: 1,
            gap: 4,
            paddingRight: 12,
        },
        bannerGreeting: {
            color: t.muted,
            fontSize: 12,
            fontWeight: "600",
        },
        bannerHeadline: {
            color: t.text,
            fontSize: 22,
            fontWeight: "700",
            letterSpacing: -0.3,
        },
        bannerSubtitle: {
            color: t.muted,
            fontSize: 13,
            lineHeight: 18,
            marginTop: 2,
            marginBottom: 6,
        },
        bannerButton: {
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: t.accent,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 8,
            marginTop: 4,
        },
        bannerButtonText: {
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: "700",
        },
        bannerIllustrationWrapper: {
            alignItems: "center",
            justifyContent: "center",
            width: 86,
            height: 86,
        },

        // ── Shared Section Styles ───────────────────────────────────────────
        section: {
            gap: 12,
        },
        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        sectionHeaderLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        sectionAccentBar: {
            width: 3.5,
            height: 16,
            borderRadius: 2,
            backgroundColor: t.accent,
        },
        sectionDivider: {
            height: 1,
            backgroundColor: t.border,
            opacity: 0.5,
            marginVertical: 4,
        },
        sectionTitle: {
            color: t.text,
            fontSize: 16,
            fontWeight: "700",
            letterSpacing: -0.2,
        },
        actionLink: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingVertical: 2,
        },
        actionLinkText: {
            color: t.accent,
            fontSize: 13,
            fontWeight: "600",
        },

        // ── Shared Card Surface ─────────────────────────────────────────────
        card: {
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
        },

        // ── 2. Upcoming Exam ────────────────────────────────────────────────
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
            backgroundColor: t.surfaceAlt,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: t.border,
        },
        subjectPillText: {
            color: t.textSecondary,
            fontSize: 11,
            fontWeight: "700",
        },
        examDateText: {
            color: t.muted,
            fontSize: 12,
            fontWeight: "500",
        },
        examTitle: {
            color: t.text,
            fontSize: 14,
            fontWeight: "700",
        },
        countdownPill: {
            backgroundColor: t.surfaceAlt,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: t.border,
        },
        countdownUrgent: {
            backgroundColor: t.surfaceAlt,
            borderColor: t.danger,
        },
        countdownSoon: {
            backgroundColor: t.surfaceAlt,
            borderColor: t.warning,
        },
        countdownText: {
            color: t.muted,
            fontSize: 11,
            fontWeight: "700",
        },
        countdownTextUrgent: {
            color: t.danger,
        },
        countdownTextSoon: {
            color: t.warning,
        },

        // ── 3. Today's Timetable ────────────────────────────────────────────
        scheduleRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            gap: 14,
        },
        scheduleDivider: {
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        scheduleTime: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "700",
            width: 72,
        },
        scheduleTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
        },
        scheduleLocation: {
            color: t.muted,
            fontSize: 11,
            marginTop: 2,
        },

        // ── 4. Syllabus Tracker ─────────────────────────────────────────────
        syllabusRow: {
            paddingVertical: 14,
            gap: 10,
        },
        syllabusDivider: {
            borderBottomWidth: 1,
            borderBottomColor: t.border,
            paddingBottom: 16,
            marginBottom: 2,
        },
        syllabusHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
        },
        syllabusCodeRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flex: 1,
        },
        syllabusName: {
            color: t.text,
            fontSize: 14,
            fontWeight: "600",
            flex: 1,
        },
        syllabusPctBadge: {
            backgroundColor: t.accentSoft,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
        },
        syllabusPctText: {
            color: t.accent,
            fontSize: 11,
            fontWeight: "700",
        },
        progressBarWrapper: {
            width: "100%",
            marginVertical: 2,
        },
        syllabusFooterRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        syllabusTopicsCountCol: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        syllabusTopicsCount: {
            color: t.muted,
            fontSize: 12,
            fontWeight: "500",
        },

        // ── 5. Four Study Tools Cards ───────────────────────────────────────
        toolsGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "space-between",
        },
        toolCard: {
            width: "48%",
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            padding: 14,
            minHeight: 110,
            justifyContent: "space-between",
        },
        toolCardTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
        },
        toolIconWrapper: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: t.accentSoft,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: t.accent + "25",
        },
        toolChevronWrapper: {
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: t.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
        },
        toolCardBottom: {
            gap: 3,
            marginTop: 8,
        },
        toolTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "700",
            letterSpacing: -0.1,
        },
        toolSub: {
            color: t.muted,
            fontSize: 11,
            fontWeight: "500",
        },

        // ── Empty States ────────────────────────────────────────────────────
        emptyCard: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
            gap: 12,
        },
        emptyCardBody: {
            flex: 1,
            gap: 2,
        },
        emptyCardTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
        },
        emptyCardSub: {
            color: t.muted,
            fontSize: 11,
            lineHeight: 16,
        },
        emptyAction: {
            paddingVertical: 5,
            paddingHorizontal: 10,
            backgroundColor: t.surfaceAlt,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: t.border,
        },
        emptyActionText: {
            color: t.accent,
            fontSize: 11,
            fontWeight: "700",
        },
    });
}
