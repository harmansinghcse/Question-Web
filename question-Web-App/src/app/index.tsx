import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppShell, { useLayout } from "../components/AppShell";
import AcademicBannerIllustration from "../components/AcademicBannerIllustration";
import {
    EmptyBlock,
    ErrorBlock,
    LoadingBlock,
    ProgressBar,
} from "../components/ui";
import StudyToolsModals, {
    type ActiveToolModal,
} from "../components/StudyToolsModals";
import { useAppTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";
import {
    syllabusTrackerApi,
    type TrackerContextResponse,
} from "../services/syllabus-tracker-api";
import { useApiData } from "../hooks/use-api-data";
import { useStudentSchedule } from "../hooks/use-student-schedule";
import {
    subjectCode,
    subjectDisplayName,
} from "../constants/subjects";
import {
    studyStorage,
    type StudyGoal,
    type StudyStats,
} from "../services/study-storage";
import type { AppTheme } from "../constants/theme";

const DAY_KEYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function HomeScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const { user, isAuthenticated, isRestoring } = useAuth();
    const { isWide, isCompact } = useLayout();
    const s = useMemo(() => makeStyles(theme), [theme]);

    // ── Local Storage Data ───────────────────────────────────────────────────
    const [goals, setGoals] = useState<StudyGoal[]>([]);
    const [studyStats, setStudyStats] = useState<StudyStats>({
        totalMinutes: 0,
        sessionsCompleted: 0,
        lastStudyDate: new Date().toISOString(),
    });

    // ── Active Modal ────────────────────────────────────────────────────────
    const [activeModal, setActiveModal] = useState<ActiveToolModal>(null);

    // Load local storage on mount
    useEffect(() => {
        let isMounted = true;
        async function loadStoredData() {
            try {
                const [storedGoals, storedStats] = await Promise.all([
                    studyStorage.getGoals(),
                    studyStorage.getStudyStats(),
                ]);
                if (isMounted) {
                    setGoals(storedGoals);
                    setStudyStats(storedStats);
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

    // ── Backend Data ─────────────────────────────────────────────────────────
    const canFetchTracker = isAuthenticated && !isRestoring;
    const fetchTrackerContext = useCallback(
        () => syllabusTrackerApi.getContext(),
        [],
    );
    const trackerState = useApiData<TrackerContextResponse>(
        fetchTrackerContext,
        canFetchTracker,
    );

    // Real timetable + upcoming exams (department/semester resolved by the backend)
    const schedule = useStudentSchedule();

    // Backend exams (already department/semester scoped and unexpired)
    const upcomingExams = useMemo(
        () => schedule.exams.data ?? [],
        [schedule.exams.data],
    );

    // Today's classes (at most 3 on Home) from the real timetable
    const todaySchedule = useMemo(() => {
        const entries = schedule.timetable.data?.timetable?.entries ?? [];
        const todayKey = DAY_KEYS[new Date().getDay()];
        return entries
            .filter((e) => e.dayOfWeek === todayKey)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .slice(0, 3);
    }, [schedule.timetable.data]);

    const timetableNeedsDivision =
        schedule.timetable.status === "success" &&
        !!schedule.timetable.data &&
        !schedule.timetable.data.timetable &&
        schedule.timetable.data.divisions.length > 1;
    const timetableEmptyText = timetableNeedsDivision
        ? "Choose your division to see your classes."
        : schedule.timetable.data?.divisions.length === 0
          ? "No timetable has been published for your department and semester yet."
          : "No classes are scheduled for today.";

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
        if (upcomingExams.length === 0) return null;
        const sorted = [...upcomingExams].sort(
            (a, b) =>
                new Date(a.examDate).getTime() - new Date(b.examDate).getTime(),
        );
        const next = sorted[0];
        const examDate = new Date(next.examDate);
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

        const formattedDate = new Date(next.examDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });

        return {
            exam: next,
            subjectLabel:
                next.subject?.subjectName ||
                next.subject?.subjectId ||
                next.department?.deptName ||
                "Exam",
            countdownLabel,
            countdownTone,
            formattedDate,
        };
    }, [upcomingExams]);

    // ── Syllabus Progress Preview (at most 3 subject rows from real backend records) ───
    const syllabusPreview = useMemo(() => {
        if (!canFetchTracker || trackerState.status !== "success" || !trackerState.data) {
            return [];
        }
        const ctx = trackerState.data;
        const sem = ctx.academicContext.currentSemester;
        const semSubjects = sem
            ? ctx.subjects.filter((sub) => sub.semester === sem)
            : [];
        const list = semSubjects.length > 0 ? semSubjects : ctx.subjects;
        return list.slice(0, 3).map((sub) => ({
            subjectKey: sub.subjectKey,
            code: subjectCode(sub),
            name: subjectDisplayName(sub),
            completedCount: sub.coveredTopics,
            totalCount: sub.totalTopics,
            percentage: sub.coveragePercent,
        }));
    }, [canFetchTracker, trackerState]);

    // ── 4 Study Tools Shortcuts (Balanced 2x2 grid) ──────────────────────────
    const homeStudyTools = useMemo(
        () => [
            {
                id: "planner",
                title: "Daily Planner",
                subtitle: `${goals.filter((g) => g.completed).length} of ${goals.length} tasks done`,
                icon: "checkbox-outline" as const,
                onPress: () => setActiveModal("daily-planner"),
            },
            {
                id: "report",
                title: "Study Report",
                subtitle: `${studyStats.totalMinutes}m logged • ${studyStats.sessionsCompleted} sessions`,
                icon: "bar-chart-outline" as const,
                onPress: () => setActiveModal("study-report"),
            },
            {
                id: "timer",
                title: "Focus Timer",
                subtitle: "25m Pomodoro sessions",
                icon: "timer-outline" as const,
                onPress: () => setActiveModal("focus-timer"),
            },
            {
                id: "reminders",
                title: "Study Reminders",
                subtitle: "Custom daily alerts",
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
                            <View style={s.greetingBadge}>
                                <Ionicons name="sparkles" size={12} color={theme.accent} />
                                <Text style={s.bannerGreeting} numberOfLines={1}>
                                    {greeting}, {displayName}
                                </Text>
                            </View>
                            <Text style={s.bannerHeadline}>
                                Make Today Count.
                            </Text>
                            <Text style={s.bannerSubtitle}>
                                Stay consistent, master your coursework, and keep tracking your progress.
                            </Text>
                            <View style={s.bannerActionsRow}>
                                <Pressable
                                    onPress={() => setActiveModal("daily-planner")}
                                    accessibilityRole="button"
                                    accessibilityLabel="Go to Daily Plan"
                                    style={({ pressed }) => [
                                        s.bannerButton,
                                        pressed && { opacity: 0.85 },
                                    ]}
                                >
                                    <Text style={s.bannerButtonText}>
                                        Open Daily Plan
                                    </Text>
                                    <Ionicons
                                        name="arrow-forward"
                                        size={14}
                                        color="#FFFFFF"
                                    />
                                </Pressable>
                                <Pressable
                                    onPress={() => router.push("/learn" as never)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Browse Question Bank"
                                    style={({ pressed }) => [
                                        s.bannerSecondaryButton,
                                        pressed && { opacity: 0.85 },
                                    ]}
                                >
                                    <Ionicons
                                        name="book-outline"
                                        size={14}
                                        color={theme.text}
                                    />
                                    <Text style={s.bannerSecondaryButtonText}>
                                        Question Bank
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                        {isWide && (
                            <View style={s.bannerIllustrationWrapper}>
                                <AcademicBannerIllustration size={84} />
                            </View>
                        )}
                    </View>
                </View>

                {/* 2. UPCOMING EXAMS AND TESTS */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <View style={s.sectionHeaderLeft}>
                            <View style={s.sectionAccentBar} />
                            <Text style={s.sectionTitle}>
                                Upcoming Exams
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
                                size={14}
                                color={theme.accent}
                            />
                        </Pressable>
                    </View>

                    {schedule.exams.status === "unauthenticated" ? (
                        <EmptyBlock
                            icon="log-in-outline"
                            title="Sign in to view exams"
                            text="Upcoming examinations and schedules will show here once you sign in."
                            actionLabel="Sign in"
                            onAction={() => router.push("/login" as never)}
                        />
                    ) : schedule.exams.status === "loading" ? (
                        <LoadingBlock label="Loading upcoming exams..." />
                    ) : schedule.exams.status === "error" ? (
                        <ErrorBlock
                            title="Couldn't load upcoming exams"
                            message={schedule.exams.message ?? undefined}
                            onRetry={schedule.exams.refresh}
                        />
                    ) : nearestExamInfo ? (
                        <Pressable
                            onPress={() => setActiveModal("upcoming-exams")}
                            style={({ pressed }) => [
                                s.examCard,
                                pressed && { opacity: 0.9 },
                            ]}
                        >
                            <View style={s.examRow}>
                                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                                    <View style={s.examTagRow}>
                                        <View style={[s.subjectPill, { flexShrink: 1 }]}>
                                            <Text
                                                style={s.subjectPillText}
                                                numberOfLines={1}
                                            >
                                                {nearestExamInfo.subjectLabel}
                                            </Text>
                                        </View>
                                        <Text style={s.examDateText}>
                                            {nearestExamInfo.formattedDate}
                                        </Text>
                                    </View>
                                    <Text style={s.examTitle} numberOfLines={2}>
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
                        </Pressable>
                    ) : (
                        <View style={s.emptyCard}>
                            <View style={s.emptyIconCircle}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={18}
                                    color={theme.accent}
                                />
                            </View>
                            <View style={s.emptyCardBody}>
                                <Text style={s.emptyCardTitle}>
                                    No upcoming exams scheduled
                                </Text>
                                <Text style={s.emptyCardSub}>
                                    Exams scheduled for your department will appear here.
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* 3. TODAY'S TIMETABLE */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <View style={s.sectionHeaderLeft}>
                            <View style={s.sectionAccentBar} />
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
                                size={14}
                                color={theme.accent}
                            />
                        </Pressable>
                    </View>

                    {schedule.timetable.status === "unauthenticated" ? (
                        <EmptyBlock
                            icon="log-in-outline"
                            title="Sign in to view timetable"
                            text="Your class schedule is based on your department and semester."
                            actionLabel="Sign in"
                            onAction={() => router.push("/login" as never)}
                        />
                    ) : schedule.timetable.status === "loading" ? (
                        <LoadingBlock label="Loading timetable..." />
                    ) : schedule.timetable.status === "error" ? (
                        <ErrorBlock
                            title="Couldn't load timetable"
                            message={schedule.timetable.message ?? undefined}
                            onRetry={schedule.timetable.refresh}
                        />
                    ) : todaySchedule.length > 0 ? (
                        <View style={s.card}>
                            {todaySchedule.map((item, idx) => (
                                <View
                                    key={item.entryId}
                                    style={[
                                        s.scheduleRow,
                                        idx < todaySchedule.length - 1 && s.scheduleDivider,
                                    ]}
                                >
                                    <View style={s.timeBlock}>
                                        <Text style={s.scheduleTime}>
                                            {item.startTime}
                                        </Text>
                                        <Text style={s.scheduleEndTime}>
                                            {item.endTime}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                                        <Text style={s.scheduleTitle} numberOfLines={1}>
                                            {item.subject?.subjectName ||
                                                item.subject?.subjectId ||
                                                `Subject #${item.subjectKey}`}
                                        </Text>
                                        <Text style={s.scheduleLocation} numberOfLines={1}>
                                            {[
                                                item.classroom ? `Room: ${item.classroom}` : null,
                                                item.teacher,
                                                item.classType,
                                            ]
                                                .filter(Boolean)
                                                .join("  •  ")}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={s.emptyCard}>
                            <View style={s.emptyIconCircle}>
                                <Ionicons
                                    name="time-outline"
                                    size={18}
                                    color={theme.accent}
                                />
                            </View>
                            <View style={s.emptyCardBody}>
                                <Text style={s.emptyCardTitle}>
                                    {timetableNeedsDivision
                                        ? "Select your division"
                                        : "No classes scheduled today"}
                                </Text>
                                <Text style={s.emptyCardSub}>
                                    {timetableEmptyText}
                                </Text>
                            </View>
                            {timetableNeedsDivision && (
                                <Pressable
                                    onPress={() => setActiveModal("timetable")}
                                    style={s.emptyAction}
                                >
                                    <Text style={s.emptyActionText}>
                                        Choose Div
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>

                {/* 4. SYLLABUS TRACKER */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <View style={s.sectionHeaderLeft}>
                            <View style={s.sectionAccentBar} />
                            <Text style={s.sectionTitle}>Syllabus Progress</Text>
                        </View>
                        <Pressable
                            onPress={() =>
                                router.push("/syllabus-tracker" as never)
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Open Syllabus Tracker"
                            style={s.actionLink}
                        >
                            <Text style={s.actionLinkText}>Open Tracker</Text>
                            <Ionicons
                                name="chevron-forward"
                                size={14}
                                color={theme.accent}
                            />
                        </Pressable>
                    </View>

                    {!isAuthenticated && !isRestoring ? (
                        <EmptyBlock
                            icon="git-network-outline"
                            title="Sign in to track syllabus coverage"
                            text="Record lecture-by-lecture topic coverage and view real-time completion analytics."
                            actionLabel="Sign in"
                            onAction={() => router.push("/login" as never)}
                        />
                    ) : isRestoring || trackerState.status === "loading" ? (
                        <LoadingBlock label="Loading syllabus coverage..." />
                    ) : trackerState.status === "error" ? (
                        <ErrorBlock
                            title="Couldn't load syllabus coverage"
                            message={trackerState.message}
                            onRetry={trackerState.refresh}
                        />
                    ) : syllabusPreview.length > 0 ? (
                        <View style={s.card}>
                            {syllabusPreview.map((item, idx) => (
                                <Pressable
                                    key={item.subjectKey}
                                    onPress={() =>
                                        router.push(
                                            `/syllabus-tracker?subjectKey=${encodeURIComponent(item.subjectKey)}` as never,
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
                                                <Text
                                                    style={s.subjectPillText}
                                                    numberOfLines={1}
                                                >
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
                                                name="checkmark-circle"
                                                size={13}
                                                color={theme.success}
                                            />
                                            <Text style={s.syllabusTopicsCount}>
                                                {item.completedCount} of {item.totalCount} topics covered
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={13}
                                            color={theme.textSecondary}
                                        />
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        <View style={s.emptyCard}>
                            <View style={s.emptyIconCircle}>
                                <Ionicons
                                    name="book-outline"
                                    size={18}
                                    color={theme.accent}
                                />
                            </View>
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

                {/* 5. FOUR STUDY TOOLS CARDS (Balanced 2x2 grid) */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <View style={s.sectionHeaderLeft}>
                            <View style={s.sectionAccentBar} />
                            <Text style={s.sectionTitle}>Study Tools</Text>
                        </View>
                        <Pressable
                            onPress={() => router.push("/study-tools" as never)}
                            accessibilityRole="button"
                            accessibilityLabel="Open all study tools"
                            style={s.actionLink}
                        >
                            <Text style={s.actionLinkText}>All Tools</Text>
                            <Ionicons
                                name="chevron-forward"
                                size={14}
                                color={theme.accent}
                            />
                        </Pressable>
                    </View>

                    <View style={s.toolsGrid}>
                        <View
                            style={[
                                s.toolsRow,
                                isCompact && { flexDirection: "column" },
                            ]}
                        >
                            {homeStudyTools.slice(0, 2).map((tool) => (
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
                                                size={13}
                                                color={theme.textSecondary}
                                            />
                                        </View>
                                    </View>
                                    <View style={s.toolCardBottom}>
                                        <Text style={s.toolTitle} numberOfLines={1}>
                                            {tool.title}
                                        </Text>
                                        <Text style={s.toolSub} numberOfLines={2}>
                                            {tool.subtitle}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                        <View
                            style={[
                                s.toolsRow,
                                isCompact && { flexDirection: "column" },
                            ]}
                        >
                            {homeStudyTools.slice(2, 4).map((tool) => (
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
                                                size={13}
                                                color={theme.textSecondary}
                                            />
                                        </View>
                                    </View>
                                    <View style={s.toolCardBottom}>
                                        <Text style={s.toolTitle} numberOfLines={1}>
                                            {tool.title}
                                        </Text>
                                        <Text style={s.toolSub} numberOfLines={2}>
                                            {tool.subtitle}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            {/* Shared Study Tools Modals */}
            <StudyToolsModals
                activeModal={activeModal}
                onClose={() => setActiveModal(null)}
                goals={goals}
                timetable={schedule.timetable}
                exams={schedule.exams}
                onSelectDivision={schedule.selectDivision}
                studyStats={studyStats}
                onGoalsChange={setGoals}
                onStudyStatsChange={setStudyStats}
            />
        </AppShell>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        container: {
            width: "100%",
            maxWidth: 880,
            alignSelf: "center",
            gap: 24,
            paddingBottom: 24,
        },

        // ── 1. Welcome Banner ────────────────────────────────────────────────
        bannerCard: {
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 18,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2,
        },
        bannerContent: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
        },
        bannerTextCol: {
            flex: 1,
            minWidth: 0,
            gap: 6,
        },
        greetingBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: t.accentSoft,
            maxWidth: "100%",
        },
        bannerGreeting: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "700",
            flexShrink: 1,
        },
        bannerHeadline: {
            color: t.text,
            fontSize: 24,
            fontWeight: "800",
            letterSpacing: -0.4,
            marginTop: 2,
        },
        bannerSubtitle: {
            color: t.textSecondary,
            fontSize: 13,
            lineHeight: 19,
            marginBottom: 4,
        },
        bannerActionsRow: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 4,
        },
        bannerButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            backgroundColor: t.accent,
            borderRadius: 9,
            paddingHorizontal: 16,
            paddingVertical: 9,
            shadowColor: t.accent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2,
        },
        bannerButtonText: {
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: "700",
        },
        bannerSecondaryButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 9,
            paddingHorizontal: 14,
            paddingVertical: 9,
        },
        bannerSecondaryButtonText: {
            color: t.text,
            fontSize: 13,
            fontWeight: "700",
        },
        bannerIllustrationWrapper: {
            alignItems: "center",
            justifyContent: "center",
            width: 90,
            height: 90,
            flexShrink: 0,
        },

        // ── Shared Section Styles ───────────────────────────────────────────
        section: {
            gap: 12,
        },
        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
        },
        sectionHeaderLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            flex: 1,
            minWidth: 0,
        },
        sectionAccentBar: {
            width: 3.5,
            height: 16,
            borderRadius: 2,
            backgroundColor: t.accent,
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
            gap: 3,
            paddingVertical: 2,
            flexShrink: 0,
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
            padding: 18,
        },

        // ── 2. Upcoming Exam ────────────────────────────────────────────────
        examCard: {
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
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
            flexWrap: "wrap",
            gap: 8,
        },
        subjectPill: {
            backgroundColor: t.surfaceAlt,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: t.border,
            maxWidth: "100%",
        },
        subjectPillText: {
            color: t.textSecondary,
            fontSize: 11,
            fontWeight: "700",
        },
        examDateText: {
            color: t.textSecondary,
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
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: t.border,
            flexShrink: 0,
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
            color: t.textSecondary,
            fontSize: 12,
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
            paddingVertical: 11,
            gap: 14,
        },
        scheduleDivider: {
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        timeBlock: {
            width: 72,
            flexShrink: 0,
        },
        scheduleTime: {
            color: t.accent,
            fontSize: 13,
            fontWeight: "700",
        },
        scheduleEndTime: {
            color: t.muted,
            fontSize: 11,
            fontWeight: "500",
        },
        scheduleTitle: {
            color: t.text,
            fontSize: 14,
            fontWeight: "600",
        },
        scheduleLocation: {
            color: t.textSecondary,
            fontSize: 12,
            marginTop: 2,
        },

        // ── 4. Syllabus Tracker ─────────────────────────────────────────────
        syllabusRow: {
            paddingVertical: 12,
            gap: 9,
        },
        syllabusDivider: {
            borderBottomWidth: 1,
            borderBottomColor: t.border,
            paddingBottom: 14,
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
            gap: 9,
            flex: 1,
            minWidth: 0,
        },
        syllabusName: {
            color: t.text,
            fontSize: 14,
            fontWeight: "600",
            flex: 1,
            minWidth: 0,
        },
        syllabusPctBadge: {
            backgroundColor: t.accentSoft,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            flexShrink: 0,
        },
        syllabusPctText: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "700",
        },
        progressBarWrapper: {
            width: "100%",
            marginVertical: 1,
        },
        syllabusFooterRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
        },
        syllabusTopicsCountCol: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 0,
        },
        syllabusTopicsCount: {
            color: t.textSecondary,
            fontSize: 12,
            fontWeight: "500",
            flexShrink: 1,
        },

        // ── 5. Four Study Tools Cards ───────────────────────────────────────
        toolsGrid: {
            gap: 12,
        },
        toolsRow: {
            flexDirection: "row",
            gap: 12,
        },
        toolCard: {
            flex: 1,
            minWidth: 0,
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            padding: 14,
            minHeight: 112,
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
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: t.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
        },
        toolCardBottom: {
            gap: 3,
            marginTop: 10,
        },
        toolTitle: {
            color: t.text,
            fontSize: 14,
            fontWeight: "700",
            letterSpacing: -0.1,
        },
        toolSub: {
            color: t.textSecondary,
            fontSize: 11,
            lineHeight: 15,
            fontWeight: "500",
        },

        // ── Empty States ────────────────────────────────────────────────────
        emptyCard: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
            gap: 12,
        },
        emptyIconCircle: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: t.accentSoft,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
        },
        emptyCardBody: {
            flex: 1,
            minWidth: 0,
            gap: 2,
        },
        emptyCardTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
        },
        emptyCardSub: {
            color: t.textSecondary,
            fontSize: 12,
            lineHeight: 17,
        },
        emptyAction: {
            paddingVertical: 6,
            paddingHorizontal: 12,
            backgroundColor: t.surfaceAlt,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: t.border,
            flexShrink: 0,
        },
        emptyActionText: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "700",
        },
    });
}
