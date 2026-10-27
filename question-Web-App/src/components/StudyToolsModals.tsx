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

import { Badge } from "./ui";
import { useAppTheme } from "../providers/ThemeProvider";
import {
    studyStorage,
    type ExamItem,
    type ScheduleItem,
    type StudyGoal,
    type StudyStats,
} from "../services/study-storage";
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
    schedule: ScheduleItem[];
    exams: ExamItem[];
    studyStats: StudyStats;
    onGoalsChange: (goals: StudyGoal[]) => void;
    onScheduleChange: (schedule: ScheduleItem[]) => void;
    onExamsChange: (exams: ExamItem[]) => void;
    onStudyStatsChange: (stats: StudyStats) => void;
}

const FOCUS_DURATION = 25 * 60; // 25 minutes

export default function StudyToolsModals({
    activeModal,
    onClose,
    goals,
    schedule,
    exams,
    studyStats,
    onGoalsChange,
    onScheduleChange,
    onExamsChange,
    onStudyStatsChange,
}: StudyToolsModalsProps) {
    const { theme } = useAppTheme();
    const s = useMemo(() => makeStyles(theme), [theme]);

    // ── Focus Timer ─────────────────────────────────────────────────────────
    const [timerSecondsLeft, setTimerSecondsLeft] = useState(FOCUS_DURATION);
    const [timerIsRunning, setTimerIsRunning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Inputs ──────────────────────────────────────────────────────────────
    const [newGoalText, setNewGoalText] = useState("");
    const [newClassTime, setNewClassTime] = useState("");
    const [newClassTitle, setNewClassTitle] = useState("");
    const [newClassLocation, setNewClassLocation] = useState("");
    const [newExamSubject, setNewExamSubject] = useState("");
    const [newExamTitle, setNewExamTitle] = useState("");
    const [newExamDate, setNewExamDate] = useState("");

    // Timestamp for exam countdown (safe against render-time impurity)
    const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

    useEffect(() => {
        if (activeModal !== "upcoming-exams") return;
        const intervalId = setInterval(() => {
            setCurrentTimestamp(Date.now());
        }, 15000);
        return () => clearInterval(intervalId);
    }, [activeModal]);

    // Timer tick handler
    useEffect(() => {
        if (timerIsRunning) {
            timerRef.current = setInterval(() => {
                setTimerSecondsLeft((prev) => {
                    if (prev <= 1) {
                        setTimerIsRunning(false);
                        void studyStorage.recordStudySession(25).then(onStudyStatsChange);
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

    // Goal Handlers
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

    // Schedule Handlers
    const handleAddClass = async () => {
        if (!newClassTime.trim() || !newClassTitle.trim()) return;
        const updated = await studyStorage.addScheduleItem({
            time: newClassTime.trim(),
            title: newClassTitle.trim(),
            location: newClassLocation.trim() || "Online / TBA",
            type: "lecture",
        });
        onScheduleChange(updated);
        setNewClassTime("");
        setNewClassTitle("");
        setNewClassLocation("");
    };

    // Exam Handlers
    const handleAddExam = async () => {
        if (!newExamSubject.trim() || !newExamTitle.trim() || !newExamDate.trim()) return;
        const updated = await studyStorage.addExam({
            subject: newExamSubject.trim(),
            title: newExamTitle.trim(),
            date: newExamDate.trim(),
        });
        onExamsChange(updated);
        setNewExamSubject("");
        setNewExamTitle("");
        setNewExamDate("");
    };

    return (
        <>
            {/* ── FOCUS TIMER MODAL ───────────────────────────────────────── */}
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
                                <Ionicons name="timer-outline" size={20} color={theme.accent} />
                                <Text style={s.modalTitle}>Focus Timer</Text>
                            </View>
                            <Pressable onPress={onClose} style={s.modalCloseBtn} accessibilityLabel="Close modal">
                                <Ionicons name="close" size={18} color={theme.muted} />
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
                                    timerIsRunning && { backgroundColor: theme.danger },
                                ]}
                            >
                                <Ionicons
                                    name={timerIsRunning ? "pause" : "play"}
                                    size={16}
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
                                <Ionicons name="refresh" size={15} color={theme.muted} />
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
                onRequestClose={onClose}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <Ionicons name="checkbox-outline" size={20} color={theme.accent} />
                                <Text style={s.modalTitle}>Daily Study Goals</Text>
                            </View>
                            <Pressable onPress={onClose} style={s.modalCloseBtn} accessibilityLabel="Close modal">
                                <Ionicons name="close" size={18} color={theme.muted} />
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
                            <Pressable onPress={handleAddGoal} style={s.addGoalBtn} accessibilityLabel="Add goal">
                                <Ionicons name="add" size={18} color="#FFFFFF" />
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
                                            size={18}
                                            color={g.completed ? theme.success : theme.muted}
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
                                        accessibilityLabel="Delete goal"
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

            {/* ── TIMETABLE MODAL ─────────────────────────────────────────── */}
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
                                <Ionicons name="time-outline" size={20} color={theme.accent} />
                                <Text style={s.modalTitle}>Class Timetable</Text>
                            </View>
                            <Pressable onPress={onClose} style={s.modalCloseBtn} accessibilityLabel="Close modal">
                                <Ionicons name="close" size={18} color={theme.muted} />
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
                                <Text style={s.saveClassBtnText}>{"Add to Today's Schedule"}</Text>
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
                onRequestClose={onClose}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <Ionicons name="calendar-outline" size={20} color={theme.warning} />
                                <Text style={s.modalTitle}>Upcoming Exams</Text>
                            </View>
                            <Pressable onPress={onClose} style={s.modalCloseBtn} accessibilityLabel="Close modal">
                                <Ionicons name="close" size={18} color={theme.muted} />
                            </Pressable>
                        </View>

                        <ScrollView style={{ maxHeight: 220, marginTop: 12 }}>
                            {exams.map((exam) => {
                                const diffDays = currentTimestamp > 0
                                    ? Math.ceil(
                                          (new Date(exam.date).getTime() - currentTimestamp) /
                                              (1000 * 60 * 60 * 24),
                                      )
                                    : 0;
                                return (
                                    <View key={exam.id} style={s.examCard}>
                                        <View style={{ flex: 1 }}>
                                            <Badge label={exam.subject} color={theme.warning} />
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

                        {/* Add exam form */}
                        <View style={s.addClassBox}>
                            <Text style={s.addClassBoxTitle}>Add Upcoming Exam</Text>
                            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                                <TextInput
                                    value={newExamSubject}
                                    onChangeText={setNewExamSubject}
                                    placeholder="Subject (e.g. DBMS)"
                                    placeholderTextColor={theme.muted}
                                    style={[s.textInput, { flex: 1 }]}
                                />
                                <TextInput
                                    value={newExamDate}
                                    onChangeText={setNewExamDate}
                                    placeholder="Date (YYYY-MM-DD)"
                                    placeholderTextColor={theme.muted}
                                    style={[s.textInput, { flex: 1 }]}
                                />
                            </View>
                            <TextInput
                                value={newExamTitle}
                                onChangeText={setNewExamTitle}
                                placeholder="Exam title (e.g. End-Sem Practical)"
                                placeholderTextColor={theme.muted}
                                style={[s.textInput, { marginTop: 8 }]}
                            />
                            <Pressable onPress={handleAddExam} style={[s.saveClassBtn, { backgroundColor: theme.warning }]}>
                                <Text style={s.saveClassBtnText}>Add Exam</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── STUDY REPORT MODAL ──────────────────────────────────────── */}
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
                                <Ionicons name="bar-chart-outline" size={20} color={theme.accent} />
                                <Text style={s.modalTitle}>Weekly Study Report</Text>
                            </View>
                            <Pressable onPress={onClose} style={s.modalCloseBtn} accessibilityLabel="Close modal">
                                <Ionicons name="close" size={18} color={theme.muted} />
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
                onRequestClose={onClose}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalDialog}>
                        <View style={s.modalHeader}>
                            <View style={s.modalTitleRow}>
                                <Ionicons name="notifications-outline" size={20} color={theme.accent} />
                                <Text style={s.modalTitle}>Study Reminders</Text>
                            </View>
                            <Pressable onPress={onClose} style={s.modalCloseBtn} accessibilityLabel="Close modal">
                                <Ionicons name="close" size={18} color={theme.muted} />
                            </Pressable>
                        </View>

                        <View style={{ gap: 10, marginTop: 14 }}>
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
                                    <Badge label="Active" color={theme.success} />
                                </View>
                            ))}
                        </View>

                        <Text style={s.reminderFooterNote}>
                            In-app reminders are active during study hours. Push notification
                            scheduling will integrate with native device permissions in a
                            future update.
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
        modalTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        modalTitle: {
            color: t.text,
            fontSize: 16,
            fontWeight: "700",
        },
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
        timerMainBtnText: {
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: "700",
        },
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
        timerResetText: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
        },
        timerStatsFooter: {
            color: t.muted,
            fontSize: 11,
            textAlign: "center",
            marginTop: 12,
        },
        inputRow: {
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
        },
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
        modalGoalText: {
            color: t.text,
            fontSize: 13,
            fontWeight: "500",
        },
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
        modalScheduleTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
        },
        modalScheduleLoc: {
            color: t.muted,
            fontSize: 11,
            marginTop: 2,
        },
        addClassBox: {
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        addClassBoxTitle: {
            color: t.text,
            fontSize: 12,
            fontWeight: "700",
        },
        saveClassBtn: {
            marginTop: 10,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: t.accent,
            alignItems: "center",
        },
        saveClassBtnText: {
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: "700",
        },
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
        examDate: {
            color: t.muted,
            fontSize: 11,
            marginTop: 2,
        },
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
        examCountdownLabel: {
            color: t.muted,
            fontSize: 10,
            fontWeight: "600",
        },
        reportSummary: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        reportStat: {
            alignItems: "center",
            flex: 1,
        },
        reportStatNumber: {
            color: t.text,
            fontSize: 20,
            fontWeight: "800",
        },
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
        reminderTitle: {
            color: t.text,
            fontSize: 13,
            fontWeight: "600",
        },
        reminderTime: {
            color: t.muted,
            fontSize: 11,
            marginTop: 2,
        },
        reminderFooterNote: {
            color: t.muted,
            fontSize: 11,
            lineHeight: 16,
            textAlign: "center",
            marginTop: 12,
        },
    });
}
