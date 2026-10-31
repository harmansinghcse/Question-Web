import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
    formatCalendarDate,
    getLocalDateString,
    isValidDateString,
    shiftDateString,
    type CoverageEventItem,
    type TrackerChapter,
} from "../../services/syllabus-tracker-api";
import { TRACKER_PALETTE } from "./TrackerVisuals";

export interface SelectedTopicGroup {
    chapterId: number;
    chapterNo: number;
    chapterName: string;
    topics: { topicId: number; topicName: string; alreadyCovered: boolean }[];
}

/**
 * Sheet/Modal for recording a new lecture's coverage OR editing an existing
 * historical CoverageEvent. Never fakes success on failure and prevents
 * duplicate submissions while in-flight.
 */
export function RecordCoverageModal({
    visible,
    editingEvent,
    subjectLabel,
    chapters,
    selectedTopicIds,
    onToggleTopic,
    onClose,
    onSubmit,
}: {
    visible: boolean;
    editingEvent: CoverageEventItem | null;
    subjectLabel: string;
    chapters: TrackerChapter[];
    selectedTopicIds: Set<number>;
    onToggleTopic: (topicId: number) => void;
    onClose: () => void;
    onSubmit: (payload: {
        coverageDate: string;
        notes: string;
        topicIds: number[];
        editingEventId?: number;
    }) => Promise<void>;
}) {
    const todayStr = useMemo(() => getLocalDateString(), []);
    const [coverageDate, setCoverageDate] = useState(todayStr);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const modalSyncKey = visible
        ? `open:${editingEvent?.eventId ?? "new"}`
        : "closed";
    const [prevModalSyncKey, setPrevModalSyncKey] = useState(modalSyncKey);
    if (modalSyncKey !== prevModalSyncKey) {
        setPrevModalSyncKey(modalSyncKey);
        if (visible) {
            setError(null);
            setSaving(false);
            if (editingEvent) {
                setCoverageDate(editingEvent.coverageDate);
                setNotes(editingEvent.notes ?? "");
            } else {
                setCoverageDate(getLocalDateString());
                setNotes("");
            }
        }
    }

    const groupedSelection = useMemo<SelectedTopicGroup[]>(() => {
        const groups: SelectedTopicGroup[] = [];
        for (const ch of chapters) {
            const picked = ch.topics
                .filter((t) => selectedTopicIds.has(t.topicId))
                .map((t) => ({
                    topicId: t.topicId,
                    topicName: t.topicName,
                    alreadyCovered: t.covered,
                }));
            if (picked.length > 0) {
                groups.push({
                    chapterId: ch.chapterId,
                    chapterNo: ch.chapterNo,
                    chapterName: ch.chapterName,
                    topics: picked,
                });
            }
        }
        return groups;
    }, [chapters, selectedTopicIds]);

    const totalSelected = selectedTopicIds.size;

    const handleSave = async () => {
        if (saving) return;
        const trimmedDate = coverageDate.trim();
        if (!isValidDateString(trimmedDate)) {
            setError("Enter a valid date in YYYY-MM-DD format (e.g. 2026-10-29).");
            return;
        }
        if (trimmedDate > getLocalDateString()) {
            setError("Coverage date cannot be in the future.");
            return;
        }
        if (totalSelected === 0) {
            setError("Select at least one topic to record.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await onSubmit({
                coverageDate: trimmedDate,
                notes: notes.trim(),
                topicIds: Array.from(selectedTopicIds),
                editingEventId: editingEvent?.eventId,
            });
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to save coverage record. Please retry.",
            );
        } finally {
            setSaving(false);
        }
    };

    const yesterday = shiftDateString(todayStr, -1);
    const twoDaysAgo = shiftDateString(todayStr, -2);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={() => {
                if (!saving) onClose();
            }}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.eyebrow}>
                                {editingEvent
                                    ? `EDITING EVENT #${editingEvent.eventId}`
                                    : "NEW COVERAGE RECORD"}
                            </Text>
                            <Text style={styles.sheetTitle} numberOfLines={1}>
                                {editingEvent
                                    ? "Update Lecture Session"
                                    : "Record Lecture Coverage"}
                            </Text>
                            <Text style={styles.sheetSub} numberOfLines={1}>
                                {subjectLabel} • {totalSelected}{" "}
                                {totalSelected === 1 ? "topic" : "topics"} across{" "}
                                {groupedSelection.length}{" "}
                                {groupedSelection.length === 1 ? "chapter" : "chapters"}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => !saving && onClose()}
                            style={styles.iconBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Close modal"
                        >
                            <Ionicons name="close" size={18} color={TRACKER_PALETTE.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={styles.sheetScroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Date Selector */}
                        <Text style={styles.fieldLabel}>COVERAGE DATE (YYYY-MM-DD)</Text>
                        <View style={styles.dateInputRow}>
                            <Pressable
                                onPress={() =>
                                    setCoverageDate((prev) =>
                                        shiftDateString(
                                            isValidDateString(prev) ? prev : todayStr,
                                            -1,
                                        ),
                                    )
                                }
                                style={styles.dateStepBtn}
                                accessibilityLabel="Previous day"
                            >
                                <Ionicons name="chevron-back" size={16} color={TRACKER_PALETTE.text} />
                            </Pressable>
                            <TextInput
                                value={coverageDate}
                                onChangeText={setCoverageDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={TRACKER_PALETTE.muted}
                                style={styles.dateTextInput}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <Pressable
                                onPress={() => {
                                    const next = shiftDateString(
                                        isValidDateString(coverageDate)
                                            ? coverageDate
                                            : todayStr,
                                        1,
                                    );
                                    if (next <= todayStr) setCoverageDate(next);
                                }}
                                style={[
                                    styles.dateStepBtn,
                                    coverageDate >= todayStr && { opacity: 0.4 },
                                ]}
                                disabled={coverageDate >= todayStr}
                                accessibilityLabel="Next day"
                            >
                                <Ionicons name="chevron-forward" size={16} color={TRACKER_PALETTE.text} />
                            </Pressable>
                        </View>

                        <View style={styles.quickDatesRow}>
                            {[
                                { label: "Today", value: todayStr },
                                { label: "Yesterday", value: yesterday },
                                { label: "2 days ago", value: twoDaysAgo },
                            ].map((preset) => {
                                const active = coverageDate === preset.value;
                                return (
                                    <Pressable
                                        key={preset.label}
                                        onPress={() => setCoverageDate(preset.value)}
                                        style={[
                                            styles.quickChip,
                                            active && styles.quickChipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.quickChipText,
                                                active && styles.quickChipTextActive,
                                            ]}
                                        >
                                            {`${preset.label} (${formatCalendarDate(preset.value, false)})`}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Optional Notes */}
                        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                            LECTURE NOTE (OPTIONAL)
                        </Text>
                        <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="e.g. Professor finished joins; covered examples for Quiz 2..."
                            placeholderTextColor={TRACKER_PALETTE.muted}
                            style={styles.notesInput}
                            multiline
                            maxLength={500}
                        />

                        {/* Selected Topics Grouped by Chapter */}
                        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                            SELECTED TOPICS ({totalSelected})
                        </Text>
                        {groupedSelection.length === 0 ? (
                            <Text style={styles.emptyTopicsHint}>
                                No topics selected. Close this sheet and pick at least one topic.
                            </Text>
                        ) : (
                            <View style={styles.groupList}>
                                {groupedSelection.map((group) => (
                                    <View key={group.chapterId} style={styles.groupCard}>
                                        <Text style={styles.groupTitle}>
                                            {`Ch ${group.chapterNo}: ${group.chapterName}`}
                                        </Text>
                                        {group.topics.map((t) => (
                                            <View key={t.topicId} style={styles.groupTopicRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.groupTopicName}>
                                                        {t.topicName}
                                                    </Text>
                                                    {t.alreadyCovered && !editingEvent && (
                                                        <Text style={styles.revisitHint}>
                                                            Previously covered — will record as revisit without overwriting earlier date
                                                        </Text>
                                                    )}
                                                </View>
                                                <Pressable
                                                    onPress={() => onToggleTopic(t.topicId)}
                                                    hitSlop={8}
                                                    style={styles.removeTopicBtn}
                                                >
                                                    <Ionicons
                                                        name="close-circle"
                                                        size={18}
                                                        color={TRACKER_PALETTE.muted}
                                                    />
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        )}

                        {error && (
                            <View style={styles.errorBanner}>
                                <Ionicons
                                    name="alert-circle"
                                    size={16}
                                    color={TRACKER_PALETTE.purple}
                                />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footerRow}>
                        <Pressable
                            onPress={onClose}
                            disabled={saving}
                            style={styles.cancelBtn}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => void handleSave()}
                            disabled={saving || totalSelected === 0}
                            style={[
                                styles.saveBtn,
                                (saving || totalSelected === 0) && { opacity: 0.55 },
                            ]}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                                    <Text style={styles.saveBtnText}>
                                        {editingEvent ? "Save Changes" : "Save Coverage"}
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/**
 * Historical "Syllabus as of Date" picker modal for reconstructing coverage
 * on or before a quiz/exam cutoff date.
 */
export function AsOfDateModal({
    visible,
    currentAsOf,
    recordedDates,
    onApply,
    onReset,
    onClose,
}: {
    visible: boolean;
    currentAsOf: string | null;
    recordedDates: string[];
    onApply: (date: string) => void;
    onReset: () => void;
    onClose: () => void;
}) {
    const todayStr = useMemo(() => getLocalDateString(), []);
    const [draftDate, setDraftDate] = useState(currentAsOf ?? todayStr);
    const [error, setError] = useState<string | null>(null);

    const asOfSyncKey = visible ? `open:${currentAsOf ?? "live"}` : "closed";
    const [prevAsOfSyncKey, setPrevAsOfSyncKey] = useState(asOfSyncKey);
    if (asOfSyncKey !== prevAsOfSyncKey) {
        setPrevAsOfSyncKey(asOfSyncKey);
        if (visible) {
            setDraftDate(currentAsOf ?? getLocalDateString());
            setError(null);
        }
    }

    const handleConfirm = () => {
        const trimmed = draftDate.trim();
        if (!isValidDateString(trimmed)) {
            setError("Enter a valid cutoff date in YYYY-MM-DD format.");
            return;
        }
        onApply(trimmed);
        onClose();
    };

    const uniqueRecordedDates = useMemo(
        () => Array.from(new Set(recordedDates)).slice(0, 8),
        [recordedDates],
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlayCenter}>
                <View style={styles.dialog}>
                    <View style={styles.sheetHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.eyebrow}>HISTORICAL CUTOFF</Text>
                            <Text style={styles.sheetTitle}>View Syllabus as of Date</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.iconBtn}>
                            <Ionicons name="close" size={18} color={TRACKER_PALETTE.textSecondary} />
                        </Pressable>
                    </View>

                    <Text style={styles.helperParagraph}>
                        Reconstructs your recorded syllabus coverage on or before the chosen cutoff date (e.g. for a quiz portion). Sessions dated after this cutoff are excluded.
                    </Text>

                    <Text style={styles.fieldLabel}>CUTOFF DATE (YYYY-MM-DD)</Text>
                    <View style={styles.dateInputRow}>
                        <Pressable
                            onPress={() =>
                                setDraftDate((prev) =>
                                    shiftDateString(
                                        isValidDateString(prev) ? prev : todayStr,
                                        -1,
                                    ),
                                )
                            }
                            style={styles.dateStepBtn}
                        >
                            <Ionicons name="chevron-back" size={16} color={TRACKER_PALETTE.text} />
                        </Pressable>
                        <TextInput
                            value={draftDate}
                            onChangeText={setDraftDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={TRACKER_PALETTE.muted}
                            style={styles.dateTextInput}
                            autoCapitalize="none"
                        />
                        <Pressable
                            onPress={() =>
                                setDraftDate((prev) =>
                                    shiftDateString(
                                        isValidDateString(prev) ? prev : todayStr,
                                        1,
                                    ),
                                )
                            }
                            style={styles.dateStepBtn}
                        >
                            <Ionicons name="chevron-forward" size={16} color={TRACKER_PALETTE.text} />
                        </Pressable>
                    </View>

                    {uniqueRecordedDates.length > 0 && (
                        <>
                            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                                RECORDED LECTURE DATES
                            </Text>
                            <View style={styles.quickDatesRow}>
                                {uniqueRecordedDates.map((d) => {
                                    const active = draftDate === d;
                                    return (
                                        <Pressable
                                            key={d}
                                            onPress={() => setDraftDate(d)}
                                            style={[
                                                styles.quickChip,
                                                active && styles.quickChipActive,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.quickChipText,
                                                    active && styles.quickChipTextActive,
                                                ]}
                                            >
                                                {formatCalendarDate(d)}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {error && (
                        <View style={styles.errorBanner}>
                            <Ionicons
                                name="alert-circle"
                                size={16}
                                color={TRACKER_PALETTE.purple}
                            />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <View style={[styles.footerRow, { marginTop: 16 }]}>
                        {currentAsOf && (
                            <Pressable
                                onPress={() => {
                                    onReset();
                                    onClose();
                                }}
                                style={styles.cancelBtn}
                            >
                                <Text style={styles.cancelBtnText}>Live View</Text>
                            </Pressable>
                        )}
                        <Pressable onPress={handleConfirm} style={styles.saveBtn}>
                            <Ionicons name="calendar" size={15} color="#FFFFFF" />
                            <Text style={styles.saveBtnText}>Apply Cutoff</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/**
 * Inspects a single CoverageEvent, with explicit Edit and Delete confirmation.
 */
export function EventDetailModal({
    event,
    deleting,
    error,
    onEdit,
    onConfirmDelete,
    onClose,
}: {
    event: CoverageEventItem | null;
    deleting: boolean;
    error: string | null;
    onEdit: (event: CoverageEventItem) => void;
    onConfirmDelete: (eventId: number) => void;
    onClose: () => void;
}) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const eventSyncKey = event?.eventId ?? null;
    const [prevEventSyncKey, setPrevEventSyncKey] = useState<number | null>(
        eventSyncKey,
    );
    if (eventSyncKey !== prevEventSyncKey) {
        setPrevEventSyncKey(eventSyncKey);
        setConfirmingDelete(false);
    }

    const groupedTopics = useMemo(() => {
        if (!event) return [];
        const byCh = new Map<
            number,
            { chapterNo: number; chapterName: string; topics: string[] }
        >();
        for (const t of event.topics) {
            const entry = byCh.get(t.chapterId) ?? {
                chapterNo: t.chapterNo,
                chapterName: t.chapterName,
                topics: [],
            };
            entry.topics.push(t.topicName);
            byCh.set(t.chapterId, entry);
        }
        return Array.from(byCh.values()).sort((a, b) => a.chapterNo - b.chapterNo);
    }, [event]);

    if (!event) return null;

    return (
        <Modal
            visible={!!event}
            transparent
            animationType="fade"
            onRequestClose={() => !deleting && onClose()}
        >
            <View style={styles.overlayCenter}>
                <View style={styles.dialog}>
                    <View style={styles.sheetHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.eyebrow}>
                                SESSION #{event.eventId} • {event.topics.length} TOPICS
                            </Text>
                            <Text style={styles.sheetTitle}>
                                {formatCalendarDate(event.coverageDate)}
                            </Text>
                            <Text style={styles.sheetSub}>
                                Logged {new Date(event.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => !deleting && onClose()}
                            style={styles.iconBtn}
                        >
                            <Ionicons name="close" size={18} color={TRACKER_PALETTE.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                        {!!event.notes && (
                            <View style={styles.noteBox}>
                                <Ionicons
                                    name="document-text-outline"
                                    size={15}
                                    color={TRACKER_PALETTE.amber}
                                />
                                <Text style={styles.noteText}>{event.notes}</Text>
                            </View>
                        )}

                        <View style={styles.groupList}>
                            {groupedTopics.map((g) => (
                                <View key={g.chapterNo} style={styles.groupCard}>
                                    <Text style={styles.groupTitle}>
                                        {`Ch ${g.chapterNo}: ${g.chapterName}`}
                                    </Text>
                                    {g.topics.map((name, idx) => (
                                        <View key={idx} style={styles.bulletRow}>
                                            <View style={styles.bulletDot} />
                                            <Text style={styles.groupTopicName}>{name}</Text>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>

                        {confirmingDelete && (
                            <View style={styles.deleteConfirmBox}>
                                <Text style={styles.deleteConfirmTitle}>
                                    Delete coverage event from{" "}
                                    {formatCalendarDate(event.coverageDate)}?
                                </Text>
                                <Text style={styles.deleteConfirmBody}>
                                    This removes only this coverage session ({event.topics.length}{" "}
                                    {event.topics.length === 1 ? "topic" : "topics"}). Academic chapters/topics and other sessions remain intact, and progress will recalculate immediately.
                                </Text>
                            </View>
                        )}

                        {error && (
                            <View style={styles.errorBanner}>
                                <Ionicons
                                    name="alert-circle"
                                    size={16}
                                    color={TRACKER_PALETTE.purple}
                                />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={[styles.footerRow, { marginTop: 14 }]}>
                        {confirmingDelete ? (
                            <>
                                <Pressable
                                    onPress={() => setConfirmingDelete(false)}
                                    disabled={deleting}
                                    style={styles.cancelBtn}
                                >
                                    <Text style={styles.cancelBtnText}>Keep Event</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => onConfirmDelete(event.eventId)}
                                    disabled={deleting}
                                    style={styles.saveBtn}
                                >
                                    {deleting ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="trash" size={15} color="#FFFFFF" />
                                            <Text style={styles.saveBtnText}>Confirm Delete</Text>
                                        </>
                                    )}
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <Pressable
                                    onPress={() => setConfirmingDelete(true)}
                                    style={styles.dangerOutlineBtn}
                                >
                                    <Ionicons
                                        name="trash-outline"
                                        size={15}
                                        color={TRACKER_PALETTE.purple}
                                    />
                                    <Text style={styles.dangerOutlineText}>Delete</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => onEdit(event)}
                                    style={styles.saveBtn}
                                >
                                    <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                                    <Text style={styles.saveBtnText}>Edit Session</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.76)",
        justifyContent: "flex-end",
    },
    overlayCenter: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        justifyContent: "center",
        alignItems: "center",
        padding: 18,
    },
    sheet: {
        backgroundColor: TRACKER_PALETTE.surface,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.borderStrong,
        padding: 18,
        maxHeight: "88%",
        width: "100%",
        maxWidth: 680,
        alignSelf: "center",
    },
    dialog: {
        backgroundColor: TRACKER_PALETTE.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.borderStrong,
        padding: 18,
        width: "100%",
        maxWidth: 480,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
    },
    eyebrow: {
        color: TRACKER_PALETTE.purple,
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.9,
    },
    sheetTitle: {
        color: TRACKER_PALETTE.text,
        fontSize: 18,
        fontWeight: "800",
        marginTop: 2,
    },
    sheetSub: {
        color: TRACKER_PALETTE.muted,
        fontSize: 12,
        marginTop: 2,
    },
    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: TRACKER_PALETTE.surfaceMuted,
        alignItems: "center",
        justifyContent: "center",
    },
    sheetScroll: {
        maxHeight: 440,
    },
    helperParagraph: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 12,
    },
    fieldLabel: {
        color: TRACKER_PALETTE.muted,
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    dateInputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dateStepBtn: {
        width: 38,
        height: 40,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        alignItems: "center",
        justifyContent: "center",
    },
    dateTextInput: {
        flex: 1,
        height: 40,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.borderStrong,
        paddingHorizontal: 12,
        color: TRACKER_PALETTE.text,
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center",
    },
    quickDatesRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 8,
    },
    quickChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
    },
    quickChipActive: {
        backgroundColor: TRACKER_PALETTE.purpleGlow,
        borderColor: TRACKER_PALETTE.purpleBorder,
    },
    quickChipText: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
        fontWeight: "600",
    },
    quickChipTextActive: {
        color: TRACKER_PALETTE.purple,
        fontWeight: "700",
    },
    notesInput: {
        minHeight: 68,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: TRACKER_PALETTE.text,
        fontSize: 13,
        textAlignVertical: "top",
    },
    emptyTopicsHint: {
        color: TRACKER_PALETTE.muted,
        fontSize: 12,
        paddingVertical: 12,
    },
    groupList: {
        gap: 8,
    },
    groupCard: {
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        padding: 10,
        gap: 6,
    },
    groupTitle: {
        color: TRACKER_PALETTE.purple,
        fontSize: 11,
        fontWeight: "700",
    },
    groupTopicRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 3,
    },
    groupTopicName: {
        color: TRACKER_PALETTE.text,
        fontSize: 13,
        fontWeight: "500",
        flex: 1,
    },
    revisitHint: {
        color: TRACKER_PALETTE.amber,
        fontSize: 10,
        marginTop: 1,
    },
    removeTopicBtn: {
        padding: 2,
    },
    bulletRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 2,
    },
    bulletDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: TRACKER_PALETTE.emerald,
    },
    noteBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        padding: 10,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.amberSoft,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.amberBorder,
        marginBottom: 10,
    },
    noteText: {
        color: TRACKER_PALETTE.text,
        fontSize: 12,
        lineHeight: 17,
        flex: 1,
    },
    deleteConfirmBox: {
        marginTop: 10,
        padding: 12,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.purpleGlow,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.purpleBorder,
        gap: 4,
    },
    deleteConfirmTitle: {
        color: TRACKER_PALETTE.text,
        fontSize: 13,
        fontWeight: "700",
    },
    deleteConfirmBody: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
        lineHeight: 16,
    },
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 12,
        padding: 10,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.purpleGlow,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.purpleBorder,
    },
    errorText: {
        color: TRACKER_PALETTE.text,
        fontSize: 12,
        flex: 1,
    },
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 14,
    },
    cancelBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: TRACKER_PALETTE.surfaceMuted,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelBtnText: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 13,
        fontWeight: "700",
    },
    dangerOutlineBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: TRACKER_PALETTE.purpleGlow,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.purpleBorder,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    dangerOutlineText: {
        color: TRACKER_PALETTE.purple,
        fontSize: 13,
        fontWeight: "700",
    },
    saveBtn: {
        flex: 1.4,
        height: 44,
        borderRadius: 12,
        backgroundColor: TRACKER_PALETTE.purple,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    saveBtnText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "800",
    },
});
