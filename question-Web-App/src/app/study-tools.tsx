import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppShell, { useLayout } from "../components/AppShell";
import { SearchBar } from "../components/ui";
import StudyToolsModals, {
    type ActiveToolModal,
} from "../components/StudyToolsModals";
import { useAppTheme } from "../providers/ThemeProvider";
import {
    studyStorage,
    type StudyGoal,
    type StudyReminder,
    type StudyStats,
} from "../services/study-storage";
import { useStudentSchedule } from "../hooks/use-student-schedule";
import type { AppTheme } from "../constants/theme";

type ToolCategory = "all" | "practice" | "curriculum" | "schedule";

export default function StudyToolsScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const { isCompact, isWide } = useLayout();
    const s = useMemo(() => makeStyles(theme), [theme]);

    // === Local Storage Data ===
    const [goals, setGoals] = useState<StudyGoal[]>([]);
    const [reminders, setReminders] = useState<StudyReminder[]>([]);
    const [studyStats, setStudyStats] = useState<StudyStats>({
        totalMinutes: 0,
        sessionsCompleted: 0,
        lastStudyDate: new Date().toISOString(),
    });
    const [activeModal, setActiveModal] = useState<ActiveToolModal>(null);
    const [category, setCategory] = useState<ToolCategory>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // === API Data ===
    const schedule = useStudentSchedule();
    const classCount = schedule.timetable.data?.timetable?.entries?.length ?? 0;
    const examCount = schedule.exams.data?.length ?? 0;
    const timetableStat =
        schedule.timetable.status === "unauthenticated"
            ? "Log in to view"
            : schedule.timetable.status === "loading"
              ? "Loading..."
              : schedule.timetable.status === "error"
                ? "Couldn't load - tap to retry"
                : `${classCount} classes assigned`;
    const examsStat =
        schedule.exams.status === "unauthenticated"
            ? "Log in to view"
            : schedule.exams.status === "loading"
              ? "Loading..."
              : schedule.exams.status === "error"
                ? "Couldn't load - tap to retry"
                : `${examCount} ${examCount === 1 ? "exam" : "exams"} scheduled`;

    useEffect(() => {
        let isMounted = true;
        async function loadStoredData() {
            try {
                const [storedGoals, storedStats, storedReminders] = await Promise.all([
                    studyStorage.getGoals(),
                    studyStorage.getStudyStats(),
                    studyStorage.getReminders(),
                ]);
                if (isMounted) {
                    setGoals(storedGoals);
                    setStudyStats(storedStats);
                    setReminders(storedReminders);
                }
            } catch {
                // Silently fallback
            }
        }
        void loadStoredData();
        return () => {
            isMounted = false;
        };
    }, [activeModal]);

    const activeRemindersCount = reminders.filter((r) => r.active).length;
    const completedGoalsCount = goals.filter((g) => g.completed).length;

    const toolsList = useMemo(
        () => [
            {
                id: "quiz",
                title: "Quiz Revision",
                subtitle: "Practice MCQs, fill-ups, and True/False with timer and instant grading",
                icon: "flash-outline" as const,
                stat: "Interactive tests",
                badge: "Practice",
                category: "practice" as ToolCategory,
                action: () => router.push("/quiz-revision" as never),
            },
            {
                id: "prompt-studio",
                title: "Prompt Studio",
                subtitle:
                    "Curate database questions and generate structured study prompts for AI",
                icon: "sparkles-outline" as const,
                stat: "Zero token cost",
                badge: "AI Prompt",
                category: "practice" as ToolCategory,
                action: () => router.push("/prompt-studio" as never),
            },
            {
                id: "syllabus-tracker",
                title: "Syllabus Tracker",
                subtitle:
                    "Record dated lecture coverage, reconstruct quiz portions, and track pace",
                icon: "git-network-outline" as const,
                stat: "Dated history & analytics",
                badge: "Analytics",
                category: "curriculum" as ToolCategory,
                action: () => router.push("/syllabus-tracker" as never),
            },
            {
                id: "syllabus",
                title: "Course Syllabus",
                subtitle:
                    "Browse subjects, chapters, and topics across semesters",
                icon: "book-outline" as const,
                stat: "Browse curriculum",
                badge: "Curriculum",
                category: "curriculum" as ToolCategory,
                action: () => router.push("/syllabus" as never),
            },
            {
                id: "timetable",
                title: "Timetable & Classes",
                subtitle:
                    "Manage daily lecture timings, laboratory sessions, and classrooms",
                icon: "time-outline" as const,
                stat: timetableStat,
                badge: "Schedule",
                category: "schedule" as ToolCategory,
                action: () => setActiveModal("timetable"),
            },
            {
                id: "planner",
                title: "Daily Planner",
                subtitle:
                    "Set study goals, plan your schedule, and check off completed tasks",
                icon: "checkbox-outline" as const,
                stat: `${completedGoalsCount} of ${goals.length} completed`,
                badge: "Goals",
                category: "schedule" as ToolCategory,
                action: () => setActiveModal("daily-planner"),
            },
            {
                id: "timer",
                title: "Focus Timer",
                subtitle:
                    "Timed study intervals using the 25-minute Pomodoro method",
                icon: "timer-outline" as const,
                stat: "25m Interval",
                badge: "Pomodoro",
                category: "schedule" as ToolCategory,
                action: () => setActiveModal("focus-timer"),
            },
            {
                id: "exams",
                title: "Upcoming Exams",
                subtitle:
                    "Track mid-semester exams, quizzes, and end-sem test countdowns",
                icon: "calendar-outline" as const,
                stat: examsStat,
                badge: "Exams",
                category: "curriculum" as ToolCategory,
                action: () => setActiveModal("upcoming-exams"),
            },
            {
                id: "report",
                title: "Study Report",
                subtitle:
                    "Review your focus statistics, logged study time, and consistency",
                icon: "bar-chart-outline" as const,
                stat: `${studyStats.totalMinutes} mins recorded`,
                badge: "Performance",
                category: "schedule" as ToolCategory,
                action: () => setActiveModal("study-report"),
            },
            {
                id: "reminders",
                title: "Study Reminders",
                subtitle:
                    "Set custom alerts for revision sessions, homework, and deadlines",
                icon: "notifications-outline" as const,
                stat:
                    activeRemindersCount > 0
                        ? `${activeRemindersCount} active alerts`
                        : "Custom alerts",
                badge: "Alerts",
                category: "schedule" as ToolCategory,
                action: () => setActiveModal("study-reminders"),
            },
        ],
        [
            router,
            timetableStat,
            completedGoalsCount,
            goals.length,
            examsStat,
            studyStats.totalMinutes,
            activeRemindersCount,
        ],
    );

    const filteredTools = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return toolsList.filter((t) => {
            if (category !== "all" && t.category !== category) return false;
            if (!q) return true;
            return (
                t.title.toLowerCase().includes(q) ||
                t.subtitle.toLowerCase().includes(q) ||
                t.badge.toLowerCase().includes(q)
            );
        });
    }, [toolsList, category, searchQuery]);

    return (
        <AppShell active="tools">
            <View style={s.container}>
                <View style={s.header}>
                    <Text style={s.eyebrow}>PRODUCTIVITY SUITE</Text>
                    <Text style={s.title}>Study Tools</Text>
                    <Text style={s.subtitle}>
                        Academic productivity and time management hub designed
                        for engineering students.
                    </Text>
                </View>

                {/* Search & Category Filter */}
                <View style={s.filterBlock}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search study tools (e.g. Pomodoro, Syllabus, Quiz)..."
                    />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.categoryStrip}
                    >
                        {(
                            [
                                { id: "all", label: `All Tools (${toolsList.length})` },
                                { id: "practice", label: "Practice & AI" },
                                { id: "curriculum", label: "Syllabus & Exams" },
                                { id: "schedule", label: "Schedule & Focus" },
                            ] as const
                        ).map((cat) => {
                            const active = category === cat.id;
                            return (
                                <Pressable
                                    key={cat.id}
                                    onPress={() => setCategory(cat.id)}
                                    style={[
                                        s.catChip,
                                        active && s.catChipActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            s.catChipText,
                                            active && s.catChipTextActive,
                                        ]}
                                    >
                                        {cat.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                <View style={s.grid}>
                    {filteredTools.map((tool) => (
                        <Pressable
                            key={tool.id}
                            onPress={tool.action}
                            style={({ pressed }) => [
                                s.card,
                                isCompact
                                    ? s.cardCompact
                                    : isWide
                                      ? s.cardWide
                                      : s.cardStandard,
                                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                            ]}
                        >
                            <View style={s.cardTopRow}>
                                <View style={s.iconWrapper}>
                                    <Ionicons
                                        name={tool.icon}
                                        size={20}
                                        color={theme.accent}
                                    />
                                </View>
                                <View style={s.badgePill}>
                                    <Text style={s.badgePillText}>{tool.badge}</Text>
                                </View>
                            </View>
                            <View style={s.cardBody}>
                                <Text style={s.cardTitle}>{tool.title}</Text>
                                <Text style={s.cardSub}>{tool.subtitle}</Text>
                            </View>
                            <View style={s.cardFooter}>
                                <Text style={s.statText} numberOfLines={1}>
                                    {tool.stat}
                                </Text>
                                <View style={s.chevronWrap}>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={14}
                                        color={theme.accent}
                                    />
                                </View>
                            </View>
                        </Pressable>
                    ))}
                </View>
            </View>

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
            maxWidth: 1040,
            alignSelf: "center",
            gap: 18,
            paddingBottom: 24,
        },
        header: { marginBottom: 2 },
        eyebrow: {
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 1.2,
            color: t.accent,
            marginBottom: 4,
        },
        title: {
            fontSize: 26,
            fontWeight: "900",
            color: t.text,
            letterSpacing: -0.4,
        },
        subtitle: {
            fontSize: 13,
            color: t.muted,
            marginTop: 4,
            lineHeight: 19,
        },
        filterBlock: {
            gap: 10,
        },
        categoryStrip: {
            gap: 8,
            paddingVertical: 2,
        },
        catChip: {
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        catChipActive: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },
        catChipText: {
            fontSize: 12,
            fontWeight: "700",
            color: t.muted,
        },
        catChipTextActive: {
            color: "#FFFFFF",
        },
        grid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 14,
        },
        card: {
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 18,
            justifyContent: "space-between",
            gap: 14,
            ...Platform.select({
                ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                },
                default: {},
            }),
        },
        cardCompact: {
            width: "100%",
        },
        cardStandard: {
            flexGrow: 1,
            flexBasis: "46%",
            minWidth: 155,
        },
        cardWide: {
            flexGrow: 1,
            flexBasis: "30%",
            minWidth: 260,
        },
        cardTopRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
        },
        iconWrapper: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: t.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: t.border,
        },
        badgePill: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        badgePillText: {
            fontSize: 10,
            fontWeight: "700",
            color: t.muted,
            letterSpacing: 0.4,
        },
        cardBody: { gap: 6 },
        cardTitle: {
            fontSize: 16,
            fontWeight: "700",
            color: t.text,
            letterSpacing: -0.2,
        },
        cardSub: {
            fontSize: 12,
            color: t.muted,
            lineHeight: 18,
        },
        cardFooter: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: t.border,
            marginTop: 2,
            gap: 8,
        },
        statText: {
            fontSize: 12,
            fontWeight: "600",
            color: t.accent,
            flex: 1,
        },
        chevronWrap: {
            width: 24,
            height: 24,
            borderRadius: 8,
            backgroundColor: t.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: t.border,
        },
    });
}
