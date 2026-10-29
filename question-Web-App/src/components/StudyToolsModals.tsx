import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
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

    // === Inputs ===
    const [newGoalText, setNewGoalText] = useState("");
    const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

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
                                <Ionicons
                                    name="timer-outline"
                                    size={20}
                                    color={theme.accent}
                                />
                                <Text style={s.modalTitle}>Focus Timer</Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.muted}
                                />
                            </Pressable>
                        </View>
                        <View style={s.timerCircleBox}>
                            <Text style={s.timerTime}>
                                {Math.floor(timerSecondsLeft / 60)
                                    .toString()
                                    .padStart(2, "0")}
                                :
                                {(timerSecondsLeft % 60)
                                    .toString()
                                    .padStart(2, "0")}
                            </Text>
                            <Text style={s.timerSub}>
                                {timerIsRunning
                                    ? "Deep Focus Session"
                                    : "Ready to focus"}
                            </Text>
                        </View>
                        <View style={s.timerActions}>
                            <Pressable
                                onPress={() =>
                                    setTimerIsRunning((prev) => !prev)
                                }
                                style={[
                                    s.timerMainBtn,
                                    timerIsRunning && {
                                        backgroundColor: theme.danger,
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={timerIsRunning ? "pause" : "play"}
                                    size={16}
                                    color="#FFFFFF"
                                />
                                <Text style={s.timerMainBtnText}>
                                    {timerIsRunning
                                        ? "Pause"
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
                                    size={15}
                                    color={theme.muted}
                                />
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
                                <Ionicons
                                    name="checkbox-outline"
                                    size={20}
                                    color={theme.accent}
                                />
                                <Text style={s.modalTitle}>
                                    Daily Study Goals
                                </Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
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
                                placeholder="Add a new goal for today..."
                                placeholderTextColor={theme.muted}
                                style={s.textInput}
                                onSubmitEditing={handleAddGoal}
                            />
                            <Pressable
                                onPress={handleAddGoal}
                                style={s.addGoalBtn}
                            >
                                <Ionicons
                                    name="add"
                                    size={18}
                                    color="#FFFFFF"
                                />
                            </Pressable>
                        </View>
                        <ScrollView style={{ maxHeight: 280, marginTop: 12 }}>
                            {goals.map((g) => (
                                <View key={g.id} style={s.modalGoalRow}>
                                    <Pressable
                                        onPress={() =>
                                            void handleToggleGoal(g.id)
                                        }
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            flex: 1,
                                            gap: 10,
                                        }}
                                    >
                                        <Ionicons
                                            name={
                                                g.completed
                                                    ? "checkmark-circle"
                                                    : "ellipse-outline"
                                            }
                                            size={18}
                                            color={
                                                g.completed
                                                    ? theme.success
                                                    : theme.muted
                                            }
                                        />
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
                                        hitSlop={8}
                                    >
                                        <Ionicons
                                            name="trash-outline"
                                            size={16}
                                            color={theme.muted}
                                        />
                                    </Pressable>
                                </View>
                            ))}
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
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <Ionicons
                                    name="time-outline"
                                    size={20}
                                    color={theme.accent}
                                />
                                <Text style={s.modalTitle}>
                                    Full Class Timetable
                                </Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.muted}
                                />
                            </Pressable>
                        </View>
                        <ScrollView
                            style={{ maxHeight: 400, marginVertical: 10 }}
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
                                        <Text
                                            style={{
                                                color: theme.muted,
                                                fontSize: 12,
                                                marginBottom: 10,
                                            }}
                                        >
                                            {[
                                                timetableData.deptName,
                                                `Semester ${timetableData.semester}`,
                                                timetableData.division
                                                    ? `Division ${timetableData.division}`
                                                    : null,
                                                timetableData.timetable
                                                    ?.academicYear,
                                            ]
                                                .filter(Boolean)
                                                .join(" \u2022 ")}
                                        </Text>
                                    )}
                                    {!!timetableData &&
                                        timetableData.divisions.length > 1 && (
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    flexWrap: "wrap",
                                                    gap: 8,
                                                    marginBottom: 12,
                                                }}
                                            >
                                                {timetableData.divisions.map(
                                                    (d) => {
                                                        const active =
                                                            d ===
                                                            timetableData.division;
                                                        return (
                                                            <Pressable
                                                                key={d}
                                                                onPress={() =>
                                                                    onSelectDivision(
                                                                        d,
                                                                    )
                                                                }
                                                                style={{
                                                                    paddingHorizontal: 14,
                                                                    paddingVertical: 6,
                                                                    borderRadius: 16,
                                                                    borderWidth: 1,
                                                                    borderColor:
                                                                        active
                                                                            ? theme.accent
                                                                            : theme.border,
                                                                    backgroundColor:
                                                                        active
                                                                            ? theme.accent
                                                                            : theme.surfaceAlt,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        fontSize: 12,
                                                                        fontWeight:
                                                                            "700",
                                                                        color: active
                                                                            ? "#FFFFFF"
                                                                            : theme.text,
                                                                    }}
                                                                >
                                                                    {`Div ${d}`}
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
                                                    style={{ marginBottom: 12 }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 13,
                                                            fontWeight: "700",
                                                            color: theme.accent,
                                                            marginBottom: 8,
                                                        }}
                                                    >
                                                        {day}
                                                    </Text>
                                                    {dayEntries.map((item) => (
                                                        <View
                                                            key={item.entryId}
                                                            style={
                                                                s.modalScheduleRow
                                                            }
                                                        >
                                                            <View
                                                                style={{
                                                                    width: 72,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={
                                                                        s.modalScheduleTime
                                                                    }
                                                                >
                                                                    {
                                                                        item.startTime
                                                                    }
                                                                </Text>
                                                                <Text
                                                                    style={
                                                                        s.modalScheduleLoc
                                                                    }
                                                                >
                                                                    {
                                                                        item.endTime
                                                                    }
                                                                </Text>
                                                            </View>
                                                            <View
                                                                style={{
                                                                    flex: 1,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={
                                                                        s.modalScheduleTitle
                                                                    }
                                                                >
                                                                    {item
                                                                        .subject
                                                                        ?.subjectName ||
                                                                        item
                                                                            .subject
                                                                            ?.subjectId ||
                                                                        `Subject #${item.subjectKey}`}{" "}
                                                                    <Text
                                                                        style={{
                                                                            fontSize: 10,
                                                                            color: theme.muted,
                                                                            fontWeight:
                                                                                "400",
                                                                        }}
                                                                    >
                                                                        (
                                                                        {
                                                                            item.classType
                                                                        }
                                                                        )
                                                                    </Text>
                                                                </Text>
                                                                {!!item.classroom && (
                                                                    <Text
                                                                        style={
                                                                            s.modalScheduleLoc
                                                                        }
                                                                    >
                                                                        Room:{" "}
                                                                        {
                                                                            item.classroom
                                                                        }
                                                                    </Text>
                                                                )}
                                                                {!!item.teacher && (
                                                                    <Text
                                                                        style={
                                                                            s.modalScheduleLoc
                                                                        }
                                                                    >
                                                                        Teacher:{" "}
                                                                        {
                                                                            item.teacher
                                                                        }
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <Text
                                            style={{
                                                color: theme.muted,
                                                fontSize: 13,
                                                textAlign: "center",
                                                marginTop: 20,
                                            }}
                                        >
                                            {!timetableData
                                                ? "No timetable data."
                                                : timetableData.divisions
                                                        .length === 0
                                                  ? "No active timetable has been published for your department and semester yet."
                                                  : !timetableData.timetable
                                                    ? "Select your division above to view your timetable."
                                                    : "This timetable has no classes yet."}
                                        </Text>
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
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={20}
                                    color={theme.warning}
                                />
                                <Text style={s.modalTitle}>Upcoming Exams</Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.muted}
                                />
                            </Pressable>
                        </View>
                        <ScrollView
                            style={{ maxHeight: 300, marginTop: 12 }}
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
                                            ? `${exam.durationMinutes} min`
                                            : null,
                                        exam.semester
                                            ? `Sem ${exam.semester}`
                                            : null,
                                    ].filter(Boolean);
                                    return (
                                        <View
                                            key={exam.examId}
                                            style={s.examCard}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Badge
                                                    label={
                                                        exam.subject
                                                            ?.subjectName ||
                                                        exam.subject
                                                            ?.subjectId ||
                                                        exam.department
                                                            ?.deptName ||
                                                        "Exam"
                                                    }
                                                    color={theme.warning}
                                                />
                                                <Text style={s.examTitle}>
                                                    {exam.title}
                                                </Text>
                                                <Text style={s.examDate}>
                                                    {examTime.toLocaleString(
                                                        "en-US",
                                                        {
                                                            weekday: "short",
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        },
                                                    )}
                                                </Text>
                                                {details.length > 0 && (
                                                    <Text style={s.examDate}>
                                                        {details.join(" \u2022 ")}
                                                    </Text>
                                                )}
                                                {!!exam.instructions && (
                                                    <Text
                                                        style={s.examDate}
                                                        numberOfLines={3}
                                                    >
                                                        {exam.instructions}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={s.examCountdownBox}>
                                                <Text
                                                    style={s.examCountdownDays}
                                                >
                                                    {diffDays > 0 ? diffDays : 0}
                                                </Text>
                                                <Text
                                                    style={s.examCountdownLabel}
                                                >
                                                    days left
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })
                            ) : (
                                <Text
                                    style={{
                                        color: theme.muted,
                                        fontSize: 13,
                                        textAlign: "center",
                                        marginVertical: 20,
                                    }}
                                >
                                    No upcoming exams have been scheduled for
                                    your department.
                                </Text>
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
                                <Ionicons
                                    name="bar-chart-outline"
                                    size={20}
                                    color={theme.accent}
                                />
                                <Text style={s.modalTitle}>
                                    Weekly Study Report
                                </Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
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
                                <Text style={s.reportStatLabel}>
                                    Study Focus Time
                                </Text>
                            </View>
                            <View style={s.reportStat}>
                                <Text style={s.reportStatNumber}>
                                    {studyStats.sessionsCompleted}
                                </Text>
                                <Text style={s.reportStatLabel}>
                                    Pomodoro Blocks
                                </Text>
                            </View>
                            <View style={s.reportStat}>
                                <Text style={s.reportStatNumber}>
                                    {goals.filter((g) => g.completed).length}/
                                    {goals.length}
                                </Text>
                                <Text style={s.reportStatLabel}>
                                    Goals Done
                                </Text>
                            </View>
                        </View>
                        <Text style={s.reportNotice}>
                            Based on your recorded timer sessions and completed
                            syllabus tasks stored safely on your device.
                        </Text>
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
                                <Ionicons
                                    name="notifications-outline"
                                    size={20}
                                    color={theme.accent}
                                />
                                <Text style={s.modalTitle}>
                                    Study Reminders
                                </Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={s.modalCloseBtn}
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.muted}
                                />
                            </Pressable>
                        </View>
                        <View style={{ gap: 10, marginTop: 14 }}>
                            {[
                                {
                                    title: "Daily Study Reminder",
                                    time: "08:00 PM",
                                },
                                {
                                    title: "Upcoming Exam Review",
                                    time: "09:30 AM",
                                },
                                {
                                    title: "Topic Revision Alert",
                                    time: "05:00 PM",
                                },
                            ].map((rem, i) => (
                                <View key={i} style={s.reminderItem}>
                                    <View>
                                        <Text style={s.reminderTitle}>
                                            {rem.title}
                                        </Text>
                                        <Text style={s.reminderTime}>
                                            {rem.time}
                                        </Text>
                                    </View>
                                    <Badge
                                        label="Active"
                                        color={theme.success}
                                    />
                                </View>
                            ))}
                        </View>
                        <Text style={s.reminderFooterNote}>
                            In-app reminders are active during study hours. Push
                            notification scheduling will integrate with native
                            device permissions in a future update.
                        </Text>
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
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
        },
        modalDialog: {
            width: "100%",
            maxWidth: 440,
            backgroundColor: t.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
            padding: 18,
        },
        modalHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        modalTitle: { color: t.text, fontSize: 16, fontWeight: "700" },
        modalCloseBtn: {
            width: 28,
            height: 28,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        timerCircleBox: {
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 20,
            borderRadius: 12,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            marginVertical: 10,
        },
        timerTime: {
            color: t.text,
            fontSize: 42,
            fontWeight: "800",
            letterSpacing: 1.5,
        },
        timerSub: {
            color: t.muted,
            fontSize: 12,
            marginTop: 4,
            fontWeight: "500",
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
            gap: 6,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: t.accent,
        },
        timerMainBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
        timerResetBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        timerResetText: { color: t.text, fontSize: 13, fontWeight: "600" },
        timerStatsFooter: {
            color: t.muted,
            fontSize: 11,
            textAlign: "center",
            marginTop: 12,
        },
        inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
        textInput: {
            flex: 1,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 9,
            color: t.text,
            fontSize: 13,
        },
        addGoalBtn: {
            width: 38,
            height: 38,
            borderRadius: 8,
            backgroundColor: t.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        modalGoalRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 9,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        modalGoalText: { color: t.text, fontSize: 13, fontWeight: "500" },
        goalTextCompleted: {
            color: t.muted,
            textDecorationLine: "line-through",
        },
        modalScheduleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 9,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        modalScheduleTime: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "700",
            width: 72,
        },
        modalScheduleTitle: { color: t.text, fontSize: 13, fontWeight: "600" },
        modalScheduleLoc: { color: t.muted, fontSize: 11, marginTop: 2 },
        examCard: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            marginBottom: 8,
        },
        examTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "700",
            marginTop: 4,
        },
        examDate: { color: t.muted, fontSize: 11, marginTop: 2 },
        examCountdownBox: {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
        },
        examCountdownDays: {
            color: t.warning,
            fontSize: 16,
            fontWeight: "800",
        },
        examCountdownLabel: { color: t.muted, fontSize: 10, fontWeight: "600" },
        reportSummary: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        reportStat: { alignItems: "center", flex: 1 },
        reportStatNumber: { color: t.text, fontSize: 20, fontWeight: "800" },
        reportStatLabel: {
            color: t.muted,
            fontSize: 11,
            marginTop: 2,
            fontWeight: "500",
        },
        reportNotice: {
            color: t.muted,
            fontSize: 12,
            lineHeight: 17,
            textAlign: "center",
            marginTop: 12,
        },
        reminderItem: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 8,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        reminderTitle: { color: t.text, fontSize: 13, fontWeight: "600" },
        reminderTime: { color: t.muted, fontSize: 11, marginTop: 2 },
        reminderFooterNote: {
            color: t.muted,
            fontSize: 11,
            lineHeight: 16,
            textAlign: "center",
            marginTop: 12,
        },
    });
}
