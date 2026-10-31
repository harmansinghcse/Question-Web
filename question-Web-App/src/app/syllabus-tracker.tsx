/**
 * Dedicated Syllabus Tracker Screen (`src/app/syllabus-tracker.tsx`).
 *
 * Distinct from the Syllabus Viewer (`src/app/syllabus.tsx`):
 * - Uses the connected-web academic palette (reactive across Dark Mode & Light Mode)
 * - Records dated lecture coverage events per topic
 * - Reconstructs exact historical syllabus state as of any date ("What was covered by Oct 29?")
 * - Visualizes subject & chapter progress, chronological lecture timeline, and velocity analytics
 * - Supports editing and deleting historical coverage records
 * - Integrates directly with Question Bank and Quiz Revision for covered topics
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AppShell, { useLayout } from "../components/AppShell";
import { useAuth } from "../providers/AuthProvider";
import {
    api,
    type Subject,
    type SyllabusCoverageEvent,
    type SyllabusTrackerOverviewItem,
    type SyllabusTrackerSubjectDetail,
} from "../services/api";
import {
    parseStudentEmail,
    sortSubjects,
    subjectDisplayName,
} from "../constants/subjects";
import {
    AnimatedCoverageBar,
    ChapterStatusNode,
    CoverageOrbitDial,
    KnowledgeWebMotif,
    type TrackerPalette,
    useTrackerPalette,
    WeeklyActivityCard,
} from "../components/syllabus-tracker/TrackerVisuals";
import {
    AsOfDateModal,
    EventDetailModal,
    RecordCoverageModal,
} from "../components/syllabus-tracker/TrackerModals";

type ActiveTab = "syllabus" | "timeline" | "analytics";
type StatusFilter = "ALL" | "COVERED" | "REMAINING";

function getLocalIsoDate(offsetDays = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function formatCalendarDate(iso: string | null | undefined, includeYear = true): string {
    if (!iso) return "—";
    try {
        const d = new Date(`${iso}T00:00:00`);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            ...(includeYear ? { year: "numeric" } : {}),
        });
    } catch {
        return iso;
    }
}

export default function SyllabusTrackerScreen() {
    const router = useRouter();
    const { isWide } = useLayout();
    const { user, isAuthenticated, isRestoring } = useAuth();
    const palette = useTrackerPalette();
    const styles = useMemo(() => makeStyles(palette), [palette]);

    const todayIso = useMemo(() => getLocalIsoDate(0), []);
    const yesterdayIso = useMemo(() => getLocalIsoDate(-1), []);

    const studentProfile = useMemo(
        () => (user?.email ? parseStudentEmail(user.email) : null),
        [user],
    );

    // ─── Academic Hierarchy & Overview State ─────────────────────────────
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [overviewMap, setOverviewMap] = useState<Map<number, SyllabusTrackerOverviewItem>>(
        new Map(),
    );
    const [semesterFilter, setSemesterFilter] = useState<number | null>(null);
    const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | null>(null);

    // ─── Subject Detail & Historical State ───────────────────────────────
    const [detail, setDetail] = useState<SyllabusTrackerSubjectDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    // Historical "As-Of Date" Cutoff Mode
    const [asOfDate, setAsOfDate] = useState<string | null>(null);
    const [asOfModalOpen, setAsOfModalOpen] = useState(false);
    const [asOfInput, setAsOfInput] = useState<string>(todayIso);

    // ─── Interactive Workspace State ─────────────────────────────────────
    const [activeTab, setActiveTab] = useState<ActiveTab>("syllabus");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
    const [selectedTopicIds, setSelectedTopicIds] = useState<Set<number>>(new Set());

    // ─── Record / Edit Coverage Modal State ──────────────────────────────
    const [recordModalOpen, setRecordModalOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [coveredDateInput, setCoveredDateInput] = useState<string>(todayIso);
    const [lectureTitleInput, setLectureTitleInput] = useState<string>("");
    const [notesInput, setNotesInput] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // ─── Event Inspection Modal ──────────────────────────────────────────
    const [inspectedEvent, setInspectedEvent] = useState<SyllabusCoverageEvent | null>(null);

    // ─── Load Subjects & Tracker Overview ────────────────────────────────
    const loadSubjectsAndOverview = useCallback(async () => {
        try {
            if (isAuthenticated) {
                const overview = await api.getSyllabusTrackerOverview({
                    asOfDate: asOfDate ?? undefined,
                });
                const nextMap = new Map<number, SyllabusTrackerOverviewItem>();
                const scopedSubjects: Subject[] = [];
                for (const item of overview) {
                    nextMap.set(item.subjectKey, item);
                    scopedSubjects.push({
                        subjectKey: item.subjectKey,
                        subjectId: item.subjectId,
                        subjectName: item.subjectName,
                        deptId: item.deptId,
                        credits: item.credits,
                        semester: item.semester ?? 1,
                    });
                }
                setOverviewMap(nextMap);
                if (scopedSubjects.length > 0) {
                    setSubjects(sortSubjects(scopedSubjects));
                    return;
                }
            }

            const subs = await api.getSubjects();
            setSubjects(sortSubjects(subs));
        } catch {
            // Handled per-subject in detail view
        }
    }, [isAuthenticated, asOfDate]);

    useEffect(() => {
        void Promise.resolve().then(() => loadSubjectsAndOverview());
    }, [loadSubjectsAndOverview]);

    const availableSemesters = useMemo(() => {
        const sems = new Set<number>();
        for (const s of subjects) {
            if (typeof s.semester === "number") sems.add(s.semester);
        }
        return Array.from(sems).sort((a, b) => a - b);
    }, [subjects]);

    const visibleSubjects = useMemo(() => {
        if (semesterFilter === null) return subjects;
        return subjects.filter((s) => s.semester === semesterFilter);
    }, [subjects, semesterFilter]);

    const activeSubjectKey = useMemo(() => {
        if (visibleSubjects.length === 0) return null;
        if (
            selectedSubjectKey !== null &&
            visibleSubjects.some((s) => s.subjectKey === selectedSubjectKey)
        ) {
            return selectedSubjectKey;
        }
        return visibleSubjects[0].subjectKey;
    }, [visibleSubjects, selectedSubjectKey]);

    // ─── Load Selected Subject Tracker Detail ────────────────────────────
    const loadSubjectDetail = useCallback(
        async (subjectKey: number, cutoff: string | null) => {
            if (!isAuthenticated) return;
            setLoadingDetail(true);
            setDetailError(null);
            try {
                const res = await api.getSyllabusTrackerSubject(
                    subjectKey,
                    cutoff ?? undefined,
                );
                setDetail(res);
                setExpandedChapters((prev) => {
                    if (prev.size > 0) return prev;
                    const initial = new Set<number>();
                    res.chapters.slice(0, 2).forEach((c) => initial.add(c.chapterId));
                    return initial;
                });
            } catch (err) {
                setDetailError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load syllabus tracker data",
                );
            } finally {
                setLoadingDetail(false);
            }
        },
        [isAuthenticated],
    );

    useEffect(() => {
        if (activeSubjectKey !== null && isAuthenticated) {
            void Promise.resolve().then(() =>
                loadSubjectDetail(activeSubjectKey, asOfDate),
            );
        }
    }, [activeSubjectKey, asOfDate, isAuthenticated, loadSubjectDetail]);

    // ─── Topic Selection Helpers ─────────────────────────────────────────
    const toggleTopicSelection = (topicId: number) => {
        setSelectedTopicIds((prev) => {
            const next = new Set(prev);
            if (next.has(topicId)) next.delete(topicId);
            else next.add(topicId);
            return next;
        });
    };

    const handleBulkChapterSelect = (
        topicIds: number[],
        chapterId: number,
        mode: "select" | "deselect",
    ) => {
        setExpandedChapters((prev) => new Set(prev).add(chapterId));
        setSelectedTopicIds((prev) => {
            const next = new Set(prev);
            for (const id of topicIds) {
                if (mode === "select") next.add(id);
                else next.delete(id);
            }
            return next;
        });
    };

    const selectedTopicsList = useMemo(() => {
        if (!detail) return [];
        const list: { topicId: number; topicName: string; chapterName: string }[] = [];
        for (const ch of detail.chapters) {
            for (const t of ch.topics) {
                if (selectedTopicIds.has(t.topicId)) {
                    list.push({
                        topicId: t.topicId,
                        topicName: t.topicName,
                        chapterName: ch.chapterName,
                    });
                }
            }
        }
        return list;
    }, [detail, selectedTopicIds]);

    // ─── Open Record Coverage Modal (Create or Edit) ─────────────────────
    const openCreateCoverageModal = (presetDate?: string) => {
        setEditingEventId(null);
        setCoveredDateInput(presetDate || asOfDate || todayIso);
        setLectureTitleInput("");
        setNotesInput("");
        setSubmitError(null);
        setRecordModalOpen(true);
    };

    const openEditEventModal = (ev: SyllabusCoverageEvent) => {
        setEditingEventId(ev.eventId);
        setCoveredDateInput(ev.coveredDate);
        setLectureTitleInput(ev.lectureTitle || "");
        setNotesInput(ev.notes || "");
        setSelectedTopicIds(new Set(ev.topics.map((t) => t.topicId)));
        setSubmitError(null);
        setRecordModalOpen(true);
    };

    // ─── Save Coverage Event (Create or Update) ──────────────────────────
    const handleSaveCoverage = async () => {
        if (activeSubjectKey === null || selectedTopicIds.size === 0) return;

        const cleanDate = coveredDateInput.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
            setSubmitError("Please enter a valid date in YYYY-MM-DD format.");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            if (editingEventId !== null) {
                const updated = await api.updateSyllabusCoverageEvent(
                    editingEventId,
                    {
                        coveredDate: cleanDate,
                        topicIds: Array.from(selectedTopicIds),
                        lectureTitle: lectureTitleInput.trim() || undefined,
                        notes: notesInput.trim() || undefined,
                    },
                    asOfDate ?? undefined,
                );
                setDetail(updated);
            } else {
                const created = await api.recordSyllabusCoverage(
                    {
                        subjectKey: activeSubjectKey,
                        coveredDate: cleanDate,
                        topicIds: Array.from(selectedTopicIds),
                        lectureTitle: lectureTitleInput.trim() || undefined,
                        notes: notesInput.trim() || undefined,
                    },
                    asOfDate ?? undefined,
                );
                setDetail(created);
            }

            setRecordModalOpen(false);
            setEditingEventId(null);
            setSelectedTopicIds(new Set());
            void loadSubjectsAndOverview();
        } catch (err) {
            setSubmitError(
                err instanceof Error ? err.message : "Failed to save coverage record",
            );
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Delete Coverage Event ───────────────────────────────────────────
    const handleDeleteEvent = (eventId: number) => {
        const executeDelete = async () => {
            if (activeSubjectKey === null) return;
            try {
                await api.deleteSyllabusCoverageEvent(eventId);
                await loadSubjectDetail(activeSubjectKey, asOfDate);
                await loadSubjectsAndOverview();
            } catch (err) {
                const msg =
                    err instanceof Error
                        ? err.message
                        : "Could not delete coverage record.";
                if (Platform.OS === "web") {
                    window.alert(msg);
                } else {
                    Alert.alert("Error", msg);
                }
            }
        };

        if (Platform.OS === "web") {
            if (
                window.confirm(
                    "Remove this dated lecture coverage record? Historical coverage will be recalculated.",
                )
            ) {
                void executeDelete();
            }
        } else {
            Alert.alert(
                "Delete Coverage Record",
                "Remove this dated lecture coverage record? Historical coverage will be recalculated.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => void executeDelete(),
                    },
                ],
            );
        }
    };

    // ─── Filtered Chapters & Topics ──────────────────────────────────────
    const filteredChapters = useMemo(() => {
        if (!detail) return [];
        const q = searchQuery.trim().toLowerCase();

        return detail.chapters
            .map((ch) => {
                const chapterMatchesQuery =
                    !q || ch.chapterName.toLowerCase().includes(q);
                const visibleTopics = ch.topics.filter((t) => {
                    if (statusFilter === "COVERED" && !t.covered) return false;
                    if (statusFilter === "REMAINING" && t.covered) return false;
                    if (!q) return true;
                    return (
                        chapterMatchesQuery || t.topicName.toLowerCase().includes(q)
                    );
                });
                return { ...ch, visibleTopics };
            })
            .filter((ch) => {
                if (!q && statusFilter === "ALL") return true;
                return ch.visibleTopics.length > 0;
            });
    }, [detail, searchQuery, statusFilter]);

    // ─── Distinct Recorded Dates for Timeline & Cutoff Chips ─────────────
    const timelineDates = useMemo(() => {
        if (!detail) return [];
        const dateMap = new Map<
            string,
            { date: string; topicsCount: number; lecturesCount: number }
        >();
        for (const ev of detail.events) {
            const existing = dateMap.get(ev.coveredDate);
            if (existing) {
                existing.topicsCount += ev.topicsCount;
                existing.lecturesCount += 1;
            } else {
                dateMap.set(ev.coveredDate, {
                    date: ev.coveredDate,
                    topicsCount: ev.topicsCount,
                    lecturesCount: 1,
                });
            }
        }
        return Array.from(dateMap.values()).sort((a, b) =>
            b.date.localeCompare(a.date),
        );
    }, [detail]);

    const groupedEventsByDate = useMemo(() => {
        if (!detail) return [];
        const groups = new Map<string, SyllabusCoverageEvent[]>();
        for (const ev of detail.events) {
            const list = groups.get(ev.coveredDate) ?? [];
            list.push(ev);
            groups.set(ev.coveredDate, list);
        }
        return Array.from(groups.entries()).sort((a, b) =>
            b[0].localeCompare(a[0]),
        );
    }, [detail]);

    // ─── Floating Selection Action Bar ───────────────────────────────────
    const floatingFooter =
        selectedTopicIds.size > 0 ? (
            <View style={styles.floatingBar}>
                <View style={styles.floatingBarLeft}>
                    <View style={styles.floatingCountBadge}>
                        <Text style={styles.floatingCountText}>
                            {selectedTopicIds.size}
                        </Text>
                    </View>
                    <View style={{ flexShrink: 1 }}>
                        <Text style={styles.floatingTitle} numberOfLines={1}>
                            {selectedTopicIds.size === 1
                                ? "1 Topic Selected"
                                : `${selectedTopicIds.size} Topics Selected`}
                        </Text>
                        <Text style={styles.floatingSub} numberOfLines={1}>
                            Ready to log dated lecture coverage
                        </Text>
                    </View>
                </View>

                <View style={styles.floatingActions}>
                    <Pressable
                        onPress={() => setSelectedTopicIds(new Set())}
                        style={styles.floatingClearBtn}
                    >
                        <Text style={styles.floatingClearText}>Clear</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => openCreateCoverageModal(todayIso)}
                        style={styles.floatingRecordBtn}
                    >
                        <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.floatingRecordText}>Record Coverage</Text>
                    </Pressable>
                </View>
            </View>
        ) : undefined;

    // ─── Unauthenticated Guard ───────────────────────────────────────────
    if (!isRestoring && !isAuthenticated) {
        return (
            <AppShell active="tracker">
                <View style={styles.container}>
                    <View style={styles.heroCard}>
                        <KnowledgeWebMotif />
                        <View style={styles.eyebrowRow}>
                            <Ionicons
                                name="git-network-outline"
                                size={14}
                                color={palette.purpleLight}
                            />
                            <Text style={styles.eyebrowText}>
                                ACADEMIC COVERAGE INTELLIGENCE
                            </Text>
                        </View>
                        <Text style={styles.heroTitle}>Syllabus Tracker</Text>
                        <Text style={styles.heroSub}>
                            Track dated classroom progress, reconstruct exact quiz
                            portions as of any date, and measure lecture pace.
                        </Text>
                    </View>

                    <View style={styles.authGateCard}>
                        <View style={styles.authGateIcon}>
                            <Ionicons
                                name="lock-closed-outline"
                                size={28}
                                color={palette.purpleLight}
                            />
                        </View>
                        <Text style={styles.authGateTitle}>
                            Sign in to Track Your Syllabus Coverage
                        </Text>
                        <Text style={styles.authGateSub}>
                            Syllabus Tracker stores your personal dated lecture logs,
                            chapter progress, and historical cutoff snapshots in your
                            student account.
                        </Text>
                        <View style={styles.authGateBtns}>
                            <Pressable
                                onPress={() => router.push("/login" as never)}
                                style={styles.primaryActionBtn}
                            >
                                <Ionicons name="log-in-outline" size={16} color="#FFF" />
                                <Text style={styles.primaryActionBtnText}>Sign In</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => router.push("/syllabus" as never)}
                                style={styles.secondaryActionBtn}
                            >
                                <Text style={styles.secondaryActionBtnText}>
                                    Open Read-Only Syllabus Viewer
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </AppShell>
        );
    }

    return (
        <AppShell active="tracker" floatingFooter={floatingFooter}>
            <View style={styles.container}>
                {/* ─── 1. HERO HEADER WITH CONNECTED-WEB MOTIF ──────────────── */}
                <View style={styles.heroCard}>
                    <KnowledgeWebMotif />
                    <View style={styles.heroTopRow}>
                        <View style={{ flex: 1, gap: 4 }}>
                            <View style={styles.eyebrowRow}>
                                <Ionicons
                                    name="git-network-outline"
                                    size={14}
                                    color={palette.purpleLight}
                                />
                                <Text style={styles.eyebrowText}>
                                    DATED LECTURE & QUIZ PORTION TRACKER
                                </Text>
                            </View>
                            <Text style={styles.heroTitle}>Syllabus Tracker</Text>
                            <Text style={styles.heroSub}>
                                Record what the professor covered on each date and
                                reconstruct exact syllabus portions for quizzes & exams.
                            </Text>
                        </View>

                        <Pressable
                            onPress={() => router.push("/syllabus" as never)}
                            style={styles.viewerLinkChip}
                        >
                            <Ionicons
                                name="book-outline"
                                size={13}
                                color={palette.textSecondary}
                            />
                            <Text style={styles.viewerLinkText}>Syllabus Viewer</Text>
                        </Pressable>
                    </View>

                    {/* ─── HISTORICAL CUTOFF CONTROL BAR ────────────────────── */}
                    <View
                        style={[
                            styles.cutoffBar,
                            asOfDate !== null && styles.cutoffBarHistorical,
                        ]}
                    >
                        <View style={styles.cutoffLeft}>
                            <View
                                style={[
                                    styles.cutoffIconWrap,
                                    asOfDate !== null && {
                                        backgroundColor: palette.amberGlow,
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={
                                        asOfDate !== null
                                            ? "time"
                                            : "calendar-clear-outline"
                                    }
                                    size={16}
                                    color={
                                        asOfDate !== null
                                            ? palette.amber
                                            : palette.purpleLight
                                    }
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cutoffTitle}>
                                    {asOfDate !== null
                                        ? `Historical Snapshot: Covered on or before ${formatCalendarDate(asOfDate)}`
                                        : "Viewing Current Live Syllabus Coverage"}
                                </Text>
                                <Text style={styles.cutoffSubtitle}>
                                    {asOfDate !== null
                                        ? "Topics taught after this date are excluded — ideal for quiz cutoff preparation."
                                        : "Select any past date to see what was taught before a quiz announcement."}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.cutoffRight}>
                            <Pressable
                                onPress={() => {
                                    setAsOfInput(asOfDate || todayIso);
                                    setAsOfModalOpen(true);
                                }}
                                style={[
                                    styles.cutoffTriggerBtn,
                                    asOfDate !== null && styles.cutoffTriggerBtnHistorical,
                                ]}
                            >
                                <Ionicons
                                    name="options-outline"
                                    size={14}
                                    color={
                                        asOfDate !== null
                                            ? "#0B0C10"
                                            : palette.purpleLight
                                    }
                                />
                                <Text
                                    style={[
                                        styles.cutoffTriggerText,
                                        asOfDate !== null && { color: "#0B0C10" },
                                    ]}
                                >
                                    {asOfDate
                                        ? `As of ${asOfDate}`
                                        : "Set Quiz Cutoff Date"}
                                </Text>
                            </Pressable>

                            {asOfDate !== null && (
                                <Pressable
                                    onPress={() => setAsOfDate(null)}
                                    style={styles.resetPresentBtn}
                                >
                                    <Ionicons
                                        name="refresh"
                                        size={13}
                                        color={palette.amber}
                                    />
                                    <Text style={styles.resetPresentText}>Present</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {/* Quick Recorded Date Strip */}
                    {timelineDates.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.dateStripRow}
                        >
                            <Text style={styles.dateStripLabel}>Quick Snapshot:</Text>
                            <Pressable
                                onPress={() => setAsOfDate(null)}
                                style={[
                                    styles.dateChip,
                                    asOfDate === null && styles.dateChipActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.dateChipText,
                                        asOfDate === null && styles.dateChipTextActive,
                                    ]}
                                >
                                    Live (All Dates)
                                </Text>
                            </Pressable>
                            {timelineDates.slice(0, 8).map((item) => {
                                const active = asOfDate === item.date;
                                return (
                                    <Pressable
                                        key={item.date}
                                        onPress={() =>
                                            setAsOfDate(active ? null : item.date)
                                        }
                                        style={[
                                            styles.dateChip,
                                            active && styles.dateChipHistoricalActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.dateChipText,
                                                active &&
                                                    styles.dateChipTextHistoricalActive,
                                            ]}
                                        >
                                            Thru {formatCalendarDate(item.date, false)} (
                                            {item.topicsCount})
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>

                {/* ─── 2. SEMESTER & SUBJECT SELECTOR STRIP ─────────────────── */}
                <View style={styles.selectorSection}>
                    {availableSemesters.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.semStrip}
                        >
                            {studentProfile?.currentSemester && (
                                <Pressable
                                    onPress={() => {
                                        setSemesterFilter(
                                            semesterFilter ===
                                                studentProfile.currentSemester
                                                ? null
                                                : studentProfile.currentSemester,
                                        );
                                        setSelectedTopicIds(new Set());
                                    }}
                                    style={[
                                        styles.semPill,
                                        semesterFilter ===
                                            studentProfile.currentSemester &&
                                            styles.semPillActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.semPillText,
                                            semesterFilter ===
                                                studentProfile.currentSemester &&
                                                styles.semPillTextActive,
                                        ]}
                                    >
                                        ★ My Sem (S{studentProfile.currentSemester})
                                    </Text>
                                </Pressable>
                            )}
                            <Pressable
                                onPress={() => {
                                    setSemesterFilter(null);
                                    setSelectedTopicIds(new Set());
                                }}
                                style={[
                                    styles.semPill,
                                    semesterFilter === null && styles.semPillActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.semPillText,
                                        semesterFilter === null &&
                                            styles.semPillTextActive,
                                    ]}
                                >
                                    All Semesters
                                </Text>
                            </Pressable>
                            {availableSemesters.map((sem) => {
                                const active = semesterFilter === sem;
                                return (
                                    <Pressable
                                        key={sem}
                                        onPress={() => {
                                            setSemesterFilter(active ? null : sem);
                                            setSelectedTopicIds(new Set());
                                        }}
                                        style={[
                                            styles.semPill,
                                            active && styles.semPillActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.semPillText,
                                                active && styles.semPillTextActive,
                                            ]}
                                        >
                                            Sem {sem}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* Subject Cards Carousel */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.subjectCarousel}
                    >
                        {visibleSubjects.map((sub) => {
                            const isSelected = sub.subjectKey === activeSubjectKey;
                            const ov = overviewMap.get(sub.subjectKey);
                            const pct =
                                isSelected && detail
                                    ? detail.summary.percentageCovered
                                    : ov?.percentageCovered ?? 0;
                            const covCount =
                                isSelected && detail
                                    ? detail.summary.coveredTopicsCount
                                    : ov?.coveredTopicsCount ?? 0;
                            const totCount =
                                isSelected && detail
                                    ? detail.summary.totalTopics
                                    : ov?.totalTopics ?? 0;

                            return (
                                <Pressable
                                    key={sub.subjectKey}
                                    onPress={() => {
                                        setSelectedSubjectKey(sub.subjectKey);
                                        setSelectedTopicIds(new Set());
                                    }}
                                    style={[
                                        styles.subjectSelectorCard,
                                        isSelected && styles.subjectSelectorCardActive,
                                    ]}
                                >
                                    <View style={styles.subjectSelectorTop}>
                                        <View style={styles.subjectCodePill}>
                                            <Text style={styles.subjectCodeText}>
                                                {sub.subjectId}
                                            </Text>
                                        </View>
                                        <Text
                                            style={[
                                                styles.subjectPctBadge,
                                                pct === 100 &&
                                                    totCount > 0 && {
                                                        color: palette.emerald,
                                                    },
                                            ]}
                                        >
                                            {pct}%
                                        </Text>
                                    </View>
                                    <Text
                                        style={styles.subjectSelectorName}
                                        numberOfLines={1}
                                    >
                                        {subjectDisplayName(sub)}
                                    </Text>
                                    <AnimatedCoverageBar
                                        percentage={pct}
                                        height={5}
                                        color={
                                            pct === 100 && totCount > 0
                                                ? palette.emerald
                                                : palette.purple
                                        }
                                    />
                                    <Text style={styles.subjectSelectorMeta}>
                                        {covCount}/{totCount} topics covered
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* ─── 3. SUBJECT SUMMARY DASHBOARD & ORBIT DIAL ────────────── */}
                {loadingDetail && !detail ? (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={palette.purple} />
                        <Text style={styles.loadingText}>
                            Reconstructing syllabus coverage...
                        </Text>
                    </View>
                ) : detailError ? (
                    <View style={styles.errorCard}>
                        <Ionicons
                            name="alert-circle-outline"
                            size={24}
                            color={palette.danger}
                        />
                        <Text style={styles.errorText}>{detailError}</Text>
                        <Pressable
                            onPress={() => {
                                if (activeSubjectKey !== null) {
                                    void loadSubjectDetail(activeSubjectKey, asOfDate);
                                }
                            }}
                            style={styles.retryBtn}
                        >
                            <Text style={styles.retryBtnText}>Retry</Text>
                        </Pressable>
                    </View>
                ) : detail ? (
                    <>
                        <View
                            style={[
                                styles.summaryDashboardCard,
                                isWide && styles.summaryDashboardCardWide,
                            ]}
                        >
                            <CoverageOrbitDial
                                percentage={detail.summary.percentageCovered}
                                coveredCount={detail.summary.coveredTopicsCount}
                                totalCount={detail.summary.totalTopics}
                                isHistorical={asOfDate !== null}
                            />

                            <View style={styles.summaryRightCol}>
                                <View style={styles.summaryTitleRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.summarySubjectName}>
                                            {detail.subject.subjectName}
                                        </Text>
                                        <Text style={styles.summarySubjectMeta}>
                                            {detail.subject.subjectId} •{" "}
                                            {detail.subject.deptName || "Department"}{" "}
                                            {detail.subject.semester
                                                ? `• Semester ${detail.subject.semester}`
                                                : ""}
                                        </Text>
                                    </View>
                                    {detail.summary.lastCoveredDate && (
                                        <View style={styles.lastLectureBadge}>
                                            <Ionicons
                                                name="checkmark-done-circle"
                                                size={13}
                                                color={palette.emerald}
                                            />
                                            <Text style={styles.lastLectureText}>
                                                Last:{" "}
                                                {formatCalendarDate(
                                                    detail.summary.lastCoveredDate,
                                                    false,
                                                )}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.metricsRow}>
                                    <View style={styles.metricBox}>
                                        <Text
                                            style={[
                                                styles.metricVal,
                                                { color: palette.emerald },
                                            ]}
                                        >
                                            {detail.summary.coveredTopicsCount}
                                        </Text>
                                        <Text style={styles.metricLbl}>Covered</Text>
                                    </View>
                                    <View style={styles.metricBox}>
                                        <Text style={styles.metricVal}>
                                            {detail.summary.remainingTopicsCount}
                                        </Text>
                                        <Text style={styles.metricLbl}>Remaining</Text>
                                    </View>
                                    <View style={styles.metricBox}>
                                        <Text
                                            style={[
                                                styles.metricVal,
                                                { color: palette.purpleLight },
                                            ]}
                                        >
                                            {detail.summary.completedChapters}/
                                            {detail.summary.totalChapters}
                                        </Text>
                                        <Text style={styles.metricLbl}>
                                            Chapters Done
                                        </Text>
                                    </View>
                                    <View style={styles.metricBox}>
                                        <Text
                                            style={[
                                                styles.metricVal,
                                                { color: palette.amber },
                                            ]}
                                        >
                                            {detail.summary.lecturesCount}
                                        </Text>
                                        <Text style={styles.metricLbl}>Lectures</Text>
                                    </View>
                                </View>

                                <View style={styles.dashboardActionRow}>
                                    <Pressable
                                        onPress={() =>
                                            router.push(
                                                `/learn?subjectKey=${detail.subject.subjectKey}` as never,
                                            )
                                        }
                                        style={styles.integrationBtn}
                                    >
                                        <Ionicons
                                            name="help-buoy-outline"
                                            size={14}
                                            color={palette.purpleLight}
                                        />
                                        <Text style={styles.integrationBtnText}>
                                            Question Bank
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() =>
                                            router.push(`/quiz-revision` as never)
                                        }
                                        style={styles.integrationBtn}
                                    >
                                        <Ionicons
                                            name="flash-outline"
                                            size={14}
                                            color={palette.emerald}
                                        />
                                        <Text style={styles.integrationBtnText}>
                                            Practice Quiz
                                        </Text>
                                    </Pressable>

                                    {selectedTopicIds.size > 0 && (
                                        <Pressable
                                            onPress={() =>
                                                openCreateCoverageModal(todayIso)
                                            }
                                            style={[
                                                styles.integrationBtn,
                                                {
                                                    backgroundColor: palette.purple,
                                                    borderColor: palette.purple,
                                                },
                                            ]}
                                        >
                                            <Ionicons
                                                name="add-circle-outline"
                                                size={14}
                                                color="#FFF"
                                            />
                                            <Text
                                                style={[
                                                    styles.integrationBtnText,
                                                    { color: "#FFF" },
                                                ]}
                                            >
                                                Record {selectedTopicIds.size} Selected
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* ─── 4. WORKSPACE MODE TABS ───────────────────────────── */}
                        <View style={styles.workspaceTabs}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={styles.workspaceTabsContent}
                            >
                                {(
                                    [
                                        {
                                            id: "syllabus",
                                            label: `Syllabus Tree (${detail.chapters.length})`,
                                            icon: "git-branch-outline",
                                        },
                                        {
                                            id: "timeline",
                                            label: `Date Timeline (${detail.events.length})`,
                                            icon: "calendar-outline",
                                        },
                                        {
                                            id: "analytics",
                                            label: "Chapter Analytics",
                                            icon: "stats-chart-outline",
                                        },
                                    ] as const
                                ).map((t) => {
                                    const active = activeTab === t.id;
                                    return (
                                        <Pressable
                                            key={t.id}
                                            onPress={() => setActiveTab(t.id)}
                                            style={[
                                                styles.workspaceTabBtn,
                                                active && styles.workspaceTabBtnActive,
                                            ]}
                                        >
                                            <Ionicons
                                                name={t.icon}
                                                size={14}
                                                color={
                                                    active
                                                        ? "#FFFFFF"
                                                        : palette.textSecondary
                                                }
                                                style={styles.workspaceTabIcon}
                                            />
                                            <Text
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                style={[
                                                    styles.workspaceTabText,
                                                    active && styles.workspaceTabTextActive,
                                                ]}
                                            >
                                                {t.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* ─── TAB A: INTERACTIVE SYLLABUS COVERAGE TREE ────────── */}
                        {activeTab === "syllabus" && (
                            <View style={styles.tabSection}>
                                <View style={styles.filterToolbar}>
                                    <View style={styles.searchBox}>
                                        <Ionicons
                                            name="search-outline"
                                            size={16}
                                            color={palette.muted}
                                        />
                                        <TextInput
                                            style={styles.searchInput}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            placeholder="Search chapters or topics..."
                                            placeholderTextColor={palette.muted}
                                        />
                                        {searchQuery.length > 0 && (
                                            <Pressable
                                                onPress={() => setSearchQuery("")}
                                            >
                                                <Ionicons
                                                    name="close-circle"
                                                    size={16}
                                                    color={palette.muted}
                                                />
                                            </Pressable>
                                        )}
                                    </View>

                                    <View style={styles.statusFilterRow}>
                                        {(
                                            [
                                                {
                                                    id: "ALL",
                                                    label: `All (${detail.summary.totalTopics})`,
                                                },
                                                {
                                                    id: "COVERED",
                                                    label: `Covered (${detail.summary.coveredTopicsCount})`,
                                                },
                                                {
                                                    id: "REMAINING",
                                                    label: `Remaining (${detail.summary.remainingTopicsCount})`,
                                                },
                                            ] as const
                                        ).map((f) => {
                                            const active = statusFilter === f.id;
                                            return (
                                                <Pressable
                                                    key={f.id}
                                                    onPress={() =>
                                                        setStatusFilter(f.id)
                                                    }
                                                    style={[
                                                        styles.statusChip,
                                                        active &&
                                                            styles.statusChipActive,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.statusChipText,
                                                            active &&
                                                                styles.statusChipTextActive,
                                                        ]}
                                                    >
                                                        {f.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}

                                        <Pressable
                                            onPress={() => {
                                                if (
                                                    expandedChapters.size ===
                                                    detail.chapters.length
                                                ) {
                                                    setExpandedChapters(new Set());
                                                } else {
                                                    setExpandedChapters(
                                                        new Set(
                                                            detail.chapters.map(
                                                                (c) => c.chapterId,
                                                            ),
                                                        ),
                                                    );
                                                }
                                            }}
                                            style={styles.expandAllBtn}
                                        >
                                            <Ionicons
                                                name={
                                                    expandedChapters.size ===
                                                    detail.chapters.length
                                                        ? "contract-outline"
                                                        : "expand-outline"
                                                }
                                                size={13}
                                                color={palette.textSecondary}
                                            />
                                            <Text style={styles.expandAllText}>
                                                {expandedChapters.size ===
                                                detail.chapters.length
                                                    ? "Collapse All"
                                                    : "Expand All"}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>

                                <View style={styles.instructionStrip}>
                                    <Ionicons
                                        name="information-circle-outline"
                                        size={15}
                                        color={palette.purpleLight}
                                    />
                                    <Text style={styles.instructionText}>
                                        Tap topics to select them for a lecture session,
                                        or use{" "}
                                        <Text
                                            style={{
                                                color: palette.purpleLight,
                                                fontWeight: "700",
                                            }}
                                        >
                                            Select Uncovered
                                        </Text>{" "}
                                        inside any chapter.
                                    </Text>
                                </View>

                                {filteredChapters.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Ionicons
                                            name="filter-outline"
                                            size={30}
                                            color={palette.muted}
                                        />
                                        <Text style={styles.emptyTitle}>
                                            No matching topics
                                        </Text>
                                        <Text style={styles.emptySub}>
                                            Try switching the filter to &quot;All&quot;
                                            or clearing your search keyword.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.chapterTreeList}>
                                        {filteredChapters.map((ch, idx) => {
                                            const expanded = expandedChapters.has(
                                                ch.chapterId,
                                            );
                                            const allIds = ch.topics.map(
                                                (t) => t.topicId,
                                            );
                                            const uncoveredIds = ch.topics
                                                .filter((t) => !t.covered)
                                                .map((t) => t.topicId);
                                            const selectedInChapter = ch.topics.filter(
                                                (t) => selectedTopicIds.has(t.topicId),
                                            ).length;
                                            const allSelectedInCh =
                                                allIds.length > 0 &&
                                                selectedInChapter === allIds.length;

                                            return (
                                                <View
                                                    key={ch.chapterId}
                                                    style={styles.chapterTreeRow}
                                                >
                                                    <ChapterStatusNode
                                                        status={ch.status}
                                                        isLast={
                                                            idx ===
                                                            filteredChapters.length - 1
                                                        }
                                                    />

                                                    <View
                                                        style={[
                                                            styles.chapterCard,
                                                            ch.status === "COMPLETED" &&
                                                                styles.chapterCardCompleted,
                                                        ]}
                                                    >
                                                        <Pressable
                                                            onPress={() => {
                                                                setExpandedChapters(
                                                                    (prev) => {
                                                                        const next =
                                                                            new Set(
                                                                                prev,
                                                                            );
                                                                        if (
                                                                            next.has(
                                                                                ch.chapterId,
                                                                            )
                                                                        ) {
                                                                            next.delete(
                                                                                ch.chapterId,
                                                                            );
                                                                        } else {
                                                                            next.add(
                                                                                ch.chapterId,
                                                                            );
                                                                        }
                                                                        return next;
                                                                    },
                                                                );
                                                            }}
                                                            style={
                                                                styles.chapterHeaderPressable
                                                            }
                                                        >
                                                            <View
                                                                style={
                                                                    styles.chapterHeaderTop
                                                                }
                                                            >
                                                                <View
                                                                    style={
                                                                        styles.chapterBadgeRow
                                                                    }
                                                                >
                                                                    <View
                                                                        style={
                                                                            styles.chNumBadge
                                                                        }
                                                                    >
                                                                        <Text
                                                                            style={
                                                                                styles.chNumText
                                                                            }
                                                                        >
                                                                            {ch.chapterNumber
                                                                                ? `CH ${ch.chapterNumber}`
                                                                                : `CH ${idx + 1}`}
                                                                        </Text>
                                                                    </View>
                                                                    <View
                                                                        style={[
                                                                            styles.chStatusBadge,
                                                                            ch.status ===
                                                                                "COMPLETED" &&
                                                                                styles.chStatusCompleted,
                                                                            ch.status ===
                                                                                "IN_PROGRESS" &&
                                                                                styles.chStatusInProgress,
                                                                        ]}
                                                                    >
                                                                        <Text
                                                                            style={[
                                                                                styles.chStatusText,
                                                                                ch.status ===
                                                                                    "COMPLETED" && {
                                                                                    color: palette.emerald,
                                                                                },
                                                                                ch.status ===
                                                                                    "IN_PROGRESS" && {
                                                                                    color: palette.amber,
                                                                                },
                                                                            ]}
                                                                        >
                                                                            {ch.status ===
                                                                            "COMPLETED"
                                                                                ? "Completed"
                                                                                : ch.status ===
                                                                                    "IN_PROGRESS"
                                                                                  ? "In Progress"
                                                                                  : "Not Started"}
                                                                        </Text>
                                                                    </View>
                                                                    {selectedInChapter >
                                                                        0 && (
                                                                        <View
                                                                            style={
                                                                                styles.selectedInChBadge
                                                                            }
                                                                        >
                                                                            <Text
                                                                                style={
                                                                                    styles.selectedInChText
                                                                                }
                                                                            >
                                                                                {
                                                                                    selectedInChapter
                                                                                }{" "}
                                                                                selected
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                </View>

                                                                <View
                                                                    style={
                                                                        styles.chProgressMeta
                                                                    }
                                                                >
                                                                    <Text
                                                                        style={
                                                                            styles.chRatioText
                                                                        }
                                                                    >
                                                                        {
                                                                            ch.coveredTopicsCount
                                                                        }
                                                                        /
                                                                        {
                                                                            ch.totalTopics
                                                                        }{" "}
                                                                        (
                                                                        {
                                                                            ch.percentageCovered
                                                                        }
                                                                        %)
                                                                    </Text>
                                                                    <Ionicons
                                                                        name={
                                                                            expanded
                                                                                ? "chevron-up"
                                                                                : "chevron-down"
                                                                        }
                                                                        size={16}
                                                                        color={
                                                                            palette.textSecondary
                                                                        }
                                                                    />
                                                                </View>
                                                            </View>

                                                            <Text
                                                                style={
                                                                    styles.chapterTitleText
                                                                }
                                                            >
                                                                {ch.chapterName}
                                                            </Text>

                                                            <AnimatedCoverageBar
                                                                percentage={
                                                                    ch.percentageCovered
                                                                }
                                                                height={5}
                                                                color={
                                                                    ch.status ===
                                                                    "COMPLETED"
                                                                        ? palette.emerald
                                                                        : ch.status ===
                                                                            "IN_PROGRESS"
                                                                          ? palette.purple
                                                                          : palette.borderStrong
                                                                }
                                                            />
                                                        </Pressable>

                                                        {expanded &&
                                                            ch.topics.length > 0 && (
                                                                <View
                                                                    style={
                                                                        styles.chapterBulkBar
                                                                    }
                                                                >
                                                                    {uncoveredIds.length >
                                                                        0 && (
                                                                        <Pressable
                                                                            onPress={() =>
                                                                                handleBulkChapterSelect(
                                                                                    uncoveredIds,
                                                                                    ch.chapterId,
                                                                                    "select",
                                                                                )
                                                                            }
                                                                            style={
                                                                                styles.bulkChip
                                                                            }
                                                                        >
                                                                            <Ionicons
                                                                                name="checkmark-circle-outline"
                                                                                size={
                                                                                    12
                                                                                }
                                                                                color={
                                                                                    palette.purpleLight
                                                                                }
                                                                            />
                                                                            <Text
                                                                                style={
                                                                                    styles.bulkChipText
                                                                                }
                                                                            >
                                                                                {`Select ${uncoveredIds.length} remaining`}
                                                                            </Text>
                                                                        </Pressable>
                                                                    )}
                                                                    <Pressable
                                                                        onPress={() =>
                                                                            handleBulkChapterSelect(
                                                                                allIds,
                                                                                ch.chapterId,
                                                                                allSelectedInCh
                                                                                    ? "deselect"
                                                                                    : "select",
                                                                            )
                                                                        }
                                                                        style={
                                                                            styles.bulkChip
                                                                        }
                                                                    >
                                                                        <Ionicons
                                                                            name={
                                                                                allSelectedInCh
                                                                                    ? "remove-circle-outline"
                                                                                    : "layers-outline"
                                                                            }
                                                                            size={12}
                                                                            color={
                                                                                palette.textSecondary
                                                                            }
                                                                        />
                                                                        <Text
                                                                            style={
                                                                                styles.bulkChipText
                                                                            }
                                                                        >
                                                                            {allSelectedInCh
                                                                                ? `Deselect all ${allIds.length}`
                                                                                : `Select all ${allIds.length} topics`}
                                                                        </Text>
                                                                    </Pressable>
                                                                </View>
                                                            )}

                                                        {expanded && (
                                                            <View
                                                                style={
                                                                    styles.topicListWrap
                                                                }
                                                            >
                                                                {ch.visibleTopics
                                                                    .length === 0 ? (
                                                                    <Text
                                                                        style={
                                                                            styles.mutedHint
                                                                        }
                                                                    >
                                                                        No topics in
                                                                        this chapter.
                                                                    </Text>
                                                                ) : (
                                                                    ch.visibleTopics.map(
                                                                        (topic) => {
                                                                            const isSelected =
                                                                                selectedTopicIds.has(
                                                                                    topic.topicId,
                                                                                );
                                                                            return (
                                                                                <Pressable
                                                                                    key={
                                                                                        topic.topicId
                                                                                    }
                                                                                    onPress={() =>
                                                                                        toggleTopicSelection(
                                                                                            topic.topicId,
                                                                                        )
                                                                                    }
                                                                                    style={[
                                                                                        styles.topicRow,
                                                                                        isSelected &&
                                                                                            styles.topicRowSelected,
                                                                                    ]}
                                                                                >
                                                                                    <Ionicons
                                                                                        name={
                                                                                            topic.covered
                                                                                                ? "checkmark-circle"
                                                                                                : "ellipse-outline"
                                                                                        }
                                                                                        size={
                                                                                            18
                                                                                        }
                                                                                        color={
                                                                                            topic.covered
                                                                                                ? palette.emerald
                                                                                                : palette.muted
                                                                                        }
                                                                                    />

                                                                                    <View
                                                                                        style={{
                                                                                            flex: 1,
                                                                                            gap: 3,
                                                                                        }}
                                                                                    >
                                                                                        <Text
                                                                                            style={[
                                                                                                styles.topicNameText,
                                                                                                topic.covered &&
                                                                                                    styles.topicNameCovered,
                                                                                            ]}
                                                                                        >
                                                                                            {
                                                                                                topic.topicName
                                                                                            }
                                                                                        </Text>
                                                                                        {topic.covered && (
                                                                                            <View
                                                                                                style={
                                                                                                    styles.topicMetaRow
                                                                                                }
                                                                                            >
                                                                                                <View
                                                                                                    style={
                                                                                                        styles.datePill
                                                                                                    }
                                                                                                >
                                                                                                    <Text
                                                                                                        style={
                                                                                                            styles.datePillText
                                                                                                        }
                                                                                                    >
                                                                                                        {`Covered ${formatCalendarDate(
                                                                                                            topic.firstCoveredDate,
                                                                                                            false,
                                                                                                        )}`}
                                                                                                    </Text>
                                                                                                </View>
                                                                                                {topic.timesCovered >
                                                                                                    1 && (
                                                                                                    <View
                                                                                                        style={
                                                                                                            styles.revisitPill
                                                                                                        }
                                                                                                    >
                                                                                                        <Ionicons
                                                                                                            name="repeat"
                                                                                                            size={
                                                                                                                10
                                                                                                            }
                                                                                                            color={
                                                                                                                palette.amber
                                                                                                            }
                                                                                                        />
                                                                                                        <Text
                                                                                                            style={
                                                                                                                styles.revisitPillText
                                                                                                            }
                                                                                                        >
                                                                                                            {`${topic.timesCovered}× • last ${formatCalendarDate(
                                                                                                                topic.lastCoveredDate,
                                                                                                                false,
                                                                                                            )}`}
                                                                                                        </Text>
                                                                                                    </View>
                                                                                                )}
                                                                                            </View>
                                                                                        )}
                                                                                    </View>

                                                                                    <View
                                                                                        style={[
                                                                                            styles.selectBox,
                                                                                            isSelected &&
                                                                                                styles.selectBoxActive,
                                                                                        ]}
                                                                                    >
                                                                                        {isSelected && (
                                                                                            <Ionicons
                                                                                                name="checkmark"
                                                                                                size={
                                                                                                    13
                                                                                                }
                                                                                                color="#FFF"
                                                                                            />
                                                                                        )}
                                                                                    </View>
                                                                                </Pressable>
                                                                            );
                                                                        },
                                                                    )
                                                                )}
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ─── TAB B: CHRONOLOGICAL COVERAGE TIMELINE ───────────── */}
                        {activeTab === "timeline" && (
                            <View style={styles.tabSection}>
                                <WeeklyActivityCard timelineDates={timelineDates} />

                                {groupedEventsByDate.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Ionicons
                                            name="calendar-clear-outline"
                                            size={34}
                                            color={palette.muted}
                                        />
                                        <Text style={styles.emptyTitle}>
                                            No dated lectures recorded yet
                                        </Text>
                                        <Text style={styles.emptySub}>
                                            Select topics in the Syllabus Tree tab and
                                            tap &quot;Record Coverage&quot; to build
                                            your dated lecture history.
                                        </Text>
                                        <Pressable
                                            onPress={() => setActiveTab("syllabus")}
                                            style={styles.primaryActionBtn}
                                        >
                                            <Text style={styles.primaryActionBtnText}>
                                                Select Topics to Record →
                                            </Text>
                                        </Pressable>
                                    </View>
                                ) : (
                                    <View style={styles.timelineContainer}>
                                        {groupedEventsByDate.map(
                                            ([dateIso, events], groupIdx) => {
                                                const totalTopicsOnDate = events.reduce(
                                                    (acc, e) => acc + e.topicsCount,
                                                    0,
                                                );
                                                return (
                                                    <View
                                                        key={dateIso}
                                                        style={styles.timelineDateBlock}
                                                    >
                                                        <View
                                                            style={
                                                                styles.timelineDateHeader
                                                            }
                                                        >
                                                            <View
                                                                style={
                                                                    styles.timelineDateHeaderLeft
                                                                }
                                                            >
                                                                <View
                                                                    style={
                                                                        styles.timelineNodeDot
                                                                    }
                                                                />
                                                                <Text
                                                                    style={
                                                                        styles.timelineDateText
                                                                    }
                                                                >
                                                                    {formatCalendarDate(
                                                                        dateIso,
                                                                    )}
                                                                </Text>
                                                                <View
                                                                    style={
                                                                        styles.timelineCountBadge
                                                                    }
                                                                >
                                                                    <Text
                                                                        style={
                                                                            styles.timelineCountText
                                                                        }
                                                                    >
                                                                        {
                                                                            totalTopicsOnDate
                                                                        }{" "}
                                                                        topics
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            <Pressable
                                                                onPress={() =>
                                                                    setAsOfDate(
                                                                        asOfDate ===
                                                                            dateIso
                                                                            ? null
                                                                            : dateIso,
                                                                    )
                                                                }
                                                                style={[
                                                                    styles.cutoffJumpBtn,
                                                                    asOfDate ===
                                                                        dateIso &&
                                                                        styles.cutoffJumpBtnActive,
                                                                ]}
                                                            >
                                                                <Ionicons
                                                                    name="time-outline"
                                                                    size={12}
                                                                    color={
                                                                        asOfDate ===
                                                                        dateIso
                                                                            ? "#0B0C10"
                                                                            : palette.amber
                                                                    }
                                                                />
                                                                <Text
                                                                    style={[
                                                                        styles.cutoffJumpText,
                                                                        asOfDate ===
                                                                            dateIso && {
                                                                            color: "#0B0C10",
                                                                        },
                                                                    ]}
                                                                >
                                                                    {asOfDate ===
                                                                    dateIso
                                                                        ? "Active Cutoff"
                                                                        : "View Cutoff Thru Here"}
                                                                </Text>
                                                            </Pressable>
                                                        </View>

                                                        <View
                                                            style={[
                                                                styles.timelineEventsList,
                                                                groupIdx ===
                                                                    groupedEventsByDate.length -
                                                                        1 && {
                                                                    borderLeftColor:
                                                                        "transparent",
                                                                },
                                                            ]}
                                                        >
                                                            {events.map((ev) => (
                                                                <Pressable
                                                                    key={ev.eventId}
                                                                    onPress={() =>
                                                                        setInspectedEvent(
                                                                            ev,
                                                                        )
                                                                    }
                                                                    style={
                                                                        styles.eventCard
                                                                    }
                                                                >
                                                                    <View
                                                                        style={
                                                                            styles.eventCardHeader
                                                                        }
                                                                    >
                                                                        <View
                                                                            style={{
                                                                                flex: 1,
                                                                            }}
                                                                        >
                                                                            <Text
                                                                                style={
                                                                                    styles.eventCardTitle
                                                                                }
                                                                            >
                                                                                {ev.lectureTitle ||
                                                                                    "Classroom Lecture Session"}
                                                                            </Text>
                                                                            {ev.notes ? (
                                                                                <Text
                                                                                    style={
                                                                                        styles.eventCardNotes
                                                                                    }
                                                                                    numberOfLines={
                                                                                        2
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        ev.notes
                                                                                    }
                                                                                </Text>
                                                                            ) : null}
                                                                        </View>

                                                                        <View
                                                                            style={
                                                                                styles.eventActionBtns
                                                                            }
                                                                        >
                                                                            <Pressable
                                                                                onPress={() =>
                                                                                    openEditEventModal(
                                                                                        ev,
                                                                                    )
                                                                                }
                                                                                style={
                                                                                    styles.iconSmallBtn
                                                                                }
                                                                                hitSlop={
                                                                                    6
                                                                                }
                                                                            >
                                                                                <Ionicons
                                                                                    name="create-outline"
                                                                                    size={
                                                                                        15
                                                                                    }
                                                                                    color={
                                                                                        palette.textSecondary
                                                                                    }
                                                                                />
                                                                            </Pressable>
                                                                            <Pressable
                                                                                onPress={() =>
                                                                                    handleDeleteEvent(
                                                                                        ev.eventId,
                                                                                    )
                                                                                }
                                                                                style={
                                                                                    styles.iconSmallBtn
                                                                                }
                                                                                hitSlop={
                                                                                    6
                                                                                }
                                                                            >
                                                                                <Ionicons
                                                                                    name="trash-outline"
                                                                                    size={
                                                                                        15
                                                                                    }
                                                                                    color={
                                                                                        palette.danger
                                                                                    }
                                                                                />
                                                                            </Pressable>
                                                                        </View>
                                                                    </View>

                                                                    <View
                                                                        style={
                                                                            styles.eventTopicChipsWrap
                                                                        }
                                                                    >
                                                                        {ev.topics.map(
                                                                            (t) => (
                                                                                <View
                                                                                    key={
                                                                                        t.topicId
                                                                                    }
                                                                                    style={
                                                                                        styles.eventTopicChip
                                                                                    }
                                                                                >
                                                                                    <Ionicons
                                                                                        name="checkmark-circle"
                                                                                        size={
                                                                                            12
                                                                                        }
                                                                                        color={
                                                                                            palette.emerald
                                                                                        }
                                                                                    />
                                                                                    <Text
                                                                                        style={
                                                                                            styles.eventTopicChipText
                                                                                        }
                                                                                        numberOfLines={
                                                                                            1
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            t.topicName
                                                                                        }
                                                                                    </Text>
                                                                                </View>
                                                                            ),
                                                                        )}
                                                                    </View>
                                                                </Pressable>
                                                            ))}
                                                        </View>
                                                    </View>
                                                );
                                            },
                                        )}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ─── TAB C: CHAPTER & PACE ANALYTICS ──────────────────── */}
                        {activeTab === "analytics" && (
                            <View style={styles.tabSection}>
                                <WeeklyActivityCard timelineDates={timelineDates} />

                                <View style={styles.analyticsCard}>
                                    <Text style={styles.analyticsSectionTitle}>
                                        Chapter-by-Chapter Completion Matrix
                                    </Text>
                                    <Text style={styles.analyticsSectionSub}>
                                        Visual breakdown of covered vs remaining topics
                                        across all chapters
                                    </Text>

                                    <View style={{ gap: 12, marginTop: 8 }}>
                                        {detail.chapters.map((ch, idx) => (
                                            <Pressable
                                                key={ch.chapterId}
                                                onPress={() => {
                                                    setExpandedChapters((prev) =>
                                                        new Set(prev).add(ch.chapterId),
                                                    );
                                                    setActiveTab("syllabus");
                                                }}
                                                style={styles.matrixRow}
                                            >
                                                <View style={styles.matrixHeaderRow}>
                                                    <Text
                                                        style={styles.matrixChName}
                                                        numberOfLines={1}
                                                    >
                                                        {ch.chapterNumber
                                                            ? `Ch ${ch.chapterNumber}: `
                                                            : `Ch ${idx + 1}: `}
                                                        {ch.chapterName}
                                                    </Text>
                                                    <Text style={styles.matrixChPct}>
                                                        {ch.coveredTopicsCount}/
                                                        {ch.totalTopics} (
                                                        {ch.percentageCovered}%)
                                                    </Text>
                                                </View>
                                                <AnimatedCoverageBar
                                                    percentage={ch.percentageCovered}
                                                    height={8}
                                                    color={
                                                        ch.status === "COMPLETED"
                                                            ? palette.emerald
                                                            : ch.status ===
                                                                "IN_PROGRESS"
                                                              ? palette.purple
                                                              : palette.borderStrong
                                                    }
                                                />
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}
                    </>
                ) : null}
            </View>

            {/* ─── MODALS ────────────────────────────────────────────────────── */}
            <RecordCoverageModal
                visible={recordModalOpen}
                onClose={() => {
                    setRecordModalOpen(false);
                    setEditingEventId(null);
                }}
                selectedTopics={selectedTopicsList}
                coveredDate={coveredDateInput}
                onChangeCoveredDate={setCoveredDateInput}
                lectureTitle={lectureTitleInput}
                onChangeLectureTitle={setLectureTitleInput}
                notes={notesInput}
                onChangeNotes={setNotesInput}
                submitting={submitting}
                submitError={submitError}
                onSubmit={handleSaveCoverage}
                todayIso={todayIso}
                yesterdayIso={yesterdayIso}
            />

            <AsOfDateModal
                visible={asOfModalOpen}
                onClose={() => setAsOfModalOpen(false)}
                asOfInput={asOfInput}
                onChangeAsOfInput={setAsOfInput}
                activeAsOfDate={asOfDate}
                onApplyDate={(d) => {
                    setAsOfDate(d);
                    setAsOfModalOpen(false);
                }}
                onResetToPresent={() => {
                    setAsOfDate(null);
                    setAsOfModalOpen(false);
                }}
                timelineDates={timelineDates}
                todayIso={todayIso}
                yesterdayIso={yesterdayIso}
            />

            <EventDetailModal
                event={inspectedEvent}
                onClose={() => setInspectedEvent(null)}
                onEditEvent={(ev) => openEditEventModal(ev)}
                onDeleteEvent={(id) => handleDeleteEvent(id)}
                onJumpToChapter={(chapterId) => {
                    setExpandedChapters((prev) => new Set(prev).add(chapterId));
                    setActiveTab("syllabus");
                }}
            />
        </AppShell>
    );
}

function makeStyles(palette: TrackerPalette) {
    return StyleSheet.create({
        container: {
            width: "100%",
            maxWidth: 1080,
            alignSelf: "center",
            gap: 16,
            paddingBottom: 24,
        },
        heroCard: {
            backgroundColor: palette.surface,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: palette.borderStrong,
            padding: 18,
            gap: 14,
            overflow: "hidden",
        },
        heroTopRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
        },
        eyebrowRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        eyebrowText: {
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1.1,
            color: palette.purpleLight,
        },
        heroTitle: {
            fontSize: 24,
            fontWeight: "900",
            color: palette.text,
            letterSpacing: -0.4,
        },
        heroSub: {
            fontSize: 12,
            color: palette.textSecondary,
            lineHeight: 18,
            maxWidth: 680,
        },
        viewerLinkChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.border,
        },
        viewerLinkText: {
            fontSize: 11,
            fontWeight: "700",
            color: palette.textSecondary,
        },
        cutoffBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            padding: 12,
            borderRadius: 12,
            backgroundColor: palette.bg,
            borderWidth: 1,
            borderColor: palette.border,
        },
        cutoffBarHistorical: {
            borderColor: palette.amberBorder,
            backgroundColor: palette.amberGlow,
        },
        cutoffLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 220,
        },
        cutoffIconWrap: {
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: palette.purpleGlow,
            alignItems: "center",
            justifyContent: "center",
        },
        cutoffTitle: {
            fontSize: 13,
            fontWeight: "800",
            color: palette.text,
        },
        cutoffSubtitle: {
            fontSize: 11,
            color: palette.textSecondary,
            marginTop: 1,
        },
        cutoffRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        cutoffTriggerBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 9,
            backgroundColor: palette.purpleGlow,
            borderWidth: 1,
            borderColor: palette.purpleBorder,
        },
        cutoffTriggerBtnHistorical: {
            backgroundColor: palette.amber,
            borderColor: palette.amber,
        },
        cutoffTriggerText: {
            fontSize: 12,
            fontWeight: "800",
            color: palette.purpleLight,
        },
        resetPresentBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 9,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.amberBorder,
        },
        resetPresentText: {
            fontSize: 11,
            fontWeight: "800",
            color: palette.amber,
        },
        dateStripRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingTop: 2,
        },
        dateStripLabel: {
            fontSize: 11,
            fontWeight: "700",
            color: palette.muted,
            marginRight: 4,
        },
        dateChip: {
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.border,
        },
        dateChipActive: {
            backgroundColor: palette.purpleGlow,
            borderColor: palette.purple,
        },
        dateChipHistoricalActive: {
            backgroundColor: palette.amberGlow,
            borderColor: palette.amber,
        },
        dateChipText: {
            fontSize: 11,
            fontWeight: "700",
            color: palette.textSecondary,
        },
        dateChipTextActive: {
            color: palette.purpleLight,
        },
        dateChipTextHistoricalActive: {
            color: palette.amber,
        },
        selectorSection: {
            gap: 10,
        },
        semStrip: {
            gap: 6,
        },
        semPill: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 9,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
        },
        semPillActive: {
            backgroundColor: palette.purple,
            borderColor: palette.purple,
        },
        semPillText: {
            fontSize: 12,
            fontWeight: "700",
            color: palette.textSecondary,
        },
        semPillTextActive: {
            color: "#FFFFFF",
        },
        subjectCarousel: {
            gap: 10,
            paddingVertical: 2,
        },
        subjectSelectorCard: {
            width: 210,
            backgroundColor: palette.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 12,
            gap: 7,
        },
        subjectSelectorCardActive: {
            borderColor: palette.purple,
            backgroundColor: palette.surfaceElevated,
        },
        subjectSelectorTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        subjectCodePill: {
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: palette.purpleGlow,
        },
        subjectCodeText: {
            fontSize: 10,
            fontWeight: "800",
            color: palette.purpleLight,
        },
        subjectPctBadge: {
            fontSize: 13,
            fontWeight: "900",
            color: palette.purpleLight,
        },
        subjectSelectorName: {
            fontSize: 13,
            fontWeight: "700",
            color: palette.text,
        },
        subjectSelectorMeta: {
            fontSize: 11,
            color: palette.muted,
            fontWeight: "600",
        },
        summaryDashboardCard: {
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.borderStrong,
            padding: 16,
            gap: 16,
        },
        summaryDashboardCardWide: {
            flexDirection: "row",
            alignItems: "center",
        },
        summaryRightCol: {
            flex: 1,
            gap: 12,
        },
        summaryTitleRow: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
        },
        summarySubjectName: {
            fontSize: 18,
            fontWeight: "900",
            color: palette.text,
        },
        summarySubjectMeta: {
            fontSize: 12,
            color: palette.textSecondary,
            marginTop: 2,
        },
        lastLectureBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: palette.emeraldGlow,
            borderWidth: 1,
            borderColor: palette.emeraldBorder,
        },
        lastLectureText: {
            fontSize: 11,
            fontWeight: "700",
            color: palette.emerald,
        },
        metricsRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
        metricBox: {
            flex: 1,
            minWidth: 74,
            backgroundColor: palette.bg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: palette.border,
            paddingVertical: 8,
            paddingHorizontal: 10,
            alignItems: "center",
        },
        metricVal: {
            fontSize: 16,
            fontWeight: "900",
            color: palette.text,
        },
        metricLbl: {
            fontSize: 10,
            fontWeight: "700",
            color: palette.muted,
            marginTop: 2,
        },
        dashboardActionRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
        integrationBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 9,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.borderStrong,
        },
        integrationBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: palette.text,
        },
        workspaceTabs: {
<<<<<<< HEAD
            width: "100%",
=======
            flexDirection: "row",
>>>>>>> 354e6d3a44964a625b08746d90e1ecf67d857dc6
            backgroundColor: palette.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 4,
<<<<<<< HEAD
            overflow: "hidden",
        },
        workspaceTabsContent: {
            flexGrow: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
        },
        workspaceTabBtn: {
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
            minWidth: 138,
=======
            gap: 4,
        },
        workspaceTabBtn: {
            flex: 1,
>>>>>>> 354e6d3a44964a625b08746d90e1ecf67d857dc6
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 9,
<<<<<<< HEAD
            paddingHorizontal: 12,
            borderRadius: 9,
            overflow: "hidden",
=======
            borderRadius: 9,
>>>>>>> 354e6d3a44964a625b08746d90e1ecf67d857dc6
        },
        workspaceTabBtnActive: {
            backgroundColor: palette.purple,
        },
<<<<<<< HEAD
        workspaceTabIcon: {
            flexShrink: 0,
        },
=======
>>>>>>> 354e6d3a44964a625b08746d90e1ecf67d857dc6
        workspaceTabText: {
            fontSize: 12,
            fontWeight: "700",
            color: palette.textSecondary,
<<<<<<< HEAD
            flexShrink: 1,
            minWidth: 0,
=======
>>>>>>> 354e6d3a44964a625b08746d90e1ecf67d857dc6
        },
        workspaceTabTextActive: {
            color: "#FFFFFF",
        },
        tabSection: {
            gap: 12,
        },
        filterToolbar: {
            gap: 10,
        },
        searchBox: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: palette.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: palette.border,
            paddingHorizontal: 12,
            height: 42,
        },
        searchInput: {
            flex: 1,
            color: palette.text,
            fontSize: 13,
        },
        statusFilterRow: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
        },
        statusChip: {
            paddingHorizontal: 11,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
        },
        statusChipActive: {
            backgroundColor: palette.purpleGlow,
            borderColor: palette.purple,
        },
        statusChipText: {
            fontSize: 11,
            fontWeight: "700",
            color: palette.textSecondary,
        },
        statusChipTextActive: {
            color: palette.purpleLight,
        },
        expandAllBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginLeft: "auto",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
        },
        expandAllText: {
            fontSize: 11,
            fontWeight: "700",
            color: palette.textSecondary,
        },
        instructionStrip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: palette.purpleGlow,
            borderWidth: 1,
            borderColor: palette.purpleBorder,
        },
        instructionText: {
            flex: 1,
            fontSize: 11,
            color: palette.text,
            lineHeight: 16,
        },
        chapterTreeList: {
            gap: 10,
        },
        chapterTreeRow: {
            flexDirection: "row",
            alignItems: "stretch",
            gap: 8,
        },
        chapterCard: {
            flex: 1,
            backgroundColor: palette.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: palette.border,
            overflow: "hidden",
        },
        chapterCardCompleted: {
            borderColor: palette.emeraldBorder,
        },
        chapterHeaderPressable: {
            padding: 14,
            gap: 8,
        },
        chapterHeaderTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 6,
        },
        chapterBadgeRow: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
        },
        chNumBadge: {
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: palette.surfaceMuted,
        },
        chNumText: {
            fontSize: 10,
            fontWeight: "800",
            color: palette.purpleLight,
        },
        chStatusBadge: {
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: palette.surfaceMuted,
        },
        chStatusCompleted: {
            backgroundColor: palette.emeraldGlow,
        },
        chStatusInProgress: {
            backgroundColor: palette.amberGlow,
        },
        chStatusText: {
            fontSize: 10,
            fontWeight: "800",
            color: palette.muted,
        },
        selectedInChBadge: {
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: palette.purpleGlow,
        },
        selectedInChText: {
            fontSize: 10,
            fontWeight: "800",
            color: palette.purpleLight,
        },
        chProgressMeta: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        chRatioText: {
            fontSize: 11,
            fontWeight: "700",
            color: palette.textSecondary,
        },
        chapterTitleText: {
            fontSize: 14,
            fontWeight: "800",
            color: palette.text,
        },
        chapterBulkBar: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            paddingHorizontal: 14,
            paddingBottom: 10,
        },
        bulkChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.borderStrong,
        },
        bulkChipText: {
            fontSize: 11,
            fontWeight: "700",
            color: palette.text,
        },
        topicListWrap: {
            borderTopWidth: 1,
            borderTopColor: palette.border,
            padding: 10,
            gap: 6,
            backgroundColor: palette.bg,
        },
        topicRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 9,
            paddingHorizontal: 10,
            borderRadius: 10,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
        },
        topicRowSelected: {
            borderColor: palette.purple,
            backgroundColor: palette.purpleGlow,
        },
        topicNameText: {
            fontSize: 13,
            fontWeight: "600",
            color: palette.text,
        },
        topicNameCovered: {
            color: palette.text,
        },
        topicMetaRow: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
        },
        datePill: {
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 5,
            backgroundColor: palette.emeraldGlow,
        },
        datePillText: {
            fontSize: 10,
            fontWeight: "700",
            color: palette.emerald,
        },
        revisitPill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 5,
            backgroundColor: palette.amberGlow,
        },
        revisitPillText: {
            fontSize: 10,
            fontWeight: "700",
            color: palette.amber,
        },
        selectBox: {
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: palette.borderStrong,
            backgroundColor: palette.surfaceElevated,
            alignItems: "center",
            justifyContent: "center",
        },
        selectBoxActive: {
            backgroundColor: palette.purple,
            borderColor: palette.purple,
        },
        mutedHint: {
            fontSize: 12,
            color: palette.muted,
            fontStyle: "italic",
            padding: 6,
        },
        timelineContainer: {
            gap: 4,
        },
        timelineDateBlock: {
            gap: 8,
        },
        timelineDateHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
        },
        timelineDateHeaderLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        timelineNodeDot: {
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: palette.purple,
            borderWidth: 2,
            borderColor: palette.purpleLight,
        },
        timelineDateText: {
            fontSize: 14,
            fontWeight: "800",
            color: palette.text,
        },
        timelineCountBadge: {
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: palette.purpleGlow,
        },
        timelineCountText: {
            fontSize: 10,
            fontWeight: "800",
            color: palette.purpleLight,
        },
        cutoffJumpBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 7,
            backgroundColor: palette.amberGlow,
            borderWidth: 1,
            borderColor: palette.amberBorder,
        },
        cutoffJumpBtnActive: {
            backgroundColor: palette.amber,
        },
        cutoffJumpText: {
            fontSize: 10,
            fontWeight: "800",
            color: palette.amber,
        },
        timelineEventsList: {
            marginLeft: 5,
            paddingLeft: 16,
            borderLeftWidth: 2,
            borderLeftColor: palette.borderStrong,
            paddingBottom: 14,
            gap: 10,
        },
        eventCard: {
            backgroundColor: palette.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 14,
            gap: 10,
        },
        eventCardHeader: {
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
        },
        eventCardTitle: {
            fontSize: 14,
            fontWeight: "800",
            color: palette.text,
        },
        eventCardNotes: {
            fontSize: 12,
            color: palette.textSecondary,
            marginTop: 3,
            lineHeight: 17,
        },
        eventActionBtns: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        iconSmallBtn: {
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: palette.surfaceElevated,
            alignItems: "center",
            justifyContent: "center",
        },
        eventTopicChipsWrap: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
        },
        eventTopicChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 7,
            backgroundColor: palette.bg,
            borderWidth: 1,
            borderColor: palette.border,
            maxWidth: "100%",
        },
        eventTopicChipText: {
            fontSize: 11,
            fontWeight: "600",
            color: palette.text,
            flexShrink: 1,
        },
        analyticsCard: {
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 16,
            gap: 8,
        },
        analyticsSectionTitle: {
            fontSize: 15,
            fontWeight: "800",
            color: palette.text,
        },
        analyticsSectionSub: {
            fontSize: 12,
            color: palette.textSecondary,
        },
        matrixRow: {
            gap: 6,
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
        },
        matrixHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
        },
        matrixChName: {
            flex: 1,
            fontSize: 13,
            fontWeight: "700",
            color: palette.text,
        },
        matrixChPct: {
            fontSize: 12,
            fontWeight: "800",
            color: palette.purpleLight,
        },
        floatingBar: {
            backgroundColor: palette.surface,
            borderTopWidth: 1,
            borderTopColor: palette.purpleBorder,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
        },
        floatingBarLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 180,
        },
        floatingCountBadge: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: palette.purple,
            alignItems: "center",
            justifyContent: "center",
        },
        floatingCountText: {
            fontSize: 12,
            fontWeight: "900",
            color: "#FFFFFF",
        },
        floatingTitle: {
            fontSize: 13,
            fontWeight: "800",
            color: palette.text,
        },
        floatingSub: {
            fontSize: 11,
            color: palette.textSecondary,
        },
        floatingActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        floatingClearBtn: {
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 9,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.borderStrong,
        },
        floatingClearText: {
            fontSize: 12,
            fontWeight: "700",
            color: palette.textSecondary,
        },
        floatingRecordBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 9,
            backgroundColor: palette.purple,
        },
        floatingRecordText: {
            fontSize: 12,
            fontWeight: "800",
            color: "#FFFFFF",
        },
        authGateCard: {
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.borderStrong,
            padding: 28,
            alignItems: "center",
            gap: 12,
        },
        authGateIcon: {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: palette.purpleGlow,
            borderWidth: 1,
            borderColor: palette.purpleBorder,
            alignItems: "center",
            justifyContent: "center",
        },
        authGateTitle: {
            fontSize: 17,
            fontWeight: "800",
            color: palette.text,
            textAlign: "center",
        },
        authGateSub: {
            fontSize: 13,
            color: palette.textSecondary,
            textAlign: "center",
            maxWidth: 440,
            lineHeight: 19,
        },
        authGateBtns: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 6,
        },
        primaryActionBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: palette.purple,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 10,
        },
        primaryActionBtnText: {
            fontSize: 13,
            fontWeight: "800",
            color: "#FFFFFF",
        },
        secondaryActionBtn: {
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.borderStrong,
        },
        secondaryActionBtnText: {
            fontSize: 13,
            fontWeight: "700",
            color: palette.text,
        },
        loadingCard: {
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 36,
            alignItems: "center",
            gap: 12,
        },
        loadingText: {
            fontSize: 13,
            color: palette.textSecondary,
            fontWeight: "600",
        },
        errorCard: {
            backgroundColor: palette.dangerGlow,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: palette.danger,
            padding: 18,
            alignItems: "center",
            gap: 10,
        },
        errorText: {
            fontSize: 13,
            color: palette.danger,
            textAlign: "center",
        },
        retryBtn: {
            backgroundColor: palette.purple,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
        },
        retryBtnText: {
            fontSize: 12,
            fontWeight: "800",
            color: "#FFF",
        },
        emptyCard: {
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 28,
            alignItems: "center",
            gap: 8,
        },
        emptyTitle: {
            fontSize: 15,
            fontWeight: "800",
            color: palette.text,
        },
        emptySub: {
            fontSize: 12,
            color: palette.textSecondary,
            textAlign: "center",
            maxWidth: 380,
            lineHeight: 18,
        },
    });
}
