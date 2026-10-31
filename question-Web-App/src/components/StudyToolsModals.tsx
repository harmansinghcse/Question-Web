import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Badge, EmptyBlock, ErrorBlock, LoadingBlock } from "./ui";
import { useAppTheme } from "../providers/ThemeProvider";
import {
    studyStorage,
    type StudyGoal,
    type StudyReminder,
    type StudyStats,
} from "../services/study-storage";
import type { MyTimetable, UpcomingExam } from "../services/api";
import type { ApiSlice } from "../hooks/use-student-schedule";
import type { AppTheme } from "../constants/theme";

export type ActiveToolModal =
    | null
    | "focus-timer"
    | "daily-planner"
    | "timetable"
    | "upcoming-exams"
    | "study-report"
    | "study-reminders";

interface StudyToolsModalsProps {
    activeModal: ActiveToolModal;
    onClose: () => void;
    goals: StudyGoal[];
    timetable: ApiSlice<MyTimetable>;
    exams: ApiSlice<UpcomingExam[]>;
    onSelectDivision: (division: string | null) => void;
    studyStats: StudyStats;
    onGoalsChange: (goals: StudyGoal[]) => void;
    onStudyStatsChange: (stats: StudyStats) => void;
}

const FOCUS_DURATION = 25 * 60; // 25 minutes
const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export default function StudyToolsModals({
    activeModal,
    onClose,
    goals,
    timetable,
    exams,
    onSelectDivision,
    studyStats,
    onGoalsChange,
    onStudyStatsChange,
}: StudyToolsModalsProps) {
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    // === Focus Timer ===
    const [timerSecondsLeft, setTimerSecondsLeft] = useState(FOCUS_DURATION);
    const [timerIsRunning, setTimerIsRunning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // === Goal Inputs ===
    const [newGoalText, setNewGoalText] = useState("");
    const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

    // === Reminders State ===
    const [reminders, setReminders] = useState<StudyReminder[]>([]);
    const [newReminderTitle, setNewReminderTitle] = useState("");
    const [newReminderTime, setNewReminderTime] = useState("08:00 PM");

    useEffect(() => {
        let isMounted = true;
        if (activeModal === "study-reminders") {
            void studyStorage.getReminders().then((data) => {
                if (isMounted) setReminders(data);
            });
        }
        return () => {
            isMounted = false;
        };
    }, [activeModal]);

    useEffect(() => {
        if (activeModal !== "upcoming-exams") return;
        const intervalId = setInterval(() => {
            setCurrentTimestamp(Date.now());
        }, 15000);
        return () => clearInterval(intervalId);
    }, [activeModal]);

    useEffect(() => {
        if (timerIsRunning) {
            timerRef.current = setInterval(() => {
                setTimerSecondsLeft((prev) => {
                    if (prev <= 1) {
                        setTimerIsRunning(false);
                        void studyStorage
                            .recordStudySession(25)
                            .then(onStudyStatsChange);
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
    }, [timerIsRunning, onStudyStatsChange]);

    const router = useRouter();
    const goToLogin = () => {
        onClose();
        router.push("/login" as never);
    };
    const timetableData = timetable.data;
    const timetableEntries = timetableData?.timetable?.entries ?? [];
    const examList = exams.data ?? [];

    const handleToggleGoal = async (id: string) => {
        const updated = await studyStorage.toggleGoal(id);
        onGoalsChange(updated);
    };

    const handleAddGoal = async () => {
        if (!newGoalText.trim()) return;
        const updated = await studyStorage.addGoal(newGoalText);
        onGoalsChange(updated);
        setNewGoalText("");
    };

    const handleDeleteGoal = async (id: string) => {
        const updated = await studyStorage.deleteGoal(id);
        onGoalsChange(updated);
    };

    // Reminder Handlers
    const handleAddReminder = async () => {
        if (!newReminderTitle.trim()) return;
        const updated = await studyStorage.addReminder(
            newReminderTitle,
            newReminderTime,
        );
        setReminders(updated);
        setNewReminderTitle("");
    };

    const handleToggleReminder = async (id: string) => {
        const updated = await studyStorage.toggleReminder(id);
        setReminders(updated);
    };

    const handleDeleteReminder = async (id: string) => {
        const updated = await studyStorage.deleteReminder(id);
        setReminders(updated);
    };

    const completedGoalsCount = goals.filter((g) => g.completed).length;

    return (
        <>
            {/* === FOCUS TIMER MODAL === */}
            <Modal
                visible={activeModal === "focus-timer"}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <View style={s.modalIconWrap}>
                                    <Ionicons
                                        name="timer-outline"
                                        size={18}
                                        color={theme.accent}
                                    />
                                </View>
                                <View>
                                    <Text style={s.modalTitle}>Focus Timer</Text>
                                    <Text style={s.modalSubtitle}>
                                        25-minute Pomodoro study block
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Close focus timer modal"
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.muted}
                                />
                            </Pressable>
                        </View>

                        <View style={s.timerCircleBox}>
                            <View style={s.timerProgressOuter}>
                                <Text style={s.timerTime}>
                                    {Math.floor(timerSecondsLeft / 60)
                                        .toString()
                                        .padStart(2, "0")}
                                    :
                                    {(timerSecondsLeft % 60)
                                        .toString()
                                        .padStart(2, "0")}
                                </Text>
                                <View style={s.timerStatusPill}>
                                    <View
                                        style={[
                                            s.timerPulseDot,
                                            timerIsRunning && s.timerPulseDotActive,
                                        ]}
                                    />
                                    <Text style={s.timerSub}>
                                        {timerIsRunning
                                            ? "Deep Focus Session"
                                            : "Ready to focus"}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={s.timerActions}>
                            <Pressable
                                onPress={() =>
                                    setTimerIsRunning((prev) => !prev)
                                }
                                style={[
                                    s.timerMainBtn,
                                    timerIsRunning && s.timerMainBtnActive,
                                ]}
                            >
                                <Ionicons
                                    name={timerIsRunning ? "pause" : "play"}
                                    size={18}
                                    color="#FFFFFF"
                                />
                                <Text style={s.timerMainBtnText}>
                                    {timerIsRunning
                                        ? "Pause Session"
                                        : "Start 25m Focus"}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    setTimerIsRunning(false);
                                    setTimerSecondsLeft(FOCUS_DURATION);
                                }}
                                style={s.timerResetBtn}
                            >
                                <Ionicons
                                    name="refresh"
                                    size={16}
                                    color={theme.text}
                                />
                                <Text style={s.timerResetText}>Reset</Text>
                            </Pressable>
                        </View>

                        <View style={s.timerStatsFooterBox}>
                            <View style={s.timerStatColumn}>
                                <Text style={s.timerStatVal}>
                                    {studyStats.totalMinutes}m
                                </Text>
                                <Text style={s.timerStatLbl}>Total Logged</Text>
                            </View>
                            <View style={s.timerStatDivider} />
                            <View style={s.timerStatColumn}>
                                <Text style={s.timerStatVal}>
                                    {studyStats.sessionsCompleted}
                                </Text>
                                <Text style={s.timerStatLbl}>Sessions Done</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* === DAILY PLANNER MODAL === */}
            <Modal
                visible={activeModal === "daily-planner"}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <View style={s.modalIconWrap}>
                                    <Ionicons
                                        name="checkbox-outline"
                                        size={18}
                                        color={theme.accent}
                                    />
                                </View>
                                <View>
                                    <Text style={s.modalTitle}>Daily Goals</Text>
                                    <Text style={s.modalSubtitle}>
                                        {completedGoalsCount} of {goals.length} tasks completed today
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Close daily goals modal"
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.muted}
                                />
                            </Pressable>
                        </View>

                        <View style={s.inputRow}>
                            <TextInput
                                value={newGoalText}
                                onChangeText={setNewGoalText}
                                placeholder="Add a study goal (e.g. Revise OS paging)..."
                                placeholderTextColor={theme.muted}
                                style={s.textInput}
                                onSubmitEditing={handleAddGoal}
                                returnKeyType="done"
                            />
                            <Pressable
                                onPress={handleAddGoal}
                                style={({ pressed }) => [
                                    s.addGoalBtn,
                                    pressed && { opacity: 0.8 },
                                ]}
                            >
                                <Ionicons
                                    name="add"
                                    size={20}
                                    color="#FFFFFF"
                                />
                            </Pressable>
                        </View>

                        <ScrollView
                            style={s.modalListScroll}
                            showsVerticalScrollIndicator={false}
                        >
                            {goals.length === 0 ? (
                                <View style={s.modalEmptyState}>
                                    <Ionicons
                                        name="checkmark-circle-outline"
                                        size={36}
                                        color={theme.muted}
                                    />
                                    <Text style={s.modalEmptyTitle}>No study goals set</Text>
                                    <Text style={s.modalEmptyText}>
                                        Write down key topics or exercises above to track your daily output.
                                    </Text>
                                </View>
                            ) : (
                                goals.map((g) => (
                                    <View key={g.id} style={s.modalGoalRow}>
                                        <Pressable
                                            onPress={() =>
                                                void handleToggleGoal(g.id)
                                            }
                                            style={s.goalPressable}
                                        >
                                            <View
                                                style={[
                                                    s.checkbox,
                                                    g.completed && s.checkboxChecked,
                                                ]}
                                            >
                                                {g.completed && (
                                                    <Ionicons
                                                        name="checkmark"
                                                        size={14}
                                                        color="#FFFFFF"
                                                    />
                                                )}
                                            </View>
                                            <Text
                                                style={[
                                                    s.modalGoalText,
                                                    g.completed &&
                                                        s.goalTextCompleted,
                                                ]}
                                            >
                                                {g.text}
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() =>
                                                void handleDeleteGoal(g.id)
                                            }
                                            style={s.deleteItemBtn}
                                            hitSlop={8}
                                        >
                                            <Ionicons
                                                name="trash-outline"
                                                size={16}
                                                color={theme.muted}
                                            />
                                        </Pressable>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* === TIMETABLE MODAL === */}
            <Modal
                visible={activeModal === "timetable"}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialogLarge}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <View style={s.modalIconWrap}>
                                    <Ionicons
                                        name="time-outline"
                                        size={18}
                                        color={theme.accent}
                                    />
                                </View>
                                <View>
                                    <Text style={s.modalTitle}>
                                        Class Timetable
                                    </Text>
                                    <Text style={s.modalSubtitle}>
                                        Weekly scheduled lectures and labs
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Close timetable modal"
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.muted}
                                />
                            </Pressable>
                        </View>
                        <ScrollView
                            style={s.modalScrollLarge}
                            showsVerticalScrollIndicator={false}
                        >
                            {timetable.status === "unauthenticated" ? (
                                <EmptyBlock
                                    icon="log-in-outline"
                                    title="Log in to see your timetable"
                                    text="Your timetable is based on your department and semester."
                                    actionLabel="Log in"
                                    onAction={goToLogin}
                                />
                            ) : timetable.status === "loading" ? (
                                <LoadingBlock label="Loading timetable..." />
                            ) : timetable.status === "error" ? (
                                <ErrorBlock
                                    title="Couldn't load timetable"
                                    message={timetable.message ?? undefined}
                                    onRetry={timetable.refresh}
                                />
                            ) : (
                                <>
                                    {!!timetableData && (
                                        <View style={s.timetableMetaBadge}>
                                            <Ionicons
                                                name="school-outline"
                                                size={14}
                                                color={theme.accent}
                                            />
                                            <Text style={s.timetableMetaText}>
                                                {[
                                                    timetableData.deptName,
                                                    `Sem ${timetableData.semester}`,
                                                    timetableData.division
                                                        ? `Div ${timetableData.division}`
                                                        : null,
                                                    timetableData.timetable?.academicYear,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" • ")}
                                            </Text>
                                        </View>
                                    )}

                                    {!!timetableData &&
                                        timetableData.divisions.length > 1 && (
                                            <View style={s.divisionRow}>
                                                {timetableData.divisions.map(
                                                    (d) => {
                                                        const active =
                                                            d ===
                                                            timetableData.division;
                                                        return (
                                                            <Pressable
                                                                key={d}
                                                                onPress={() =>
                                                                    onSelectDivision(d)
                                                                }
                                                                style={[
                                                                    s.divisionPill,
                                                                    active &&
                                                                        s.divisionPillActive,
                                                                ]}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        s.divisionPillText,
                                                                        active &&
                                                                            s.divisionPillTextActive,
                                                                    ]}
                                                                >
                                                                    Division {d}
                                                                </Text>
                                                            </Pressable>
                                                        );
                                                    },
                                                )}
                                            </View>
                                        )}

                                    {timetableEntries.length > 0 ? (
                                        DAYS_OF_WEEK.map((day) => {
                                            const dayEntries = timetableEntries
                                                .filter(
                                                    (e) => e.dayOfWeek === day,
                                                )
                                                .sort((a, b) =>
                                                    a.startTime.localeCompare(
                                                        b.startTime,
                                                    ),
                                                );
                                            if (dayEntries.length === 0)
                                                return null;
                                            return (
                                                <View
                                                    key={day}
                                                    style={s.dayGroup}
                                                >
                                                    <View style={s.dayHeader}>
                                                        <Text style={s.dayTitle}>
                                                            {day}
                                                        </Text>
                                                        <Text style={s.dayClassCount}>
                                                            {dayEntries.length} {dayEntries.length === 1 ? "class" : "classes"}
                                                        </Text>
                                                    </View>
                                                    {dayEntries.map((item) => (
                                                        <View
                                                            key={item.entryId}
                                                            style={s.scheduleItem}
                                                        >
                                                            <View style={s.scheduleTimeCol}>
                                                                <Text style={s.scheduleStartTime}>
                                                                    {item.startTime}
                                                                </Text>
                                                                <Text style={s.scheduleEndTime}>
                                                                    {item.endTime}
                                                                </Text>
                                                            </View>
                                                            <View style={s.scheduleInfoCol}>
                                                                <View style={s.scheduleTitleRow}>
                                                                    <Text style={s.scheduleTitle}>
                                                                        {item.subject?.subjectName ||
                                                                            item.subject?.subjectId ||
                                                                            `Subject #${item.subjectKey}`}
                                                                    </Text>
                                                                    <View style={s.classTypeBadge}>
                                                                        <Text style={s.classTypeText}>
                                                                            {item.classType}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                                <View style={s.scheduleMetaRow}>
                                                                    {!!item.classroom && (
                                                                        <Text style={s.scheduleMetaTag}>
                                                                            <Ionicons name="location-outline" size={11} color={theme.muted} /> Room {item.classroom}
                                                                        </Text>
                                                                    )}
                                                                    {!!item.teacher && (
                                                                        <Text style={s.scheduleMetaTag}>
                                                                            <Ionicons name="person-outline" size={11} color={theme.muted} /> {item.teacher}
                                                                        </Text>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <View style={s.modalEmptyState}>
                                            <Ionicons
                                                name="calendar-outline"
                                                size={36}
                                                color={theme.muted}
                                            />
                                            <Text style={s.modalEmptyTitle}>No classes found</Text>
                                            <Text style={s.modalEmptyText}>
                                                {!timetableData
                                                    ? "No timetable data available."
                                                    : !timetableData.timetable
                                                      ? "Select your division above to view classes."
                                                      : "This division has no registered classes."}
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* === UPCOMING EXAMS MODAL === */}
            <Modal
                visible={activeModal === "upcoming-exams"}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialogLarge}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <View style={[s.modalIconWrap, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
                                    <Ionicons
                                        name="calendar-outline"
                                        size={18}
                                        color={theme.warning}
                                    />
                                </View>
                                <View>
                                    <Text style={s.modalTitle}>Upcoming Exams</Text>
                                    <Text style={s.modalSubtitle}>
                                        Examination schedules & countdowns
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Close upcoming exams modal"
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.muted}
                                />
                            </Pressable>
                        </View>
                        <ScrollView
                            style={s.modalScrollLarge}
                            showsVerticalScrollIndicator={false}
                        >
                            {exams.status === "unauthenticated" ? (
                                <EmptyBlock
                                    icon="log-in-outline"
                                    title="Log in to see upcoming exams"
                                    text="Exams are shown for your department once you are signed in."
                                    actionLabel="Log in"
                                    onAction={goToLogin}
                                />
                            ) : exams.status === "loading" ? (
                                <LoadingBlock label="Loading upcoming exams..." />
                            ) : exams.status === "error" ? (
                                <ErrorBlock
                                    title="Couldn't load upcoming exams"
                                    message={exams.message ?? undefined}
                                    onRetry={exams.refresh}
                                />
                            ) : examList.length > 0 ? (
                                examList.map((exam) => {
                                    const examTime = new Date(exam.examDate);
                                    const diffDays = Math.ceil(
                                        (examTime.getTime() - currentTimestamp) /
                                            (1000 * 60 * 60 * 24),
                                    );
                                    const details = [
                                        exam.venue ? `Venue: ${exam.venue}` : null,
                                        exam.durationMinutes
                                            ? `${exam.durationMinutes} mins`
                                            : null,
                                        exam.semester ? `Sem ${exam.semester}` : null,
                                    ].filter(Boolean);

                                    return (
                                        <View
                                            key={exam.examId}
                                            style={s.examCard}
                                        >
                                            <View style={{ flex: 1, gap: 4 }}>
                                                <Badge
                                                    label={
                                                        exam.subject?.subjectName ||
                                                        exam.subject?.subjectId ||
                                                        exam.department?.deptName ||
                                                        "Exam"
                                                    }
                                                    color={theme.warning}
                                                />
                                                <Text style={s.examTitle}>
                                                    {exam.title}
                                                </Text>
                                                <Text style={s.examDateText}>
                                                    {examTime.toLocaleString("en-US", {
                                                        weekday: "short",
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </Text>
                                                {details.length > 0 && (
                                                    <Text style={s.examMetaText}>
                                                        {details.join(" • ")}
                                                    </Text>
                                                )}
                                                {!!exam.instructions && (
                                                    <Text
                                                        style={s.examInstructions}
                                                        numberOfLines={2}
                                                    >
                                                        {exam.instructions}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={s.examCountdownBox}>
                                                <Text style={s.examCountdownDays}>
                                                    {diffDays > 0 ? diffDays : 0}
                                                </Text>
                                                <Text style={s.examCountdownLabel}>
                                                    days left
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })
                            ) : (
                                <View style={s.modalEmptyState}>
                                    <Ionicons
                                        name="shield-checkmark-outline"
                                        size={36}
                                        color={theme.muted}
                                    />
                                    <Text style={s.modalEmptyTitle}>No upcoming exams</Text>
                                    <Text style={s.modalEmptyText}>
                                        No exams are currently scheduled for your department.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* === STUDY REPORT MODAL === */}
            <Modal
                visible={activeModal === "study-report"}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <View style={s.modalIconWrap}>
                                    <Ionicons
                                        name="bar-chart-outline"
                                        size={18}
                                        color={theme.accent}
                                    />
                                </View>
                                <View>
                                    <Text style={s.modalTitle}>Study Report</Text>
                                    <Text style={s.modalSubtitle}>
                                        Focus metrics and consistency summary
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Close study report modal"
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.muted}
                                />
                            </Pressable>
                        </View>

                        <View style={s.reportSummary}>
                            <View style={s.reportStat}>
                                <Text style={s.reportStatNumber}>
                                    {studyStats.totalMinutes}m
                                </Text>
                                <Text style={s.reportStatLabel}>Focus Logged</Text>
                            </View>
                            <View style={s.reportDivider} />
                            <View style={s.reportStat}>
                                <Text style={s.reportStatNumber}>
                                    {studyStats.sessionsCompleted}
                                </Text>
                                <Text style={s.reportStatLabel}>Pomodoros</Text>
                            </View>
                            <View style={s.reportDivider} />
                            <View style={s.reportStat}>
                                <Text style={s.reportStatNumber}>
                                    {goals.filter((g) => g.completed).length}/
                                    {goals.length}
                                </Text>
                                <Text style={s.reportStatLabel}>Goals Met</Text>
                            </View>
                        </View>

                        <View style={s.reportInsightsBox}>
                            <View style={s.reportInsightItem}>
                                <Ionicons name="sparkles" size={16} color={theme.accent} />
                                <Text style={s.reportInsightText}>
                                    Consistent 25-minute intervals improve recall and reduce cognitive fatigue before exams.
                                </Text>
                            </View>
                            <View style={s.reportInsightItem}>
                                <Ionicons name="lock-closed-outline" size={16} color={theme.muted} />
                                <Text style={s.reportInsightText}>
                                    Your study stats and task progress are securely persisted on this device.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* === STUDY REMINDERS MODAL === */}
            <Modal
                visible={activeModal === "study-reminders"}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <View style={s.modalIconWrap}>
                                    <Ionicons
                                        name="notifications-outline"
                                        size={18}
                                        color={theme.accent}
                                    />
                                </View>
                                <View>
                                    <Text style={s.modalTitle}>Study Reminders</Text>
                                    <Text style={s.modalSubtitle}>
                                        Manage daily study alerts & revision cues
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Close study reminders modal"
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.muted}
                                />
                            </Pressable>
                        </View>

                        {/* Add Reminder Form */}
                        <View style={s.addReminderBox}>
                            <TextInput
                                value={newReminderTitle}
                                onChangeText={setNewReminderTitle}
                                placeholder="Reminder title (e.g. Daily Quiz Practice)..."
                                placeholderTextColor={theme.muted}
                                style={s.reminderInput}
                            />
                            <View style={s.reminderTimeRow}>
                                <TextInput
                                    value={newReminderTime}
                                    onChangeText={setNewReminderTime}
                                    placeholder="Time (e.g. 08:00 PM)"
                                    placeholderTextColor={theme.muted}
                                    style={s.reminderTimeInput}
                                />
                                <Pressable
                                    onPress={handleAddReminder}
                                    style={({ pressed }) => [
                                        s.addReminderBtn,
                                        pressed && { opacity: 0.8 },
                                    ]}
                                >
                                    <Ionicons name="add" size={18} color="#FFFFFF" />
                                    <Text style={s.addReminderBtnText}>Add</Text>
                                </Pressable>
                            </View>
                        </View>

                        <ScrollView
                            style={s.modalListScroll}
                            showsVerticalScrollIndicator={false}
                        >
                            {reminders.length === 0 ? (
                                <View style={s.modalEmptyState}>
                                    <Ionicons
                                        name="notifications-off-outline"
                                        size={36}
                                        color={theme.muted}
                                    />
                                    <Text style={s.modalEmptyTitle}>No reminders set</Text>
                                    <Text style={s.modalEmptyText}>
                                        Schedule custom revision alerts above to keep your study streak active.
                                    </Text>
                                </View>
                            ) : (
                                reminders.map((r) => (
                                    <View key={r.id} style={s.reminderCard}>
                                        <View style={{ flex: 1, gap: 2 }}>
                                            <Text
                                                style={[
                                                    s.reminderCardTitle,
                                                    !r.active && s.reminderInactiveText,
                                                ]}
                                            >
                                                {r.title}
                                            </Text>
                                            <View style={s.reminderMetaRow}>
                                                <Ionicons
                                                    name="time-outline"
                                                    size={12}
                                                    color={theme.muted}
                                                />
                                                <Text style={s.reminderCardTime}>
                                                    {r.time}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={s.reminderActionGroup}>
                                            <Switch
                                                value={r.active}
                                                onValueChange={() =>
                                                    void handleToggleReminder(r.id)
                                                }
                                                trackColor={{
                                                    false: theme.border,
                                                    true: theme.accent,
                                                }}
                                                thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
                                            />
                                            <Pressable
                                                onPress={() =>
                                                    void handleDeleteReminder(r.id)
                                                }
                                                style={s.deleteItemBtn}
                                                hitSlop={8}
                                            >
                                                <Ionicons
                                                    name="trash-outline"
                                                    size={16}
                                                    color={theme.muted}
                                                />
                                            </Pressable>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(10, 14, 28, 0.75)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
        },
        modalDialog: {
            width: "100%",
            maxWidth: 440,
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 20,
            gap: 14,
            ...Platform.select({
                ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.35,
                    shadowRadius: 16,
                },
                default: {},
            }),
        },
        modalDialogLarge: {
            width: "100%",
            maxWidth: 520,
            backgroundColor: t.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            padding: 20,
            gap: 14,
        },
        modalHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
        modalIconWrap: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: t.border,
        },
        modalTitle: { color: t.text, fontSize: 16, fontWeight: "700" },
        modalSubtitle: { color: t.muted, fontSize: 11, marginTop: 1 },
        modalCloseBtn: {
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        modalListScroll: { maxHeight: 280 },
        modalScrollLarge: { maxHeight: 420 },

        // Focus Timer
        timerCircleBox: {
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 24,
            borderRadius: 14,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        timerProgressOuter: { alignItems: "center", gap: 8 },
        timerTime: {
            color: t.text,
            fontSize: 48,
            fontWeight: "800",
            letterSpacing: 2,
            fontVariant: ["tabular-nums"],
        },
        timerStatusPill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        timerPulseDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: t.muted,
        },
        timerPulseDotActive: {
            backgroundColor: "#10B981",
        },
        timerSub: {
            color: t.muted,
            fontSize: 12,
            fontWeight: "600",
        },
        timerActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
        },
        timerMainBtn: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: t.accent,
        },
        timerMainBtnActive: {
            backgroundColor: t.danger,
        },
        timerMainBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
        timerResetBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        timerResetText: { color: t.text, fontSize: 13, fontWeight: "600" },
        timerStatsFooterBox: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: t.border,
        },
        timerStatColumn: { alignItems: "center", flex: 1 },
        timerStatVal: { color: t.text, fontSize: 16, fontWeight: "800" },
        timerStatLbl: { color: t.muted, fontSize: 11, marginTop: 2 },
        timerStatDivider: { width: 1, height: 24, backgroundColor: t.border },

        // Daily Planner
        inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
        textInput: {
            flex: 1,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: t.text,
            fontSize: 13,
        },
        addGoalBtn: {
            width: 42,
            height: 42,
            borderRadius: 10,
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
            gap: 8,
        },
        goalPressable: {
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            gap: 10,
        },
        checkbox: {
            width: 20,
            height: 20,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: t.border,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surfaceAlt,
        },
        checkboxChecked: {
            backgroundColor: "#10B981",
            borderColor: "#10B981",
        },
        modalGoalText: { color: t.text, fontSize: 13, fontWeight: "500", flex: 1 },
        goalTextCompleted: {
            color: t.muted,
            textDecorationLine: "line-through",
        },
        deleteItemBtn: {
            padding: 4,
            borderRadius: 6,
        },

        // Timetable
        timetableMetaBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: t.surfaceAlt,
            alignSelf: "flex-start",
            marginBottom: 10,
            borderWidth: 1,
            borderColor: t.border,
        },
        timetableMetaText: {
            color: t.text,
            fontSize: 11,
            fontWeight: "600",
        },
        divisionRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12,
        },
        divisionPill: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surfaceAlt,
        },
        divisionPillActive: {
            backgroundColor: t.accent,
            borderColor: t.accent,
        },
        divisionPillText: {
            fontSize: 12,
            fontWeight: "600",
            color: t.text,
        },
        divisionPillTextActive: {
            color: "#FFFFFF",
        },
        dayGroup: {
            marginBottom: 14,
            backgroundColor: t.surfaceAlt,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: t.border,
            gap: 8,
        },
        dayHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 6,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        dayTitle: {
            fontSize: 13,
            fontWeight: "800",
            color: t.accent,
            letterSpacing: 0.5,
        },
        dayClassCount: {
            fontSize: 11,
            color: t.muted,
            fontWeight: "500",
        },
        scheduleItem: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            paddingVertical: 6,
        },
        scheduleTimeCol: { width: 68 },
        scheduleStartTime: {
            color: t.text,
            fontSize: 12,
            fontWeight: "700",
        },
        scheduleEndTime: {
            color: t.muted,
            fontSize: 11,
            marginTop: 1,
        },
        scheduleInfoCol: { flex: 1, gap: 3 },
        scheduleTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
        },
        scheduleTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
            flex: 1,
        },
        classTypeBadge: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        classTypeText: {
            color: t.accent,
            fontSize: 10,
            fontWeight: "700",
        },
        scheduleMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
        scheduleMetaTag: {
            color: t.muted,
            fontSize: 11,
        },

        // Exams
        examCard: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 14,
            borderRadius: 12,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            marginBottom: 10,
            gap: 12,
        },
        examTitle: {
            color: t.text,
            fontSize: 14,
            fontWeight: "700",
        },
        examDateText: { color: t.text, fontSize: 12, fontWeight: "500" },
        examMetaText: { color: t.muted, fontSize: 11 },
        examInstructions: { color: t.muted, fontSize: 11, fontStyle: "italic" },
        examCountdownBox: {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            minWidth: 64,
        },
        examCountdownDays: {
            color: t.warning,
            fontSize: 20,
            fontWeight: "800",
        },
        examCountdownLabel: { color: t.muted, fontSize: 10, fontWeight: "600" },

        // Study Report
        reportSummary: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
            paddingVertical: 16,
            backgroundColor: t.surfaceAlt,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
        },
        reportStat: { alignItems: "center", flex: 1 },
        reportStatNumber: { color: t.text, fontSize: 22, fontWeight: "800" },
        reportStatLabel: {
            color: t.muted,
            fontSize: 11,
            marginTop: 4,
            fontWeight: "500",
        },
        reportDivider: { width: 1, height: 28, backgroundColor: t.border },
        reportInsightsBox: { gap: 10, marginTop: 4 },
        reportInsightItem: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
            padding: 10,
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        reportInsightText: {
            color: t.muted,
            fontSize: 12,
            lineHeight: 17,
            flex: 1,
        },

        // Reminders
        addReminderBox: {
            backgroundColor: t.surfaceAlt,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: t.border,
            gap: 8,
        },
        reminderInput: {
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            color: t.text,
            fontSize: 12,
        },
        reminderTimeRow: {
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
        },
        reminderTimeInput: {
            flex: 1,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            color: t.text,
            fontSize: 12,
        },
        addReminderBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: t.accent,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 8,
        },
        addReminderBtnText: {
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: "700",
        },
        reminderCard: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            marginBottom: 8,
            gap: 10,
        },
        reminderCardTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
        },
        reminderInactiveText: {
            color: t.muted,
            textDecorationLine: "line-through",
        },
        reminderMetaRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 2,
        },
        reminderCardTime: {
            color: t.muted,
            fontSize: 11,
            fontWeight: "500",
        },
        reminderActionGroup: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },

        // Empty states
        modalEmptyState: {
            paddingVertical: 24,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
        },
        modalEmptyTitle: {
            color: t.text,
            fontSize: 14,
            fontWeight: "700",
        },
        modalEmptyText: {
            color: t.muted,
            fontSize: 12,
            textAlign: "center",
            lineHeight: 17,
            maxWidth: 280,
        },
    });
}
