import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppShell from "../components/AppShell";
import StudyToolsModals, {
    type ActiveToolModal,
} from "../components/StudyToolsModals";
import { useAppTheme } from "../providers/ThemeProvider";
import {
    studyStorage,
    type ExamItem,
    type ScheduleItem,
    type StudyGoal,
    type StudyStats,
} from "../services/study-storage";
import type { AppTheme } from "../constants/theme";

export default function StudyToolsScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();

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

    const [activeModal, setActiveModal] = useState<ActiveToolModal>(null);

    // Load local storage on mount
    useEffect(() => {
        let isMounted = true;
        async function loadStoredData() {
            try {
                const [storedGoals, storedSchedule, storedExams, storedStats] =
                    await Promise.all([
                        studyStorage.getGoals(),
                        studyStorage.getSchedule(),
                        studyStorage.getExams(),
                        studyStorage.getStudyStats(),
                    ]);
                if (isMounted) {
                    setGoals(storedGoals);
                    setSchedule(storedSchedule);
                    setExams(storedExams);
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

    const toolsList = [
        {
            id: "syllabus",
            title: "Syllabus Tracker",
            subtitle: "Curriculum progress and topic mastery across semesters",
            icon: "book-outline" as const,
            stat: "Browse subjects",
            action: () => router.push("/syllabus"),
        },
        {
            id: "timetable",
            title: "Timetable & Classes",
            subtitle: "Manage daily lecture timings, laboratory sessions, and classrooms",
            icon: "time-outline" as const,
            stat: `${schedule.length} ${schedule.length === 1 ? "class" : "classes"} today`,
            action: () => setActiveModal("timetable"),
        },
        {
            id: "planner",
            title: "Daily Planner",
            subtitle: "Set study goals, plan your schedule, and check off completed tasks",
            icon: "checkbox-outline" as const,
            stat: `${goals.filter((g) => g.completed).length} of ${goals.length} goals completed`,
            action: () => setActiveModal("daily-planner"),
        },
        {
            id: "timer",
            title: "Focus Timer",
            subtitle: "Timed study intervals using the 25-minute Pomodoro method",
            icon: "timer-outline" as const,
            stat: "25m Interval",
            action: () => setActiveModal("focus-timer"),
        },
        {
            id: "exams",
            title: "Upcoming Exams",
            subtitle: "Track mid-semester exams, quizzes, and end-sem test countdowns",
            icon: "calendar-outline" as const,
            stat: `${exams.length} ${exams.length === 1 ? "exam" : "exams"} scheduled`,
            action: () => setActiveModal("upcoming-exams"),
        },
        {
            id: "report",
            title: "Study Report",
            subtitle: "Review your focus statistics, logged study time, and consistency",
            icon: "bar-chart-outline" as const,
            stat: `${studyStats.totalMinutes} mins recorded`,
            action: () => setActiveModal("study-report"),
        },
        {
            id: "reminders",
            title: "Study Reminders",
            subtitle: "Set custom alerts for revision sessions, homework, and deadlines",
            icon: "notifications-outline" as const,
            stat: "Custom notifications",
            action: () => setActiveModal("study-reminders"),
        },
    ];

    return (
        <AppShell active="tools">
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <Text style={s.eyebrow}>PRODUCTIVITY SUITE</Text>
                    <Text style={s.title}>Study Tools</Text>
                    <Text style={s.subtitle}>
                        Academic productivity and time management hub designed for engineering students.
                    </Text>
                </View>

                {/* Grid */}
                <View style={s.grid}>
                    {toolsList.map((tool) => (
                        <Pressable
                            key={tool.id}
                            onPress={tool.action}
                            accessibilityRole="button"
                            accessibilityLabel={tool.title}
                            style={({ pressed }) => [
                                s.card,
                                pressed && { opacity: 0.9 },
                            ]}
                        >
                            <View style={s.iconWrapper}>
                                <Ionicons
                                    name={tool.icon}
                                    size={20}
                                    color={theme.accent}
                                />
                            </View>

                            <View style={s.cardBody}>
                                <Text style={s.cardTitle}>{tool.title}</Text>
                                <Text style={s.cardSub}>{tool.subtitle}</Text>
                            </View>

                            <View style={s.cardFooter}>
                                <Text style={s.statText}>
                                    {tool.stat}
                                </Text>
                                <View style={s.chevronWrap}>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={13}
                                        color={theme.muted}
                                    />
                                </View>
                            </View>
                        </Pressable>
                    ))}
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
            maxWidth: 1000,
            alignSelf: "center",
            gap: 20,
        },
        header: {
            marginBottom: 4,
        },
        eyebrow: {
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.8,
            color: t.muted,
            marginBottom: 4,
        },
        title: {
            fontSize: 24,
            fontWeight: "700",
            color: t.text,
            letterSpacing: -0.3,
        },
        subtitle: {
            fontSize: 13,
            color: t.muted,
            marginTop: 4,
            lineHeight: 18,
        },
        grid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 16,
        },
        card: {
            flex: 1,
            minWidth: Platform.OS === "web" ? 280 : 220,
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            padding: 18,
            justifyContent: "space-between",
            gap: 12,
        },
        iconWrapper: {
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
        },
        cardBody: {
            gap: 6,
        },
        cardTitle: {
            fontSize: 15,
            fontWeight: "700",
            color: t.text,
            letterSpacing: -0.2,
        },
        cardSub: {
            fontSize: 12,
            color: t.muted,
            lineHeight: 17,
        },
        cardFooter: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: t.border,
            marginTop: 4,
        },
        statText: {
            fontSize: 12,
            fontWeight: "600",
            color: t.accent,
        },
        chevronWrap: {
            width: 22,
            height: 22,
            borderRadius: 6,
            backgroundColor: t.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
        },
    });
}
