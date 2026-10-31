import React, { useMemo } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
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
import type { SyllabusCoverageEvent } from "../../services/api";
import { type TrackerPalette, useTrackerPalette } from "./TrackerVisuals";

function shiftIsoDate(isoDate: string, deltaDays: number): string {
    const base = /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
        ? new Date(`${isoDate}T00:00:00`)
        : new Date();
    if (isNaN(base.getTime())) {
        return new Date().toISOString().slice(0, 10);
    }
    base.setDate(base.getDate() + deltaDays);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export function formatReadableDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    try {
        const d = new Date(`${iso}T00:00:00`);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return iso;
    }
}

/* ============================================================================
 * 1. RECORD COVERAGE MODAL
 * ========================================================================== */

export function RecordCoverageModal({
    visible,
    onClose,
    selectedTopics,
    coveredDate,
    onChangeCoveredDate,
    lectureTitle,
    onChangeLectureTitle,
    notes,
    onChangeNotes,
    submitting,
    submitError,
    onSubmit,
    todayIso,
    yesterdayIso,
}: {
    visible: boolean;
    onClose: () => void;
    selectedTopics: { topicId: number; topicName: string; chapterName: string }[];
    coveredDate: string;
    onChangeCoveredDate: (d: string) => void;
    lectureTitle: string;
    onChangeLectureTitle: (v: string) => void;
    notes: string;
    onChangeNotes: (v: string) => void;
    submitting: boolean;
    submitError: string | null;
    onSubmit: () => void;
    todayIso: string;
    yesterdayIso: string;
}) {
    const palette = useTrackerPalette();
    const styles = useMemo(() => makeStyles(palette), [palette]);
    const twoDaysAgoIso = shiftIsoDate(todayIso, -2);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.modalOverlay}
            >
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderLeft}>
                            <View style={styles.modalIconBadge}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={18}
                                    color={palette.purpleLight}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    Record Lecture Coverage
                                </Text>
                                <Text style={styles.modalSubTitle}>
                                    {selectedTopics.length}{" "}
                                    {selectedTopics.length === 1
                                        ? "topic"
                                        : "topics"}{" "}
                                    selected • {formatReadableDate(coveredDate)}
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={onClose}
                            hitSlop={10}
                            style={styles.closeIconBtn}
                        >
                            <Ionicons
                                name="close"
                                size={20}
                                color={palette.textSecondary}
                            />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={{ maxHeight: 420 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ gap: 14, paddingVertical: 4 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Quick Date Chips + Stepper */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>
                                LECTURE / COVERAGE DATE
                            </Text>
                            <View style={styles.quickRow}>
                                {[
                                    { label: "Today", value: todayIso },
                                    { label: "Yesterday", value: yesterdayIso },
                                    { label: "2 Days Ago", value: twoDaysAgoIso },
                                ].map((preset) => {
                                    const active = coveredDate === preset.value;
                                    return (
                                        <Pressable
                                            key={preset.label}
                                            onPress={() =>
                                                onChangeCoveredDate(preset.value)
                                            }
                                            style={[
                                                styles.quickDateChip,
                                                active &&
                                                    styles.quickDateChipActive,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.quickDateChipText,
                                                    active &&
                                                        styles.quickDateChipTextActive,
                                                ]}
                                            >
                                                {preset.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <View style={styles.dateStepperRow}>
                                <Pressable
                                    onPress={() =>
                                        onChangeCoveredDate(
                                            shiftIsoDate(coveredDate, -1),
                                        )
                                    }
                                    style={styles.stepperBtn}
                                >
                                    <Ionicons
                                        name="chevron-back"
                                        size={16}
                                        color={palette.text}
                                    />
                                    <Text style={styles.stepperBtnText}>-1d</Text>
                                </Pressable>

                                <TextInput
                                    style={[styles.textInput, { flex: 1, textAlign: "center" }]}
                                    value={coveredDate}
                                    onChangeText={onChangeCoveredDate}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={palette.muted}
                                />

                                <Pressable
                                    onPress={() =>
                                        onChangeCoveredDate(
                                            shiftIsoDate(coveredDate, 1),
                                        )
                                    }
                                    style={styles.stepperBtn}
                                >
                                    <Text style={styles.stepperBtnText}>+1d</Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color={palette.text}
                                    />
                                </Pressable>
                            </View>
                        </View>

                        {/* Lecture Title */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>
                                LECTURE TITLE (OPTIONAL)
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                value={lectureTitle}
                                onChangeText={onChangeLectureTitle}
                                placeholder="e.g., Lecture 14 — Deadlock Avoidance & Banker's Algorithm"
                                placeholderTextColor={palette.muted}
                            />
                        </View>

                        {/* Notes */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>
                                CLASSROOM NOTES / EXAM HINT (OPTIONAL)
                            </Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                value={notes}
                                onChangeText={onChangeNotes}
                                placeholder="e.g., Professor emphasized numericals on safe sequence for Quiz 2"
                                placeholderTextColor={palette.muted}
                                multiline
                            />
                        </View>

                        {/* Selected Topics Preview */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>
                                SELECTED TOPICS ({selectedTopics.length})
                            </Text>
                            <View style={styles.previewBox}>
                                {selectedTopics.slice(0, 8).map((t) => (
                                    <View
                                        key={t.topicId}
                                        style={styles.previewTopicRow}
                                    >
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={14}
                                            color={palette.purpleLight}
                                        />
                                        <Text
                                            style={styles.previewTopicName}
                                            numberOfLines={1}
                                        >
                                            {t.topicName}
                                        </Text>
                                        <Text
                                            style={styles.previewChapterTag}
                                            numberOfLines={1}
                                        >
                                            {t.chapterName}
                                        </Text>
                                    </View>
                                ))}
                                {selectedTopics.length > 8 && (
                                    <Text style={styles.moreTopicsHint}>
                                        +{selectedTopics.length - 8} more topics
                                        included
                                    </Text>
                                )}
                            </View>
                        </View>

                        {submitError && (
                            <View style={styles.errorBanner}>
                                <Ionicons
                                    name="alert-circle"
                                    size={16}
                                    color={palette.danger}
                                />
                                <Text style={styles.errorBannerText}>
                                    {submitError}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <Pressable
                            onPress={onClose}
                            style={styles.secondaryBtn}
                            disabled={submitting}
                        >
                            <Text style={styles.secondaryBtnText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={onSubmit}
                            style={[
                                styles.primaryBtn,
                                submitting && { opacity: 0.6 },
                            ]}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons
                                        name="checkmark-done"
                                        size={16}
                                        color="#FFF"
                                    />
                                    <Text style={styles.primaryBtnText}>
                                        Save Coverage Record
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

/* ============================================================================
 * 2. HISTORICAL AS-OF DATE RECONSTRUCTION MODAL
 * ========================================================================== */

export function AsOfDateModal({
    visible,
    onClose,
    asOfInput,
    onChangeAsOfInput,
    activeAsOfDate,
    onApplyDate,
    onResetToPresent,
    timelineDates,
    todayIso,
    yesterdayIso,
}: {
    visible: boolean;
    onClose: () => void;
    asOfInput: string;
    onChangeAsOfInput: (d: string) => void;
    activeAsOfDate: string | null;
    onApplyDate: (date: string) => void;
    onResetToPresent: () => void;
    timelineDates: { date: string; topicsCount: number; lecturesCount: number }[];
    todayIso: string;
    yesterdayIso: string;
}) {
    const palette = useTrackerPalette();
    const styles = useMemo(() => makeStyles(palette), [palette]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.modalOverlay}
            >
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderLeft}>
                            <View
                                style={[
                                    styles.modalIconBadge,
                                    {
                                        backgroundColor: palette.amberGlow,
                                        borderColor: palette.amberBorder,
                                    },
                                ]}
                            >
                                <Ionicons
                                    name="time-outline"
                                    size={18}
                                    color={palette.amber}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    Quiz Cutoff & Time-Travel View
                                </Text>
                                <Text style={styles.modalSubTitle}>
                                    Reconstruct exact syllabus state on or before
                                    any date
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={onClose}
                            hitSlop={10}
                            style={styles.closeIconBtn}
                        >
                            <Ionicons
                                name="close"
                                size={20}
                                color={palette.textSecondary}
                            />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={{ maxHeight: 400 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ gap: 14 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>
                                ENTER CUTOFF DATE (YYYY-MM-DD)
                            </Text>
                            <View style={styles.dateStepperRow}>
                                <Pressable
                                    onPress={() =>
                                        onChangeAsOfInput(
                                            shiftIsoDate(
                                                asOfInput || todayIso,
                                                -1,
                                            ),
                                        )
                                    }
                                    style={styles.stepperBtn}
                                >
                                    <Ionicons
                                        name="chevron-back"
                                        size={16}
                                        color={palette.text}
                                    />
                                    <Text style={styles.stepperBtnText}>-1d</Text>
                                </Pressable>
                                <TextInput
                                    style={[
                                        styles.textInput,
                                        { flex: 1, textAlign: "center" },
                                    ]}
                                    value={asOfInput}
                                    onChangeText={onChangeAsOfInput}
                                    placeholder="e.g. 2026-10-29"
                                    placeholderTextColor={palette.muted}
                                />
                                <Pressable
                                    onPress={() =>
                                        onChangeAsOfInput(
                                            shiftIsoDate(
                                                asOfInput || todayIso,
                                                1,
                                            ),
                                        )
                                    }
                                    style={styles.stepperBtn}
                                >
                                    <Text style={styles.stepperBtnText}>+1d</Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color={palette.text}
                                    />
                                </Pressable>
                            </View>

                            <View style={styles.quickRow}>
                                {[
                                    { label: "Today", value: todayIso },
                                    { label: "Yesterday", value: yesterdayIso },
                                    {
                                        label: "7 Days Ago",
                                        value: shiftIsoDate(todayIso, -7),
                                    },
                                ].map((preset) => (
                                    <Pressable
                                        key={preset.label}
                                        onPress={() =>
                                            onChangeAsOfInput(preset.value)
                                        }
                                        style={[
                                            styles.quickDateChip,
                                            asOfInput === preset.value &&
                                                styles.quickDateChipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.quickDateChipText,
                                                asOfInput === preset.value &&
                                                    styles.quickDateChipTextActive,
                                            ]}
                                        >
                                            {preset.label} ({preset.value})
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {timelineDates.length > 0 && (
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>
                                    OR PICK A RECORDED LECTURE DATE
                                </Text>
                                <View style={styles.recordedDatesGrid}>
                                    {timelineDates.map((d) => {
                                        const selected = asOfInput === d.date;
                                        return (
                                            <Pressable
                                                key={d.date}
                                                onPress={() => {
                                                    onChangeAsOfInput(d.date);
                                                    onApplyDate(d.date);
                                                }}
                                                style={[
                                                    styles.recordedDateCard,
                                                    selected &&
                                                        styles.recordedDateCardActive,
                                                ]}
                                            >
                                                <View
                                                    style={{
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        gap: 6,
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="calendar"
                                                        size={13}
                                                        color={
                                                            selected
                                                                ? palette.amber
                                                                : palette.purpleLight
                                                        }
                                                    />
                                                    <Text
                                                        style={
                                                            styles.recordedDateTitle
                                                        }
                                                    >
                                                        {formatReadableDate(
                                                            d.date,
                                                        )}
                                                    </Text>
                                                </View>
                                                <Text
                                                    style={styles.recordedDateMeta}
                                                >
                                                    {d.topicsCount} topics •{" "}
                                                    {d.lecturesCount} session
                                                    {d.lecturesCount === 1
                                                        ? ""
                                                        : "s"}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.modalActions}>
                        {activeAsOfDate && (
                            <Pressable
                                onPress={onResetToPresent}
                                style={styles.secondaryBtn}
                            >
                                <Text style={styles.secondaryBtnText}>
                                    Return to Present
                                </Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={() => {
                                const trimmed = asOfInput.trim();
                                if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                                    onApplyDate(trimmed);
                                }
                            }}
                            style={[
                                styles.primaryBtn,
                                { backgroundColor: palette.amber },
                            ]}
                        >
                            <Ionicons name="sparkles" size={15} color="#000" />
                            <Text
                                style={[
                                    styles.primaryBtnText,
                                    { color: "#0B0C10" },
                                ]}
                            >
                                View Syllabus As Of Date
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

/* ============================================================================
 * 3. COVERAGE EVENT DETAIL MODAL
 * ========================================================================== */

export function EventDetailModal({
    event,
    onClose,
    onEditEvent,
    onDeleteEvent,
    onJumpToChapter,
}: {
    event: SyllabusCoverageEvent | null;
    onClose: () => void;
    onEditEvent: (ev: SyllabusCoverageEvent) => void;
    onDeleteEvent: (eventId: number) => void;
    onJumpToChapter: (chapterId: number) => void;
}) {
    const palette = useTrackerPalette();
    const styles = useMemo(() => makeStyles(palette), [palette]);

    return (
        <Modal
            visible={!!event}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                {event && (
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={styles.modalIconBadge}>
                                    <Ionicons
                                        name="document-text-outline"
                                        size={18}
                                        color={palette.purpleLight}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalTitle}>
                                        {event.lectureTitle ||
                                            "Lecture Coverage Session"}
                                    </Text>
                                    <Text style={styles.modalSubTitle}>
                                        Covered on{" "}
                                        {formatReadableDate(event.coveredDate)}
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={onClose}
                                hitSlop={10}
                                style={styles.closeIconBtn}
                            >
                                <Ionicons
                                    name="close"
                                    size={20}
                                    color={palette.textSecondary}
                                />
                            </Pressable>
                        </View>

                        {event.notes ? (
                            <View style={styles.notesBanner}>
                                <Ionicons
                                    name="chatbox-ellipses-outline"
                                    size={15}
                                    color={palette.purpleLight}
                                />
                                <Text style={styles.notesBannerText}>
                                    {event.notes}
                                </Text>
                            </View>
                        ) : null}

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>
                                TOPICS COVERED ({event.topics.length})
                            </Text>
                            <ScrollView
                                style={{ maxHeight: 260 }}
                                contentContainerStyle={{ gap: 6 }}
                            >
                                {event.topics.map((t) => (
                                    <Pressable
                                        key={t.topicId}
                                        onPress={() => {
                                            onClose();
                                            onJumpToChapter(t.chapterId);
                                        }}
                                        style={styles.eventTopicRow}
                                    >
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={16}
                                            color={palette.emerald}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.eventTopicTitle}>
                                                {t.topicName}
                                            </Text>
                                            <Text style={styles.eventTopicChapter}>
                                                {t.chapterNumber
                                                    ? `Ch ${t.chapterNumber}: `
                                                    : ""}
                                                {t.chapterName}
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name="open-outline"
                                            size={14}
                                            color={palette.muted}
                                        />
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.modalActions}>
                            <Pressable
                                onPress={() => {
                                    const id = event.eventId;
                                    onClose();
                                    onDeleteEvent(id);
                                }}
                                style={styles.dangerBtn}
                            >
                                <Ionicons
                                    name="trash-outline"
                                    size={15}
                                    color={palette.danger}
                                />
                                <Text style={styles.dangerBtnText}>Delete</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    onClose();
                                    onEditEvent(event);
                                }}
                                style={styles.secondaryBtn}
                            >
                                <Ionicons
                                    name="create-outline"
                                    size={15}
                                    color={palette.text}
                                />
                                <Text style={styles.secondaryBtnText}>
                                    Edit Session
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

function makeStyles(palette: TrackerPalette) {
    return StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(5, 6, 10, 0.78)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
        },
        modalCard: {
            width: "100%",
            maxWidth: 500,
            backgroundColor: palette.surface,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: palette.borderStrong,
            padding: 18,
            gap: 14,
        },
        modalHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
        },
        modalHeaderLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
        },
        modalIconBadge: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: palette.purpleGlow,
            borderWidth: 1,
            borderColor: palette.purpleBorder,
            alignItems: "center",
            justifyContent: "center",
        },
        modalTitle: {
            fontSize: 16,
            fontWeight: "800",
            color: palette.text,
        },
        modalSubTitle: {
            fontSize: 12,
            color: palette.textSecondary,
            marginTop: 1,
        },
        closeIconBtn: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: palette.surfaceElevated,
            alignItems: "center",
            justifyContent: "center",
        },
        fieldGroup: {
            gap: 6,
        },
        fieldLabel: {
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.8,
            color: palette.muted,
        },
        quickRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
        },
        quickDateChip: {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.border,
        },
        quickDateChipActive: {
            backgroundColor: palette.purpleGlow,
            borderColor: palette.purple,
        },
        quickDateChipText: {
            fontSize: 11,
            fontWeight: "700",
            color: palette.textSecondary,
        },
        quickDateChipTextActive: {
            color: palette.purpleLight,
        },
        dateStepperRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        stepperBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            paddingHorizontal: 10,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.border,
        },
        stepperBtnText: {
            fontSize: 11,
            fontWeight: "700",
            color: palette.text,
        },
        textInput: {
            backgroundColor: palette.bg,
            borderWidth: 1,
            borderColor: palette.borderStrong,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: palette.text,
            fontSize: 13,
            fontWeight: "600",
        },
        textArea: {
            minHeight: 68,
            textAlignVertical: "top",
        },
        previewBox: {
            backgroundColor: palette.bg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 10,
            gap: 6,
        },
        previewTopicRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        previewTopicName: {
            flex: 1,
            fontSize: 12,
            fontWeight: "600",
            color: palette.text,
        },
        previewChapterTag: {
            fontSize: 10,
            fontWeight: "600",
            color: palette.muted,
            maxWidth: 130,
        },
        moreTopicsHint: {
            fontSize: 11,
            fontWeight: "600",
            color: palette.purpleLight,
            marginTop: 2,
        },
        errorBanner: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            padding: 10,
            borderRadius: 10,
            backgroundColor: palette.dangerGlow,
            borderWidth: 1,
            borderColor: palette.danger,
        },
        errorBannerText: {
            flex: 1,
            fontSize: 12,
            color: palette.danger,
            fontWeight: "600",
        },
        modalActions: {
            flexDirection: "row",
            justifyContent: "flex-end",
            flexWrap: "wrap",
            gap: 8,
            paddingTop: 4,
        },
        primaryBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: palette.purple,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
        },
        primaryBtnText: {
            fontSize: 13,
            fontWeight: "800",
            color: "#FFFFFF",
        },
        secondaryBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.borderStrong,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
        },
        secondaryBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: palette.text,
        },
        dangerBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: palette.dangerGlow,
            borderWidth: 1,
            borderColor: palette.danger,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
            marginRight: "auto",
        },
        dangerBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: palette.danger,
        },
        recordedDatesGrid: {
            gap: 6,
        },
        recordedDateCard: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 10,
            borderRadius: 10,
            backgroundColor: palette.bg,
            borderWidth: 1,
            borderColor: palette.border,
        },
        recordedDateCardActive: {
            borderColor: palette.amber,
            backgroundColor: palette.amberGlow,
        },
        recordedDateTitle: {
            fontSize: 12,
            fontWeight: "700",
            color: palette.text,
        },
        recordedDateMeta: {
            fontSize: 11,
            color: palette.textSecondary,
            fontWeight: "600",
        },
        notesBanner: {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
            padding: 10,
            borderRadius: 10,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.border,
        },
        notesBannerText: {
            flex: 1,
            fontSize: 12,
            color: palette.text,
            lineHeight: 17,
        },
        eventTopicRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 10,
            borderRadius: 10,
            backgroundColor: palette.bg,
            borderWidth: 1,
            borderColor: palette.border,
        },
        eventTopicTitle: {
            fontSize: 13,
            fontWeight: "700",
            color: palette.text,
        },
        eventTopicChapter: {
            fontSize: 11,
            color: palette.muted,
            marginTop: 1,
        },
    });
}
