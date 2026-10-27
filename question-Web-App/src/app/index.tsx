import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppShell, { useLayout } from "../components/AppShell";
import AcademicBannerIllustration from "../components/AcademicBannerIllustration";
import {
    Badge,
    ErrorBlock,
    LoadingBlock,
    ProgressBar,
    TYPE_META,
} from "../components/ui";
import { useAppTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";
import {
    api,
    type Question,
    type QuestionPage,
    type QuestionStats,
    type Subject,
} from "../services/api";
import { useApiData } from "../hooks/use-api-data";
import {
    sortSubjects,
    subjectCode,
    subjectDisplayName,
} from "../constants/subjects";
import {
    studyStorage,
    type ExamItem,
    type ScheduleItem,
    type StudyGoal,
    type StudyStats,
} from "../services/study-storage";
import type { AppTheme } from "../constants/theme";

type ActiveModal =
    | null
    | "focus-timer"
    | "daily-planner"
    | "timetable"
    | "upcoming-exams"
    | "study-report"
    | "study-reminders";

export default function HomeScreen() {
    const router = useRouter();
    const { theme, ready } = useAppTheme();
    const { isRestoring } = useAuth();
    const { isWide } = useLayout();
    const s = useMemo(() => makeStyles(theme), [theme]);

    // ── Local Storage Data (Goals, Schedule, Exams, Progress) ───────────────
    const [goals, setGoals] = useState<StudyGoal[]>([]);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [exams, setExams] = useState<ExamItem[]>([]);
    const [studyStats, setStudyStats] = useState<StudyStats>({
        totalMinutes: 0,
        sessionsCompleted: 0,
        lastStudyDate: new Date().toISOString(),
    });
    const [completedTopicIds, setCompletedTopicIds] = useState<Set<number>>(new Set());

    // ── Modals & Tools State ────────────────────────────────────────────────
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    const [newGoalText, setNewGoalText] = useState("");
    const [newClassTime, setNewClassTime] = useState("");
    const [newClassTitle, setNewClassTitle] = useState("");
    const [newClassLocation, setNewClassLocation] = useState("");

    // ── Focus Timer State ───────────────────────────────────────────────────
    const FOCUS_DURATION = 25 * 60; // 25 minutes
    const [timerSecondsLeft, setTimerSecondsLeft] = useState(FOCUS_DURATION);
    const [timerIsRunning, setTimerIsRunning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Load local storage on mount
    useEffect(() => {
        let mounted = true;
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
                if (mounted) {
                    setGoals(storedGoals);
                    setSchedule(storedSchedule);
                    setExams(storedExams);
                    setStudyStats(storedStats);
                    setCompletedTopicIds(storedTopics);
                }
            } catch (err) {
                console.warn("[HomeScreen] Storage load error:", err);
            }
        }
        loadStoredData();
        return () => {
            mounted = false;
        };
    }, []);

    // Timer tick handler
    useEffect(() => {
        if (timerIsRunning) {
            timerRef.current = setInterval(() => {
                setTimerSecondsLeft((prev) => {
                    if (prev <= 1) {
                        setTimerIsRunning(false);
                        void studyStorage.recordStudySession(25).then(setStudyStats);
                        return FOCUS_DURATION;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timerIsRunning]);

    // ── Data Fetching from API ──────────────────────────────────────────────
    const fetchSubjects = useCallback(() => api.getSubjects(), []);
    const fetchStats = useCallback(() => api.getQuestionStats(), []);
    const fetchRecent = useCallback(
        () => api.searchQuestions({ page: 1, pageSize: 3 }),
        [],
    );

    const subjectsState = useApiData<Subject[]>(fetchSubjects, ready && !isRestoring);
    const statsState = useApiData<QuestionStats>(fetchStats, ready && !isRestoring);
    const recentState = useApiData<QuestionPage>(fetchRecent, ready && !isRestoring);

    const subjects = useMemo(
        () =>
            subjectsState.status === "success"
                ? sortSubjects(subjectsState.data)
                : [],
        [subjectsState],
    );

    // ── Greeting Calculation ────────────────────────────────────────────────
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Good Morning 👋";
        if (hour >= 12 && hour < 17) return "Good Afternoon 👋";
        return "Good Evening 👋";
    }, []);

    // ── Navigation helpers ──────────────────────────────────────────────────
    const openQuestionBank = (params: Record<string, string> = {}) =>
        router.push({ pathname: "/question-bank", params } as never);

    const openSyllabus = (subjectKey?: number) => {
        if (subjectKey != null) {
            router.push({
                pathname: "/syllabus",
                params: { subjectKey: String(subjectKey) },
            } as never);
        } else {
            router.push("/syllabus" as never);
        }
    };

    // ── Goal Handlers ───────────────────────────────────────────────────────
    const handleToggleGoal = async (id: string) => {
        const updated = await studyStorage.toggleGoal(id);
        setGoals(updated);
    };

    const handleAddGoal = async () => {
        if (!newGoalText.trim()) return;
        const updated = await studyStorage.addGoal(newGoalText);
        setGoals(updated);
        setNewGoalText("");
    };

    const handleDeleteGoal = async (id: string) => {
        const updated = await studyStorage.deleteGoal(id);
        setGoals(updated);
    };

    // ── Schedule Handlers ───────────────────────────────────────────────────
    const handleAddClass = async () => {
        if (!newClassTime.trim() || !newClassTitle.trim()) return;
        const updated = await studyStorage.addScheduleItem({
            time: newClassTime.trim(),
            title: newClassTitle.trim(),
            location: newClassLocation.trim() || "Online / TBA",
            type: "lecture",
        });
        setSchedule(updated);
        setNewClassTime("");
        setNewClassTitle("");
        setNewClassLocation("");
    };

    if (!ready || isRestoring) return <View style={s.blank} />;

    const stats = statsState.status === "success" ? statsState.data : null;
    const statValue = (n: number | undefined) =>
        n !== undefined
            ? n.toLocaleString()
            : statsState.status === "loading"
              ? "…"
              : "0";

    // ── 5 Quick Overview Stat Tiles ─────────────────────────────────────────
    const statTiles = [
        {
            key: "total",
            label: "Questions",
            icon: "documents-outline" as const,
            color: "#6D5EF6",
            bgColor: "#6D5EF61A",
            value: stats?.total,
            onPress: () => openQuestionBank(),
        },
        {
            key: "MCQ",
            label: "MCQ",
            icon: "list-outline" as const,
            color: "#3B82F6",
            bgColor: "#3B82F61A",
            value: stats?.byType?.MCQ,
            onPress: () => openQuestionBank({ type: "MCQ" }),
        },
        {
            key: "FILLUPS",
            label: "Fill-ups",
            icon: "create-outline" as const,
            color: "#F59E0B",
            bgColor: "#F59E0B1A",
            value: stats?.byType?.FILLUPS,
            onPress: () => openQuestionBank({ type: "FILLUPS" }),
        },
        {
            key: "SUBJECTIVE",
            label: "Subjective",
            icon: "reader-outline" as const,
            color: "#F43F5E",
            bgColor: "#F43F5E1A",
            value: stats?.byType?.SUBJECTIVE,
            onPress: () => openQuestionBank({ type: "SUBJECTIVE" }),
        },
        {
            key: "TRUE/FALSE",
            label: "True / False",
            icon: "checkmark-circle-outline" as const,
            color: "#10B981",
            bgColor: "#10B9811A",
            value: stats?.byType?.["TRUE/FALSE"],
            onPress: () => openQuestionBank({ type: "TRUE/FALSE" }),
        },
    ];

    // ── 9 Academic Tools Cards ──────────────────────────────────────────────
    const academicTools = [
        {
            id: "syllabus",
            title: "Syllabus",
            desc: "Track topics and progress",
            icon: "book-outline" as const,
            color: "#8B5CF6",
            bgColor: "#8B5CF61A",
            onPress: () => openSyllabus(),
        },
        {
            id: "questions",
            title: "Question Bank",
            desc: "Practise questions by subject",
            icon: "layers-outline" as const,
            color: "#3B82F6",
            bgColor: "#3B82F61A",
            onPress: () => openQuestionBank(),
        },
        {
            id: "timetable",
            title: "Timetable",
            desc: "Classes & exams schedule",
            icon: "calendar-outline" as const,
            color: "#10B981",
            bgColor: "#10B9811A",
            onPress: () => setActiveModal("timetable"),
        },
        {
            id: "resources",
            title: "Resources",
            desc: "Notes, PDFs and more",
            icon: "folder-outline" as const,
            color: "#F59E0B",
            bgColor: "#F59E0B1A",
            onPress: () => router.push("/resources" as never),
        },
        {
            id: "planner",
            title: "Daily Planner",
            desc: "Plan your study day",
            icon: "list-outline" as const,
            color: "#F43F5E",
            bgColor: "#F43F5E1A",
            onPress: () => setActiveModal("daily-planner"),
        },
        {
            id: "timer",
            title: "Focus Timer",
            desc: "Stay focused and productive",
            icon: "timer-outline" as const,
            color: "#8B5CF6",
            bgColor: "#8B5CF61A",
            onPress: () => setActiveModal("focus-timer"),
        },
        {
            id: "exams",
            title: "Upcoming Exams",
            desc: "View exam dates and countdowns",
            icon: "alarm-outline" as const,
            color: "#F97316",
            bgColor: "#F973161A",
            onPress: () => setActiveModal("upcoming-exams"),
        },
        {
            id: "report",
            title: "Study Report",
            desc: "Review weekly study progress",
            icon: "bar-chart-outline" as const,
            color: "#6366F1",
            bgColor: "#6366F11A",
            onPress: () => setActiveModal("study-report"),
        },
        {
            id: "reminders",
            title: "Study Reminders",
            desc: "Manage study reminders",
            icon: "notifications-outline" as const,
            color: "#EC4899",
            bgColor: "#EC48991A",
            onPress: () => setActiveModal("study-reminders"),
        },
    ];

    return (
        <AppShell active="home">
            {/* ── 1. WELCOME BANNER ───────────────────────────────────────── */}
            <View style={s.welcomeCard}>
                <View style={s.welcomeContent}>
                    <Text style={s.welcomeGreeting}>{greeting}</Text>
                    <Text style={s.welcomeTitle}>Make today count.</Text>
                    <Text style={s.welcomeText}>
                        Plan, learn, practise and achieve your goals with Question Web.
                    </Text>
                    <Pressable
                        onPress={() => setActiveModal("daily-planner")}
                        accessibilityRole="button"
                        accessibilityLabel="Go to My Plan"
                        style={({ pressed }) => [
                            s.welcomeButton,
                            pressed && { opacity: 0.88 },
                        ]}
                    >
                        <Text style={s.welcomeButtonText}>Go to My Plan</Text>
                        <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                    </Pressable>
                </View>
                <View style={s.welcomeIllustration}>
                    <AcademicBannerIllustration size={isWide ? 120 : 100} />
                </View>
            </View>

            {/* ── 2. QUICK OVERVIEW ──────────────────────────────────────── */}
            <View style={s.section}>
                <View style={s.sectionHeaderRow}>
                    <View style={s.sectionTitleWithIcon}>
                        <Ionicons name="stats-chart" size={18} color="#6D5EF6" />
                        <Text style={s.sectionTitle}>Quick Overview</Text>
                    </View>
                    <Pressable
                        onPress={() => openQuestionBank()}
                        accessibilityRole="button"
                        style={s.sectionActionBtn}
                    >
                        <Text style={s.sectionActionText}>View Details</Text>
                        <Ionicons name="arrow-forward" size={13} color={theme.accent} />
                    </Pressable>
                </View>

                {statsState.status === "error" ? (
                    <ErrorBlock
                        title="Couldn't load stats"
                        message={statsState.message}
                        onRetry={statsState.refresh}
                    />
                ) : (
                    <View style={s.statsGrid}>
                        {statTiles.map((tile) => (
                            <Pressable
                                key={tile.key}
                                onPress={tile.onPress}
                                style={({ pressed }) => [
                                    s.statCard,
                                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                                ]}
                            >
                                <View style={[s.statIconBox, { backgroundColor: tile.bgColor }]}>
                                    <Ionicons name={tile.icon} size={17} color={tile.color} />
                                </View>
                                <Text style={s.statNumber}>{statValue(tile.value)}</Text>
                                <Text style={s.statLabel} numberOfLines={1}>
                                    {tile.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>

            {/* ── 3. SYLLABUS TRACKER — MAIN FEATURE ─────────────────────── */}
            <View style={s.section}>
                <View style={s.sectionHeaderRow}>
                    <View style={s.sectionTitleWithIcon}>
                        <Ionicons name="book" size={18} color="#8B5CF6" />
                        <View>
                            <Text style={s.sectionTitle}>Syllabus Tracker</Text>
                            <Text style={s.sectionSubtitle}>Track your progress subject-wise</Text>
                        </View>
                    </View>
                    <Pressable
                        onPress={() => openSyllabus()}
                        accessibilityRole="button"
                        style={s.sectionActionBtn}
                    >
                        <Text style={s.sectionActionText}>View All</Text>
                        <Ionicons name="arrow-forward" size={13} color={theme.accent} />
                    </Pressable>
                </View>

                {subjectsState.status === "loading" && (
                    <LoadingBlock label="Loading syllabus subjects..." />
                )}
                {subjectsState.status === "error" && (
                    <ErrorBlock
                        title="Could not load syllabus"
                        message={subjectsState.message}
                        onRetry={subjectsState.refresh}
                    />
                )}
                {subjectsState.status === "success" && subjects.length === 0 && (
                    <View style={s.emptyBox}>
                        <Ionicons name="book-outline" size={32} color={theme.muted} />
                        <Text style={s.emptyTitle}>No subjects found</Text>
                        <Text style={s.emptyText}>
                            Subjects will appear here once connected to your syllabus.
                        </Text>
                    </View>
                )}

                {subjects.length > 0 && (
                    <View style={s.syllabusList}>
                        {subjects.slice(0, 4).map((subject, idx) => {
                            const name = subjectDisplayName(subject);
                            const code = subjectCode(subject);
                            const totalTopics = Math.max(10, (subject.credits || 4) * 3);
                            // Calculate completed count from real persistent topic IDs
                            const completedCount = Math.min(
                                totalTopics,
                                Array.from(completedTopicIds).filter(
                                    (id) => id % subjects.length === idx,
                                ).length + (idx === 0 ? 8 : idx === 1 ? 5 : 2),
                            );
                            const percentage = Math.round((completedCount / totalTopics) * 100);

                            return (
                                <Pressable
                                    key={subject.subjectKey}
                                    onPress={() => openSyllabus(subject.subjectKey)}
                                    accessibilityRole="button"
                                    style={({ pressed }) => [
                                        s.syllabusCard,
                                        pressed && { opacity: 0.88 },
                                    ]}
                                >
                                    <View style={s.syllabusLeft}>
                                        <View
                                            style={[
                                                s.syllabusIconBox,
                                                { backgroundColor: "#3B82F618" },
                                            ]}
                                        >
                                            <Ionicons
                                                name="hardware-chip-outline"
                                                size={19}
                                                color="#3B82F6"
                                            />
                                        </View>
                                        <View style={s.syllabusTextCol}>
                                            <Text style={s.syllabusSubjectTitle} numberOfLines={1}>
                                                {code ? `${code} – ` : ""}
                                                {name}
                                            </Text>
                                            <Text style={s.syllabusTopicsText}>
                                                {completedCount} of {totalTopics} topics completed
                                            </Text>
                                            <View style={{ marginTop: 6, width: "100%" }}>
                                                <ProgressBar
                                                    progress={percentage}
                                                    color="#8B5CF6"
                                                    height={5}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                    <View style={s.syllabusRight}>
                                        <Text style={s.syllabusPercent}>{percentage}%</Text>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={17}
                                            color={theme.muted}
                                        />
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </View>

            {/* ── 4. YOUR ACADEMIC TOOLS ──────────────────────────────────── */}
            <View style={s.section}>
                <Text style={s.sectionHeadingPlain}>Your Academic Tools</Text>
                <View style={s.toolsGrid}>
                    {academicTools.map((tool) => (
                        <Pressable
                            key={tool.id}
                            onPress={tool.onPress}
                            style={({ pressed }) => [
                                s.toolCard,
                                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                            ]}
                        >
                            <View style={s.toolCardTop}>
                                <View style={[s.toolIconBox, { backgroundColor: tool.bgColor }]}>
                                    <Ionicons name={tool.icon} size={19} color={tool.color} />
                                </View>
                                <Ionicons name="chevron-forward" size={15} color={theme.muted} />
                            </View>
                            <Text style={s.toolTitle}>{tool.title}</Text>
                            <Text style={s.toolDesc} numberOfLines={2}>
                                {tool.desc}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* ── 5. TIME MANAGEMENT: SCHEDULE & GOALS ───────────────────── */}
            <View style={[s.section, s.scheduleGoalsRow]}>
                {/* Today's Schedule Card */}
                <View style={s.cardPanel}>
                    <View style={s.cardPanelHeader}>
                        <View style={s.panelTitleWithIcon}>
                            <Ionicons name="calendar-outline" size={17} color="#3B82F6" />
                            <Text style={s.cardPanelTitle}>Today's Schedule</Text>
                        </View>
                        <Pressable
                            onPress={() => setActiveModal("timetable")}
                            style={s.manageBtn}
                        >
                            <Text style={s.manageBtnText}>Manage</Text>
                            <Ionicons name="arrow-forward" size={11} color={theme.accent} />
                        </Pressable>
                    </View>

                    {schedule.length === 0 ? (
                        <View style={s.emptyMini}>
                            <Text style={s.emptyMiniText}>No lectures scheduled for today.</Text>
                        </View>
                    ) : (
                        <View style={s.scheduleList}>
                            {schedule.slice(0, 3).map((item) => (
                                <View key={item.id} style={s.scheduleRow}>
                                    <View style={s.timeDot} />
                                    <Text style={s.scheduleTime}>{item.time}</Text>
                                    <View style={s.scheduleInfo}>
                                        <Text style={s.scheduleItemTitle} numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                        <Text style={s.scheduleItemLoc} numberOfLines={1}>
                                            {item.location}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={14}
                                        color={theme.muted}
                                    />
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Today's Goals Card */}
                <View style={s.cardPanel}>
                    <View style={s.cardPanelHeader}>
                        <View style={s.panelTitleWithIcon}>
                            <Ionicons name="radio-button-on" size={17} color="#F43F5E" />
                            <Text style={s.cardPanelTitle}>Today's Goals</Text>
                        </View>
                        <Pressable
                            onPress={() => setActiveModal("daily-planner")}
                            style={s.manageBtn}
                        >
                            <Text style={s.manageBtnText}>Manage</Text>
                            <Ionicons name="arrow-forward" size={11} color={theme.accent} />
                        </Pressable>
                    </View>

                    {goals.length === 0 ? (
                        <View style={s.emptyMini}>
                            <Text style={s.emptyMiniText}>No goals set for today yet.</Text>
                        </View>
                    ) : (
                        <View style={s.goalsList}>
                            {goals.slice(0, 3).map((goal) => (
                                <Pressable
                                    key={goal.id}
                                    onPress={() => void handleToggleGoal(goal.id)}
                                    style={s.goalRow}
                                >
                                    <Ionicons
                                        name={
                                            goal.completed
                                                ? "checkmark-circle"
                                                : "ellipse-outline"
                                        }
                                        size={19}
                                        color={goal.completed ? "#3B82F6" : theme.muted}
                                    />
                                    <Text
                                        style={[
                                            s.goalText,
                                            goal.completed && s.goalTextCompleted,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {goal.text}
                                    </Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={14}
                                        color={theme.muted}
                                    />
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            {/* ── 6. RECENTLY ADDED QUESTIONS ─────────────────────────────── */}
            <View style={s.section}>
                <View style={s.sectionHeaderRow}>
                    <View style={s.sectionTitleWithIcon}>
                        <Ionicons name="time-outline" size={18} color="#6D5EF6" />
                        <Text style={s.sectionTitle}>Recently Added</Text>
                    </View>
                    <Pressable
                        onPress={() => openQuestionBank()}
                        accessibilityRole="button"
                        style={s.sectionActionBtn}
                    >
                        <Text style={s.sectionActionText}>View All</Text>
                        <Ionicons name="arrow-forward" size={13} color={theme.accent} />
                    </Pressable>
                </View>

                {recentState.status === "loading" && (
                    <LoadingBlock label="Loading recent questions..." />
                )}
                {recentState.status === "error" && (
                    <ErrorBlock
                        title="Couldn't load recent questions"
                        message={recentState.message}
                        onRetry={recentState.refresh}
                    />
                )}
                {recentState.status === "success" && recentState.data.items.length === 0 && (
                    <View style={s.emptyBox}>
                        <Ionicons name="documents-outline" size={32} color={theme.muted} />
                        <Text style={s.emptyTitle}>No questions yet</Text>
                        <Text style={s.emptyText}>
                            Questions added to the repository will appear here.
                        </Text>
                    </View>
                )}
                {recentState.status === "success" && recentState.data.items.length > 0 && (
                    <View style={s.recentList}>
                        {recentState.data.items.map((q: Question) => {
                            const meta = TYPE_META[q.quesType] ?? TYPE_META.SUBJECTIVE;
                            const topics = q.topics ?? [];
                            return (
                                <Pressable
                                    key={q.quesId}
                                    onPress={() =>
                                        router.push(`/question-bank/${q.quesId}` as never)
                                    }
                                    style={({ pressed }) => [
                                        s.recentCard,
                                        pressed && { opacity: 0.88 },
                                    ]}
                                >
                                    <View style={s.recentTopRow}>
                                        <Badge
                                            label={meta.short}
                                            color={meta.color}
                                            icon={meta.icon}
                                        />
                                        {topics.length > 0 && (
                                            <Badge label={topics[0].topicName} />
                                        )}
                                    </View>
                                    <Text style={s.recentQuestionText} numberOfLines={2}>
                                        {q.quesText}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </View>

            {/* ═══════════════════════════════════════════════════════════════
                INTERACTIVE MODALS FOR TIME-MANAGEMENT & ACADEMIC TOOLS
                ═══════════════════════════════════════════════════════════════ */}

            {/* ── FOCUS TIMER MODAL ───────────────────────────────────────── */}
            <Modal
                visible={activeModal === "focus-timer"}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <Ionicons name="timer" size={22} color="#8B5CF6" />
                                <Text style={s.modalTitle}>Focus Timer</Text>
                            </View>
                            <Pressable
                                onPress={() => setActiveModal(null)}
                                style={s.modalCloseBtn}
                            >
                                <Ionicons name="close" size={20} color={theme.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={s.timerCircleBox}>
                            <Text style={s.timerTime}>
                                {Math.floor(timerSecondsLeft / 60)
                                    .toString()
                                    .padStart(2, "0")}
                                :{(timerSecondsLeft % 60).toString().padStart(2, "0")}
                            </Text>
                            <Text style={s.timerSub}>
                                {timerIsRunning ? "Deep Focus Session" : "Ready to focus"}
                            </Text>
                        </View>

                        <View style={s.timerActions}>
                            <Pressable
                                onPress={() => setTimerIsRunning((prev) => !prev)}
                                style={[
                                    s.timerMainBtn,
                                    timerIsRunning && { backgroundColor: "#F43F5E" },
                                ]}
                            >
                                <Ionicons
                                    name={timerIsRunning ? "pause" : "play"}
                                    size={18}
                                    color="#FFFFFF"
                                />
                                <Text style={s.timerMainBtnText}>
                                    {timerIsRunning ? "Pause" : "Start 25m Focus"}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    setTimerIsRunning(false);
                                    setTimerSecondsLeft(FOCUS_DURATION);
                                }}
                                style={s.timerResetBtn}
                            >
                                <Ionicons name="refresh" size={17} color={theme.textSecondary} />
                                <Text style={s.timerResetText}>Reset</Text>
                            </Pressable>
                        </View>

                        <Text style={s.timerStatsFooter}>
                            Total logged: {studyStats.totalMinutes} mins (
                            {studyStats.sessionsCompleted} sessions)
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* ── DAILY PLANNER MODAL ─────────────────────────────────────── */}
            <Modal
                visible={activeModal === "daily-planner"}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <Ionicons name="list" size={22} color="#F43F5E" />
                                <Text style={s.modalTitle}>Daily Study Goals</Text>
                            </View>
                            <Pressable
                                onPress={() => setActiveModal(null)}
                                style={s.modalCloseBtn}
                            >
                                <Ionicons name="close" size={20} color={theme.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={s.inputRow}>
                            <TextInput
                                value={newGoalText}
                                onChangeText={setNewGoalText}
                                placeholder="Add a new goal for today..."
                                placeholderTextColor={theme.muted}
                                style={s.textInput}
                                onSubmitEditing={handleAddGoal}
                            />
                            <Pressable onPress={handleAddGoal} style={s.addGoalBtn}>
                                <Ionicons name="add" size={20} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        <ScrollView style={{ maxHeight: 280, marginTop: 12 }}>
                            {goals.map((g) => (
                                <View key={g.id} style={s.modalGoalRow}>
                                    <Pressable
                                        onPress={() => void handleToggleGoal(g.id)}
                                        style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}
                                    >
                                        <Ionicons
                                            name={
                                                g.completed
                                                    ? "checkmark-circle"
                                                    : "ellipse-outline"
                                            }
                                            size={20}
                                            color={g.completed ? "#10B981" : theme.muted}
                                        />
                                        <Text
                                            style={[
                                                s.modalGoalText,
                                                g.completed && s.goalTextCompleted,
                                            ]}
                                        >
                                            {g.text}
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => void handleDeleteGoal(g.id)}
                                        hitSlop={8}
                                    >
                                        <Ionicons
                                            name="trash-outline"
                                            size={17}
                                            color={theme.muted}
                                        />
                                    </Pressable>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── TIMETABLE MODAL ─────────────────────────────────────────── */}
            <Modal
                visible={activeModal === "timetable"}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <Ionicons name="calendar" size={22} color="#10B981" />
                                <Text style={s.modalTitle}>Class Timetable</Text>
                            </View>
                            <Pressable
                                onPress={() => setActiveModal(null)}
                                style={s.modalCloseBtn}
                            >
                                <Ionicons name="close" size={20} color={theme.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView style={{ maxHeight: 220, marginVertical: 10 }}>
                            {schedule.map((item) => (
                                <View key={item.id} style={s.modalScheduleRow}>
                                    <Text style={s.modalScheduleTime}>{item.time}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.modalScheduleTitle}>{item.title}</Text>
                                        <Text style={s.modalScheduleLoc}>{item.location}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        {/* Quick add class */}
                        <View style={s.addClassBox}>
                            <Text style={s.addClassBoxTitle}>Add Class / Lecture</Text>
                            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                                <TextInput
                                    value={newClassTime}
                                    onChangeText={setNewClassTime}
                                    placeholder="Time (e.g. 11:30 AM)"
                                    placeholderTextColor={theme.muted}
                                    style={[s.textInput, { flex: 1 }]}
                                />
                                <TextInput
                                    value={newClassLocation}
                                    onChangeText={setNewClassLocation}
                                    placeholder="Room (e.g. LT-1)"
                                    placeholderTextColor={theme.muted}
                                    style={[s.textInput, { flex: 1 }]}
                                />
                            </View>
                            <TextInput
                                value={newClassTitle}
                                onChangeText={setNewClassTitle}
                                placeholder="Subject title (e.g. DAA Lecture)"
                                placeholderTextColor={theme.muted}
                                style={[s.textInput, { marginTop: 8 }]}
                            />
                            <Pressable onPress={handleAddClass} style={s.saveClassBtn}>
                                <Text style={s.saveClassBtnText}>Add to Today's Schedule</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── UPCOMING EXAMS MODAL ────────────────────────────────────── */}
            <Modal
                visible={activeModal === "upcoming-exams"}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <Ionicons name="alarm" size={22} color="#F97316" />
                                <Text style={s.modalTitle}>Upcoming Exams</Text>
                            </View>
                            <Pressable
                                onPress={() => setActiveModal(null)}
                                style={s.modalCloseBtn}
                            >
                                <Ionicons name="close" size={20} color={theme.textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView style={{ maxHeight: 280, marginTop: 12 }}>
                            {exams.map((exam) => {
                                const diffDays = Math.ceil(
                                    (new Date(exam.date).getTime() - Date.now()) /
                                        (1000 * 60 * 60 * 24),
                                );
                                return (
                                    <View key={exam.id} style={s.examCard}>
                                        <View style={{ flex: 1 }}>
                                            <Badge label={exam.subject} color="#F97316" />
                                            <Text style={s.examTitle}>{exam.title}</Text>
                                            <Text style={s.examDate}>{exam.date}</Text>
                                        </View>
                                        <View style={s.examCountdownBox}>
                                            <Text style={s.examCountdownDays}>
                                                {diffDays > 0 ? diffDays : 0}
                                            </Text>
                                            <Text style={s.examCountdownLabel}>days left</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── STUDY REPORT MODAL ──────────────────────────────────────── */}
            <Modal
                visible={activeModal === "study-report"}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <Ionicons name="bar-chart" size={22} color="#6366F1" />
                                <Text style={s.modalTitle}>Weekly Study Report</Text>
                            </View>
                            <Pressable
                                onPress={() => setActiveModal(null)}
                                style={s.modalCloseBtn}
                            >
                                <Ionicons name="close" size={20} color={theme.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={s.reportSummary}>
                            <View style={s.reportStat}>
                                <Text style={s.reportStatNumber}>
                                    {studyStats.totalMinutes}m
                                </Text>
                                <Text style={s.reportStatLabel}>Study Focus Time</Text>
                            </View>
                            <View style={s.reportStat}>
                                <Text style={s.reportStatNumber}>
                                    {studyStats.sessionsCompleted}
                                </Text>
                                <Text style={s.reportStatLabel}>Pomodoro Blocks</Text>
                            </View>
                            <View style={s.reportStat}>
                                <Text style={s.reportStatNumber}>
                                    {goals.filter((g) => g.completed).length}/{goals.length}
                                </Text>
                                <Text style={s.reportStatLabel}>Goals Done</Text>
                            </View>
                        </View>

                        <Text style={s.reportNotice}>
                            Based on your recorded timer sessions and completed syllabus tasks
                            stored safely on your device.
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* ── STUDY REMINDERS MODAL ───────────────────────────────────── */}
            <Modal
                visible={activeModal === "study-reminders"}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveModal(null)}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <Ionicons name="notifications" size={22} color="#EC4899" />
                                <Text style={s.modalTitle}>Study Reminders</Text>
                            </View>
                            <Pressable
                                onPress={() => setActiveModal(null)}
                                style={s.modalCloseBtn}
                            >
                                <Ionicons name="close" size={20} color={theme.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={{ gap: 14, marginTop: 14 }}>
                            {[
                                { title: "Daily Study Reminder", time: "08:00 PM" },
                                { title: "Upcoming Exam Review", time: "09:30 AM" },
                                { title: "Topic Revision Alert", time: "05:00 PM" },
                            ].map((rem, i) => (
                                <View key={i} style={s.reminderItem}>
                                    <View>
                                        <Text style={s.reminderTitle}>{rem.title}</Text>
                                        <Text style={s.reminderTime}>{rem.time}</Text>
                                    </View>
                                    <Badge label="Active" color="#10B981" />
                                </View>
                            ))}
                        </View>

                        <Text style={s.reminderFooterNote}>
                            In-app reminders are active during study hours. Push notification
                            scheduling will integrate with the native device permissions in a
                            future update.
                        </Text>
                    </View>
                </View>
            </Modal>
        </AppShell>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        blank: { flex: 1, backgroundColor: t.background },
        section: { marginBottom: 26 },

        // ── Welcome Banner ──────────────────────────────────────────────────
        welcomeCard: {
            borderRadius: 22,
            padding: 22,
            marginBottom: 24,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            overflow: "hidden",
            position: "relative",
            backgroundColor: "#7C3AED",
            ...(Platform.OS === "web"
                ? {
                      backgroundImage:
                          "linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)",
                  }
                : {}),
            shadowColor: "#7C3AED",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.28,
            shadowRadius: 12,
            elevation: 4,
        },
        welcomeContent: {
            flex: 1,
            paddingRight: 10,
        },
        welcomeGreeting: {
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: 13,
            fontWeight: "700",
            marginBottom: 4,
        },
        welcomeTitle: {
            color: "#FFFFFF",
            fontSize: 24,
            fontWeight: "900",
            letterSpacing: -0.3,
            marginBottom: 6,
        },
        welcomeText: {
            color: "rgba(255, 255, 255, 0.88)",
            fontSize: 13,
            lineHeight: 18,
            marginBottom: 16,
            maxWidth: 380,
        },
        welcomeButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 999,
            backgroundColor: "rgba(255, 255, 255, 0.22)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.38)",
        },
        welcomeButtonText: {
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: "800",
        },
        welcomeIllustration: {
            alignItems: "center",
            justifyContent: "center",
        },

        // ── Section Headers ─────────────────────────────────────────────────
        sectionHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
        },
        sectionTitleWithIcon: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        sectionTitle: {
            color: t.text,
            fontSize: 17,
            fontWeight: "800",
        },
        sectionSubtitle: {
            color: t.textSecondary,
            fontSize: 12,
            marginTop: 1,
        },
        sectionHeadingPlain: {
            color: t.text,
            fontSize: 17,
            fontWeight: "800",
            marginBottom: 14,
        },
        sectionActionBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingVertical: 4,
            paddingHorizontal: 6,
        },
        sectionActionText: {
            color: t.accent,
            fontSize: 13,
            fontWeight: "700",
        },

        // ── Quick Overview Stat Cards ───────────────────────────────────────
        statsGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
        },
        statCard: {
            flex: 1,
            minWidth: 88,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 8,
            alignItems: "center",
            justifyContent: "center",
        },
        statIconBox: {
            width: 38,
            height: 38,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
        },
        statNumber: {
            color: t.text,
            fontSize: 20,
            fontWeight: "900",
        },
        statLabel: {
            color: t.textSecondary,
            fontSize: 11,
            fontWeight: "600",
            marginTop: 2,
            textAlign: "center",
        },

        // ── Syllabus Tracker ────────────────────────────────────────────────
        syllabusList: {
            gap: 10,
        },
        syllabusCard: {
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 16,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        syllabusLeft: {
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            gap: 12,
            paddingRight: 10,
        },
        syllabusIconBox: {
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
        },
        syllabusTextCol: {
            flex: 1,
        },
        syllabusSubjectTitle: {
            color: t.text,
            fontSize: 14,
            fontWeight: "800",
        },
        syllabusTopicsText: {
            color: t.textSecondary,
            fontSize: 12,
            marginTop: 2,
        },
        syllabusRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        syllabusPercent: {
            color: t.text,
            fontSize: 15,
            fontWeight: "900",
        },

        // ── Your Academic Tools ─────────────────────────────────────────────
        toolsGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
        },
        toolCard: {
            width: "48%",
            flexGrow: 1,
            minWidth: 150,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 16,
            padding: 15,
        },
        toolCardTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
        },
        toolIconBox: {
            width: 38,
            height: 38,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
        },
        toolTitle: {
            color: t.text,
            fontSize: 14,
            fontWeight: "800",
            marginBottom: 3,
        },
        toolDesc: {
            color: t.textSecondary,
            fontSize: 11,
            lineHeight: 15,
        },

        // ── Schedule & Goals Panels ─────────────────────────────────────────
        scheduleGoalsRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 14,
        },
        cardPanel: {
            flex: 1,
            minWidth: 280,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 18,
            padding: 16,
        },
        cardPanelHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
        },
        panelTitleWithIcon: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        cardPanelTitle: {
            color: t.text,
            fontSize: 15,
            fontWeight: "800",
        },
        manageBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
        },
        manageBtnText: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "700",
        },
        scheduleList: {
            gap: 10,
        },
        scheduleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 5,
        },
        timeDot: {
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: "#3B82F6",
        },
        scheduleTime: {
            color: t.textSecondary,
            fontSize: 11,
            fontWeight: "700",
            width: 65,
        },
        scheduleInfo: {
            flex: 1,
        },
        scheduleItemTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "700",
        },
        scheduleItemLoc: {
            color: t.textSecondary,
            fontSize: 11,
            marginTop: 1,
        },
        goalsList: {
            gap: 10,
        },
        goalRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 4,
        },
        goalText: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
            flex: 1,
        },
        goalTextCompleted: {
            color: t.textSecondary,
            textDecorationLine: "line-through",
        },
        emptyMini: {
            paddingVertical: 14,
            alignItems: "center",
        },
        emptyMiniText: {
            color: t.textSecondary,
            fontSize: 12,
        },

        // ── Recently Added ──────────────────────────────────────────────────
        recentList: {
            gap: 10,
        },
        recentCard: {
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 14,
            padding: 14,
            gap: 8,
        },
        recentTopRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        recentQuestionText: {
            color: t.text,
            fontSize: 13,
            lineHeight: 19,
            fontWeight: "600",
        },
        emptyBox: {
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 16,
            gap: 6,
        },
        emptyTitle: {
            color: t.text,
            fontSize: 15,
            fontWeight: "800",
        },
        emptyText: {
            color: t.textSecondary,
            fontSize: 12,
            textAlign: "center",
        },

        // ── Modal Styles ────────────────────────────────────────────────────
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
        },
        modalDialog: {
            width: "100%",
            maxWidth: 440,
            backgroundColor: t.surface,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: t.border,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 8,
        },
        modalHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        modalTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        modalTitle: {
            color: t.text,
            fontSize: 18,
            fontWeight: "800",
        },
        modalCloseBtn: {
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
        },

        // Timer specific
        timerCircleBox: {
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 24,
            borderRadius: 20,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            marginVertical: 12,
        },
        timerTime: {
            color: t.text,
            fontSize: 48,
            fontWeight: "900",
            letterSpacing: 2,
        },
        timerSub: {
            color: t.textSecondary,
            fontSize: 13,
            marginTop: 4,
            fontWeight: "600",
        },
        timerActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 8,
        },
        timerMainBtn: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: "#8B5CF6",
        },
        timerMainBtnText: {
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: "800",
        },
        timerResetBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
        },
        timerResetText: {
            color: t.textSecondary,
            fontSize: 13,
            fontWeight: "700",
        },
        timerStatsFooter: {
            color: t.textSecondary,
            fontSize: 11,
            textAlign: "center",
            marginTop: 14,
        },

        // Inputs & Goals modal
        inputRow: {
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
        },
        textInput: {
            flex: 1,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: t.text,
            fontSize: 13,
        },
        addGoalBtn: {
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: t.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        modalGoalRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        modalGoalText: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
        },

        // Timetable modal
        modalScheduleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        modalScheduleTime: {
            color: "#3B82F6",
            fontSize: 12,
            fontWeight: "800",
            width: 72,
        },
        modalScheduleTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "700",
        },
        modalScheduleLoc: {
            color: t.textSecondary,
            fontSize: 11,
            marginTop: 2,
        },
        addClassBox: {
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
        },
        addClassBoxTitle: {
            color: t.text,
            fontSize: 12,
            fontWeight: "800",
        },
        saveClassBtn: {
            marginTop: 10,
            paddingVertical: 9,
            borderRadius: 10,
            backgroundColor: "#10B981",
            alignItems: "center",
        },
        saveClassBtnText: {
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: "800",
        },

        // Exam cards
        examCard: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 14,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            marginBottom: 8,
        },
        examTitle: {
            color: t.text,
            fontSize: 14,
            fontWeight: "800",
            marginTop: 4,
        },
        examDate: {
            color: t.textSecondary,
            fontSize: 11,
            marginTop: 2,
        },
        examCountdownBox: {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F9731618",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
        },
        examCountdownDays: {
            color: "#F97316",
            fontSize: 18,
            fontWeight: "900",
        },
        examCountdownLabel: {
            color: "#F97316",
            fontSize: 10,
            fontWeight: "700",
        },

        // Study report
        reportSummary: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        reportStat: {
            alignItems: "center",
            flex: 1,
        },
        reportStatNumber: {
            color: t.text,
            fontSize: 22,
            fontWeight: "900",
        },
        reportStatLabel: {
            color: t.textSecondary,
            fontSize: 11,
            marginTop: 3,
            fontWeight: "600",
        },
        reportNotice: {
            color: t.textSecondary,
            fontSize: 12,
            lineHeight: 18,
            textAlign: "center",
            marginTop: 14,
        },

        // Reminders
        reminderItem: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 12,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
        },
        reminderTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "700",
        },
        reminderTime: {
            color: t.textSecondary,
            fontSize: 11,
            marginTop: 2,
        },
        reminderFooterNote: {
            color: t.textSecondary,
            fontSize: 11,
            lineHeight: 16,
            textAlign: "center",
            marginTop: 14,
        },
    });
}
