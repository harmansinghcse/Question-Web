import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AppShell, { useLayout } from "../components/AppShell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../components/ui";
import { useAuth } from "../providers/AuthProvider";
import {
    formatCalendarDate,
    syllabusTrackerApi,
    type CoverageEventItem,
    type TrackerContextResponse,
    type TrackerSubjectOverview,
    type TrackerTreeResponse,
} from "../services/syllabus-tracker-api";
import {
    AnimatedCoverageBar,
    ChapterStatusNode,
    CoverageOrbitDial,
    KnowledgeWebMotif,
    TRACKER_PALETTE,
    WeeklyActivityCard,
} from "../components/syllabus-tracker/TrackerVisuals";
import {
    AsOfDateModal,
    EventDetailModal,
    RecordCoverageModal,
} from "../components/syllabus-tracker/TrackerModals";

type TrackerTab = "hierarchy" | "timeline" | "analytics";

export default function SyllabusTrackerScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ subjectKey?: string }>();
    const { isWide } = useLayout();
    const { isAuthenticated, isRestoring } = useAuth();

    // --- Context & Subject State ---
    const [contextData, setContextData] =
        useState<TrackerContextResponse | null>(null);
    const [contextLoading, setContextLoading] = useState(false);
    const [contextError, setContextError] = useState<string | null>(null);

    const [semesterFilter, setSemesterFilter] = useState<number | null>(null);
    const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | null>(
        () => {
            const parsed = Number(params.subjectKey);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        },
    );

    // --- Subject Tree & Events State ---
    const [asOfDate, setAsOfDate] = useState<string | null>(null);
    const [treeData, setTreeData] = useState<TrackerTreeResponse | null>(null);
    const [events, setEvents] = useState<CoverageEventItem[]>([]);
    const [subjectLoading, setSubjectLoading] = useState(false);
    const [subjectError, setSubjectError] = useState<string | null>(null);

    // --- Interactive UI State ---
    const [activeTab, setActiveTab] = useState<TrackerTab>("hierarchy");
    const [uncoveredOnly, setUncoveredOnly] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
        new Set(),
    );
    const [selectedTopicIds, setSelectedTopicIds] = useState<Set<number>>(
        new Set(),
    );

    // --- Modals & Feedback ---
    const [recordModalVisible, setRecordModalVisible] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CoverageEventItem | null>(
        null,
    );
    const [asOfModalVisible, setAsOfModalVisible] = useState(false);
    const [inspectedEvent, setInspectedEvent] =
        useState<CoverageEventItem | null>(null);
    const [deletingEvent, setDeletingEvent] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [bannerNotice, setBannerNotice] = useState<{
        tone: "success" | "info";
        text: string;
    } | null>(null);

    // Track latest request IDs to drop stale responses
    const contextReqId = useRef(0);
    const subjectReqId = useRef(0);

    const canFetch = isAuthenticated && !isRestoring;

    // 1. Load Academic Context + Subjects
    const loadContext = useCallback(
        async (preserveSelection = true) => {
            if (!canFetch) return;
            const id = ++contextReqId.current;
            setContextLoading(true);
            setContextError(null);
            try {
                const res = await syllabusTrackerApi.getContext();
                if (id !== contextReqId.current) return;
                setContextData(res);

                const defaultSem = res.academicContext.currentSemester;
                setSemesterFilter((prev) => {
                    if (params.subjectKey) return null;
                    if (prev !== null) return prev;
                    if (
                        defaultSem &&
                        res.subjects.some((s) => s.semester === defaultSem)
                    ) {
                        return defaultSem;
                    }
                    return null;
                });

                setSelectedSubjectKey((prev) => {
                    if (
                        preserveSelection &&
                        prev &&
                        res.subjects.some((s) => s.subjectKey === prev)
                    ) {
                        return prev;
                    }
                    const paramKey = Number(params.subjectKey);
                    if (
                        Number.isFinite(paramKey) &&
                        res.subjects.some((s) => s.subjectKey === paramKey)
                    ) {
                        return paramKey;
                    }
                    const semMatch = defaultSem
                        ? res.subjects.find((s) => s.semester === defaultSem)
                        : null;
                    return (
                        semMatch?.subjectKey ??
                        res.subjects[0]?.subjectKey ??
                        null
                    );
                });
            } catch (err: unknown) {
                if (id !== contextReqId.current) return;
                setContextError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load academic context.",
                );
            } finally {
                if (id === contextReqId.current) {
                    setContextLoading(false);
                }
            }
        },
        [canFetch, params.subjectKey],
    );

    useEffect(() => {
        if (!canFetch) return;
        let cancelled = false;
        Promise.resolve().then(() => {
            if (!cancelled) void loadContext(false);
        });
        return () => {
            cancelled = true;
        };
    }, [canFetch, loadContext]);

    // 2. Load Tree + Events for selected subject & asOf cutoff
    const loadSubjectTracker = useCallback(
        async (subjectKey: number, cutoff: string | null) => {
            if (!canFetch) return;
            const id = ++subjectReqId.current;
            setSubjectLoading(true);
            setSubjectError(null);
            try {
                const [tree, evts] = await Promise.all([
                    syllabusTrackerApi.getTree(subjectKey, cutoff),
                    syllabusTrackerApi.listEvents(subjectKey),
                ]);
                if (id !== subjectReqId.current) return;
                setTreeData(tree);
                setEvents(evts);
                setExpandedChapters((prev) => {
                    if (prev.size > 0) return prev;
                    const firstActive =
                        tree.chapters.find((c) => c.status !== "COVERED") ??
                        tree.chapters[0];
                    return firstActive
                        ? new Set([firstActive.chapterId])
                        : new Set();
                });
            } catch (err: unknown) {
                if (id !== subjectReqId.current) return;
                setSubjectError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load syllabus coverage.",
                );
            } finally {
                if (id === subjectReqId.current) {
                    setSubjectLoading(false);
                }
            }
        },
        [canFetch],
    );

    useEffect(() => {
        if (!canFetch || selectedSubjectKey == null) return;
        let cancelled = false;
        const key = selectedSubjectKey;
        const cutoff = asOfDate;
        Promise.resolve().then(() => {
            if (!cancelled) void loadSubjectTracker(key, cutoff);
        });
        return () => {
            cancelled = true;
        };
    }, [canFetch, selectedSubjectKey, asOfDate, loadSubjectTracker]);

    // Refresh when screen regains focus (e.g. after recording on the web app)
    const skipFirstFocus = useRef(true);
    useFocusEffect(
        useCallback(() => {
            if (skipFirstFocus.current) {
                skipFirstFocus.current = false;
                return;
            }
            if (canFetch) {
                void loadContext(true);
                if (selectedSubjectKey != null) {
                    void loadSubjectTracker(selectedSubjectKey, asOfDate);
                }
            }
        }, [canFetch, selectedSubjectKey, asOfDate, loadContext, loadSubjectTracker]),
    );

    // Clear unsaved selection when switching subjects
    const handleSelectSubject = (subjectKey: number) => {
        if (subjectKey === selectedSubjectKey) return;
        setSelectedSubjectKey(subjectKey);
        setSelectedTopicIds(new Set());
        setEditingEvent(null);
        setExpandedChapters(new Set());
        setBannerNotice(null);
    };

    // --- Derived Lists ---
    const semesters = useMemo(() => {
        if (!contextData) return [];
        return Array.from(
            new Set(contextData.subjects.map((s) => s.semester)),
        ).sort((a, b) => a - b);
    }, [contextData]);

    const visibleSubjects = useMemo<TrackerSubjectOverview[]>(() => {
        if (!contextData) return [];
        if (semesterFilter == null) return contextData.subjects;
        return contextData.subjects.filter((s) => s.semester === semesterFilter);
    }, [contextData, semesterFilter]);

    const activeSubject = useMemo(
        () =>
            contextData?.subjects.find(
                (s) => s.subjectKey === selectedSubjectKey,
            ) ?? null,
        [contextData, selectedSubjectKey],
    );

    const filteredChapters = useMemo(() => {
        if (!treeData) return [];
        const q = searchQuery.trim().toLowerCase();
        return treeData.chapters
            .map((ch) => {
                const topics = ch.topics.filter((t) => {
                    if (uncoveredOnly && t.covered) return false;
                    if (!q) return true;
                    return (
                        t.topicName.toLowerCase().includes(q) ||
                        ch.chapterName.toLowerCase().includes(q)
                    );
                });
                return { ...ch, visibleTopics: topics };
            })
            .filter((ch) => {
                if (uncoveredOnly && ch.status === "COVERED") return false;
                if (q && ch.visibleTopics.length === 0) return false;
                return true;
            });
    }, [treeData, uncoveredOnly, searchQuery]);

    // Group timeline events chronologically by coverageDate
    const timelineGroups = useMemo(() => {
        const map = new Map<string, CoverageEventItem[]>();
        for (const ev of events) {
            if (asOfDate && ev.coverageDate > asOfDate) continue;
            const list = map.get(ev.coverageDate) ?? [];
            list.push(ev);
            map.set(ev.coverageDate, list);
        }
        return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
    }, [events, asOfDate]);

    const recordedDates = useMemo(
        () => events.map((e) => e.coverageDate),
        [events],
    );

    // --- Selection Handlers ---
    const toggleChapterExpand = (chapterId: number) => {
        setExpandedChapters((prev) => {
            const next = new Set(prev);
            if (next.has(chapterId)) next.delete(chapterId);
            else next.add(chapterId);
            return next;
        });
    };

    const toggleTopicSelection = (topicId: number) => {
        if (asOfDate) {
            setBannerNotice({
                tone: "info",
                text: "Switch back to Live View to select and record new coverage.",
            });
            return;
        }
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
        if (asOfDate) {
            setBannerNotice({
                tone: "info",
                text: "Switch back to Live View to bulk-select topics.",
            });
            return;
        }
        setSelectedTopicIds((prev) => {
            const next = new Set(prev);
            for (const id of topicIds) {
                if (mode === "select") next.add(id);
                else next.delete(id);
            }
            return next;
        });
        if (mode === "select") {
            setExpandedChapters((prev) => new Set(prev).add(chapterId));
        }
    };

    const clearSelection = () => {
        setSelectedTopicIds(new Set());
        setEditingEvent(null);
    };

    // --- Save / Edit / Delete Operations ---
    const handleSaveCoverage = async (payload: {
        coverageDate: string;
        notes: string;
        topicIds: number[];
        editingEventId?: number;
    }) => {
        if (selectedSubjectKey == null) return;
        if (payload.editingEventId) {
            await syllabusTrackerApi.updateEvent(payload.editingEventId, {
                coverageDate: payload.coverageDate,
                notes: payload.notes,
                topicIds: payload.topicIds,
            });
            setBannerNotice({
                tone: "success",
                text: `Updated session for ${formatCalendarDate(payload.coverageDate)} (${payload.topicIds.length} topics).`,
            });
        } else {
            await syllabusTrackerApi.createEvent({
                subjectKey: selectedSubjectKey,
                coverageDate: payload.coverageDate,
                notes: payload.notes || undefined,
                topicIds: payload.topicIds,
            });
            setBannerNotice({
                tone: "success",
                text: `Recorded ${payload.topicIds.length} ${
                    payload.topicIds.length === 1 ? "topic" : "topics"
                } on ${formatCalendarDate(payload.coverageDate)}.`,
            });
        }

        setRecordModalVisible(false);
        setEditingEvent(null);
        setSelectedTopicIds(new Set());
        await Promise.all([
            loadSubjectTracker(selectedSubjectKey, asOfDate),
            loadContext(true),
        ]);
    };

    const handleStartEditEvent = (ev: CoverageEventItem) => {
        setInspectedEvent(null);
        setAsOfDate(null);
        setEditingEvent(ev);
        setSelectedTopicIds(new Set(ev.topics.map((t) => t.topicId)));
        setRecordModalVisible(true);
    };

    const handleConfirmDeleteEvent = async (eventId: number) => {
        if (selectedSubjectKey == null) return;
        setDeletingEvent(true);
        setDeleteError(null);
        try {
            await syllabusTrackerApi.deleteEvent(eventId);
            setInspectedEvent(null);
            setBannerNotice({
                tone: "info",
                text: `Deleted coverage session #${eventId}. Progress recalculated.`,
            });
            await Promise.all([
                loadSubjectTracker(selectedSubjectKey, asOfDate),
                loadContext(true),
            ]);
        } catch (err: unknown) {
            setDeleteError(
                err instanceof Error
                    ? err.message
                    : "Failed to delete coverage event.",
            );
        } finally {
            setDeletingEvent(false);
        }
    };

    const handleSharePortion = async () => {
        if (!treeData) return;
        const lines: string[] = [
            `${treeData.subjectId} — ${treeData.subjectName ?? "Subject"}`,
            asOfDate
                ? `Recorded Syllabus Portion as of ${formatCalendarDate(asOfDate)}`
                : "Current Recorded Syllabus Portion",
            `Coverage: ${treeData.stats.coveragePercent}% (${treeData.stats.coveredTopics}/${treeData.stats.totalTopics} topics)`,
            "",
        ];
        for (const ch of treeData.chapters) {
            const cov = ch.topics.filter((t) => t.covered);
            if (cov.length === 0) continue;
            lines.push(
                `Ch ${ch.chapterNo}: ${ch.chapterName} (${cov.length}/${ch.totalTopics})`,
            );
            for (const t of cov) {
                lines.push(`  • ${t.topicName}`);
            }
        }
        const text = lines.join("\n");
        try {
            if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                setBannerNotice({
                    tone: "success",
                    text: "Copied covered portion summary to clipboard.",
                });
            } else {
                await Share.share({ message: text });
            }
        } catch {
            // User dismissed share sheet
        }
    };

    // --- Render Guards ---
    if (isRestoring) {
        return (
            <AppShell active="tracker">
                <View style={styles.pageWrap}>
                    <LoadingBlock label="Restoring academic session..." />
                </View>
            </AppShell>
        );
    }

    if (!isAuthenticated) {
        return (
            <AppShell active="tracker">
                <View style={styles.pageWrap}>
                    <EmptyBlock
                        icon="git-network-outline"
                        title="Sign in to open Syllabus Tracker"
                        text="Record lecture-by-lecture coverage, inspect quiz cutoffs as of any past date, and sync progress across mobile and web."
                        actionLabel="Log in"
                        onAction={() => router.push("/login" as never)}
                    />
                </View>
            </AppShell>
        );
    }

    const stats = treeData?.stats;
    const selectedChapterCount = treeData
        ? treeData.chapters.filter((ch) =>
              ch.topics.some((t) => selectedTopicIds.has(t.topicId)),
          ).length
        : 0;

    const floatingSelectionBar =
        selectedTopicIds.size > 0 && !asOfDate ? (
            <View style={styles.floatingBarWrap} pointerEvents="box-none">
                <View style={styles.floatingBar}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.floatingCount}>
                            {`${selectedTopicIds.size} ${
                                selectedTopicIds.size === 1
                                    ? "topic"
                                    : "topics"
                            } selected`}
                        </Text>
                        <Text style={styles.floatingSub}>
                            {editingEvent
                                ? `Editing session from ${formatCalendarDate(editingEvent.coverageDate, false)}`
                                : `Across ${selectedChapterCount} ${
                                      selectedChapterCount === 1
                                          ? "chapter"
                                          : "chapters"
                                  } • Unsaved`}
                        </Text>
                    </View>
                    <Pressable
                        onPress={clearSelection}
                        style={styles.floatingClearBtn}
                    >
                        <Text style={styles.floatingClearText}>Clear</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setRecordModalVisible(true)}
                        style={styles.floatingRecordBtn}
                    >
                        <Ionicons
                            name="checkmark-done"
                            size={15}
                            color="#FFFFFF"
                        />
                        <Text style={styles.floatingRecordText}>
                            {editingEvent
                                ? "Update Session"
                                : "Record Coverage"}
                        </Text>
                    </Pressable>
                </View>
            </View>
        ) : null;

    return (
        <AppShell active="tracker" floatingFooter={floatingSelectionBar}>
            <View style={styles.pageWrap}>
                {/* 1. TOP WORKSPACE BAR */}
                <View style={styles.topHeaderRow}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.eyebrowRow}>
                            <View style={styles.liveDot} />
                            <Text style={styles.eyebrowText}>
                                SYLLABUS COVERAGE WORKSPACE
                            </Text>
                        </View>
                        <Text style={styles.screenTitle}>Syllabus Tracker</Text>
                    </View>
                    <Pressable
                        onPress={() =>
                            router.push(
                                (selectedSubjectKey
                                    ? `/syllabus?subjectKey=${selectedSubjectKey}`
                                    : "/syllabus") as never,
                            )
                        }
                        style={styles.viewerLinkBtn}
                        accessibilityRole="button"
                    >
                        <Ionicons
                            name="book-outline"
                            size={14}
                            color={TRACKER_PALETTE.textSecondary}
                        />
                        <Text style={styles.viewerLinkText}>Syllabus Viewer</Text>
                    </Pressable>
                </View>

                {/* 2. ACADEMIC CONTEXT & SUBJECT SELECTOR */}
                {contextLoading && !contextData ? (
                    <LoadingBlock label="Loading your academic subjects..." />
                ) : contextError ? (
                    <ErrorBlock
                        title="Couldn't load academic context"
                        message={contextError}
                        onRetry={() => void loadContext(true)}
                    />
                ) : contextData ? (
                    <View style={styles.contextCard}>
                        <KnowledgeWebMotif />

                        {/* Context Badges */}
                        <View style={styles.contextPillsRow}>
                            {contextData.academicContext.deptName && (
                                <View style={styles.contextBadge}>
                                    <Ionicons
                                        name="school-outline"
                                        size={12}
                                        color={TRACKER_PALETTE.purple}
                                    />
                                    <Text style={styles.contextBadgeText}>
                                        {contextData.academicContext.deptName}
                                    </Text>
                                </View>
                            )}
                            {contextData.academicContext.currentSemester && (
                                <View style={styles.contextBadge}>
                                    <Text style={styles.contextBadgeText}>
                                        {`Semester ${contextData.academicContext.currentSemester}`}
                                    </Text>
                                </View>
                            )}
                            {contextData.academicContext.academicYearLabel && (
                                <View style={styles.contextBadge}>
                                    <Text style={styles.contextBadgeText}>
                                        {`Session ${contextData.academicContext.academicYearLabel}`}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Semester Filter Chips */}
                        {semesters.length > 1 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.semChipsRow}
                            >
                                <Pressable
                                    onPress={() => setSemesterFilter(null)}
                                    style={[
                                        styles.semChip,
                                        semesterFilter === null &&
                                            styles.semChipActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.semChipText,
                                            semesterFilter === null &&
                                                styles.semChipTextActive,
                                        ]}
                                    >
                                        All Semesters
                                    </Text>
                                </Pressable>
                                {semesters.map((sem) => {
                                    const active = semesterFilter === sem;
                                    const isCurrent =
                                        sem ===
                                        contextData.academicContext
                                            .currentSemester;
                                    return (
                                        <Pressable
                                            key={sem}
                                            onPress={() =>
                                                setSemesterFilter(sem)
                                            }
                                            style={[
                                                styles.semChip,
                                                active && styles.semChipActive,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.semChipText,
                                                    active &&
                                                        styles.semChipTextActive,
                                                ]}
                                            >
                                                {isCurrent
                                                    ? `Sem ${sem} (Current)`
                                                    : `Sem ${sem}`}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        )}

                        {/* Subject Cards Strip */}
                        {visibleSubjects.length === 0 ? (
                            <Text style={styles.mutedHint}>
                                No subjects found for this semester filter.
                            </Text>
                        ) : (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.subjectStrip}
                            >
                                {visibleSubjects.map((sub) => {
                                    const selected =
                                        sub.subjectKey === selectedSubjectKey;
                                    return (
                                        <Pressable
                                            key={sub.subjectKey}
                                            onPress={() =>
                                                handleSelectSubject(
                                                    sub.subjectKey,
                                                )
                                            }
                                            style={[
                                                styles.subjectCard,
                                                selected &&
                                                    styles.subjectCardActive,
                                            ]}
                                        >
                                            <View
                                                style={styles.subjectCardTop}
                                            >
                                                <Text
                                                    style={[
                                                        styles.subjectCode,
                                                        selected && {
                                                            color: TRACKER_PALETTE.purple,
                                                        },
                                                    ]}
                                                >
                                                    {sub.subjectId}
                                                </Text>
                                                <Text style={styles.subjectPct}>
                                                    {`${sub.coveragePercent}%`}
                                                </Text>
                                            </View>
                                            <Text
                                                style={styles.subjectName}
                                                numberOfLines={2}
                                            >
                                                {sub.subjectName ||
                                                    sub.subjectId}
                                            </Text>
                                            <AnimatedCoverageBar
                                                percent={sub.coveragePercent}
                                                height={4}
                                            />
                                            <Text style={styles.subjectMeta}>
                                                {`${sub.coveredTopics}/${sub.totalTopics} topics • Sem ${sub.semester}`}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                ) : null}

                {/* Feedback Banner */}
                {bannerNotice && (
                    <View
                        style={[
                            styles.noticeBanner,
                            bannerNotice.tone === "success"
                                ? styles.noticeSuccess
                                : styles.noticeInfo,
                        ]}
                    >
                        <Ionicons
                            name={
                                bannerNotice.tone === "success"
                                    ? "checkmark-circle"
                                    : "information-circle"
                            }
                            size={16}
                            color={
                                bannerNotice.tone === "success"
                                    ? TRACKER_PALETTE.emerald
                                    : TRACKER_PALETTE.amber
                            }
                        />
                        <Text style={styles.noticeText}>
                            {bannerNotice.text}
                        </Text>
                        <Pressable onPress={() => setBannerNotice(null)} hitSlop={8}>
                            <Ionicons
                                name="close"
                                size={15}
                                color={TRACKER_PALETTE.muted}
                            />
                        </Pressable>
                    </View>
                )}

                {/* Historical As-Of-Date Cutoff Banner */}
                {asOfDate && (
                    <View style={styles.cutoffBanner}>
                        <View style={{ flex: 1, gap: 3 }}>
                            <View style={styles.cutoffTitleRow}>
                                <Ionicons
                                    name="calendar"
                                    size={15}
                                    color={TRACKER_PALETTE.amber}
                                />
                                <Text style={styles.cutoffTitle}>
                                    {`Coverage as of ${formatCalendarDate(asOfDate)}`}
                                </Text>
                            </View>
                            <Text style={styles.cutoffSub}>
                                Reconstructed from your recorded sessions with coverage date on or before{" "}
                                {formatCalendarDate(asOfDate)}. Later events are excluded.
                            </Text>
                        </View>
                        <View style={styles.cutoffActions}>
                            <Pressable
                                onPress={() => void handleSharePortion()}
                                style={styles.cutoffSmallBtn}
                            >
                                <Ionicons
                                    name="share-social-outline"
                                    size={13}
                                    color={TRACKER_PALETTE.text}
                                />
                                <Text style={styles.cutoffSmallBtnText}>
                                    Portion
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setAsOfDate(null)}
                                style={styles.cutoffResetBtn}
                            >
                                <Text style={styles.cutoffResetText}>
                                    Live View
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                {/* 3. SELECTED SUBJECT BODY */}
                {subjectLoading && !treeData ? (
                    <LoadingBlock label="Building syllabus coverage map..." />
                ) : subjectError ? (
                    <ErrorBlock
                        title="Couldn't load subject tracker"
                        message={subjectError}
                        onRetry={() => {
                            if (selectedSubjectKey != null) {
                                void loadSubjectTracker(
                                    selectedSubjectKey,
                                    asOfDate,
                                );
                            }
                        }}
                    />
                ) : treeData && stats ? (
                    <>
                        {/* PROGRESS OVERVIEW + QUICK ACTIONS */}
                        <View
                            style={[
                                styles.overviewRow,
                                isWide && { flexDirection: "row" },
                            ]}
                        >
                            {/* Dial + Metrics Card */}
                            <View style={[styles.overviewCard, isWide && { flex: 1.3 }]}>
                                <View style={styles.dialAndStats}>
                                    <CoverageOrbitDial
                                        percent={stats.coveragePercent}
                                        covered={stats.coveredTopics}
                                        total={stats.totalTopics}
                                    />
                                    <View style={styles.metricsGrid}>
                                        <View style={styles.metricBox}>
                                            <Text style={styles.metricValue}>
                                                {`${stats.coveredTopics} / ${stats.totalTopics}`}
                                            </Text>
                                            <Text style={styles.metricLabel}>
                                                Unique Topics Covered
                                            </Text>
                                        </View>
                                        <View style={styles.metricBox}>
                                            <Text
                                                style={[
                                                    styles.metricValue,
                                                    { color: TRACKER_PALETTE.textSecondary },
                                                ]}
                                            >
                                                {stats.remainingTopics}
                                            </Text>
                                            <Text style={styles.metricLabel}>
                                                Topics Remaining
                                            </Text>
                                        </View>
                                        <View style={styles.chapterBreakdownRow}>
                                            <View style={styles.chapterBadgeEmerald}>
                                                <Text style={styles.chapterBadgeValEmerald}>
                                                    {stats.chaptersCovered}
                                                </Text>
                                                <Text style={styles.chapterBadgeLbl}>
                                                    Covered Ch
                                                </Text>
                                            </View>
                                            <View style={styles.chapterBadgeAmber}>
                                                <Text style={styles.chapterBadgeValAmber}>
                                                    {stats.chaptersPartial}
                                                </Text>
                                                <Text style={styles.chapterBadgeLbl}>
                                                    Partial Ch
                                                </Text>
                                            </View>
                                            <View style={styles.chapterBadgeNeutral}>
                                                <Text style={styles.chapterBadgeValNeutral}>
                                                    {stats.chaptersUncovered}
                                                </Text>
                                                <Text style={styles.chapterBadgeLbl}>
                                                    Uncovered Ch
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Quick Actions Card */}
                            <View style={[styles.quickActionsCard, isWide && { flex: 1 }]}>
                                <Text style={styles.quickCardTitle}>
                                    QUICK ACTIONS
                                </Text>
                                <View style={styles.quickGrid}>
                                    <Pressable
                                        onPress={() => {
                                            setAsOfDate(null);
                                            setActiveTab("hierarchy");
                                            if (selectedTopicIds.size > 0) {
                                                setEditingEvent(null);
                                                setRecordModalVisible(true);
                                            } else {
                                                const nextCh =
                                                    treeData.chapters.find(
                                                        (c) =>
                                                            c.status !==
                                                            "COVERED",
                                                    ) ?? treeData.chapters[0];
                                                if (nextCh) {
                                                    setExpandedChapters(
                                                        new Set([
                                                            nextCh.chapterId,
                                                        ]),
                                                    );
                                                }
                                                setBannerNotice({
                                                    tone: "info",
                                                    text: "Tick the topics taught in class below, then tap Record Coverage.",
                                                });
                                            }
                                        }}
                                        style={styles.quickBtnPrimary}
                                    >
                                        <Ionicons
                                            name="add-circle"
                                            size={16}
                                            color="#FFFFFF"
                                        />
                                        <Text style={styles.quickBtnPrimaryText}>
                                            Record Today&apos;s Coverage
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => setAsOfModalVisible(true)}
                                        style={styles.quickBtn}
                                    >
                                        <Ionicons
                                            name="calendar-outline"
                                            size={15}
                                            color={TRACKER_PALETTE.amber}
                                        />
                                        <Text style={styles.quickBtnText}>
                                            {asOfDate
                                                ? `As of ${formatCalendarDate(asOfDate, false)}`
                                                : "As of a Date"}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => {
                                            setActiveTab("hierarchy");
                                            setUncoveredOnly((p) => !p);
                                        }}
                                        style={[
                                            styles.quickBtn,
                                            uncoveredOnly &&
                                                styles.quickBtnActive,
                                        ]}
                                    >
                                        <Ionicons
                                            name="eye-outline"
                                            size={15}
                                            color={
                                                uncoveredOnly
                                                    ? TRACKER_PALETTE.purple
                                                    : TRACKER_PALETTE.textSecondary
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.quickBtnText,
                                                uncoveredOnly && {
                                                    color: TRACKER_PALETTE.purple,
                                                },
                                            ]}
                                        >
                                            Uncovered Topics
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() =>
                                            setActiveTab(
                                                activeTab === "timeline"
                                                    ? "hierarchy"
                                                    : "timeline",
                                            )
                                        }
                                        style={[
                                            styles.quickBtn,
                                            activeTab === "timeline" &&
                                                styles.quickBtnActive,
                                        ]}
                                    >
                                        <Ionicons
                                            name="time-outline"
                                            size={15}
                                            color={TRACKER_PALETTE.textSecondary}
                                        />
                                        <Text style={styles.quickBtnText}>
                                            {`History (${stats.eventCount})`}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>

                        {/* MODE TABS */}
                        <View style={styles.tabBar}>
                            {(
                                [
                                    {
                                        id: "hierarchy" as const,
                                        label: `Syllabus Map (${stats.totalChapters})`,
                                        icon: "git-network-outline" as const,
                                    },
                                    {
                                        id: "timeline" as const,
                                        label: `Timeline (${timelineGroups.reduce(
                                            (a, [, l]) => a + l.length,
                                            0,
                                        )})`,
                                        icon: "list-outline" as const,
                                    },
                                    {
                                        id: "analytics" as const,
                                        label: "Weekly Pace",
                                        icon: "stats-chart-outline" as const,
                                    },
                                ]
                            ).map((tab) => {
                                const active = activeTab === tab.id;
                                return (
                                    <Pressable
                                        key={tab.id}
                                        onPress={() => setActiveTab(tab.id)}
                                        style={[
                                            styles.tabPill,
                                            active && styles.tabPillActive,
                                        ]}
                                    >
                                        <Ionicons
                                            name={tab.icon}
                                            size={14}
                                            color={
                                                active
                                                    ? "#FFFFFF"
                                                    : TRACKER_PALETTE.textSecondary
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.tabPillText,
                                                active &&
                                                    styles.tabPillTextActive,
                                            ]}
                                        >
                                            {tab.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* TAB 1: HIERARCHICAL KNOWLEDGE MAP */}
                        {activeTab === "hierarchy" && (
                            <View style={styles.hierarchySection}>
                                {/* Search + Expand/Collapse Toolbar */}
                                <View style={styles.toolbarRow}>
                                    <View style={styles.searchBox}>
                                        <Ionicons
                                            name="search"
                                            size={14}
                                            color={TRACKER_PALETTE.muted}
                                        />
                                        <TextInput
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            placeholder="Filter chapters or topics..."
                                            placeholderTextColor={
                                                TRACKER_PALETTE.muted
                                            }
                                            style={styles.searchInput}
                                        />
                                        {!!searchQuery && (
                                            <Pressable
                                                onPress={() =>
                                                    setSearchQuery("")
                                                }
                                            >
                                                <Ionicons
                                                    name="close-circle"
                                                    size={15}
                                                    color={
                                                        TRACKER_PALETTE.muted
                                                    }
                                                />
                                            </Pressable>
                                        )}
                                    </View>
                                    <Pressable
                                        onPress={() => {
                                            if (
                                                expandedChapters.size >=
                                                filteredChapters.length
                                            ) {
                                                setExpandedChapters(new Set());
                                            } else {
                                                setExpandedChapters(
                                                    new Set(
                                                        filteredChapters.map(
                                                            (c) => c.chapterId,
                                                        ),
                                                    ),
                                                );
                                            }
                                        }}
                                        style={styles.toolbarActionBtn}
                                    >
                                        <Text style={styles.toolbarActionText}>
                                            {expandedChapters.size >=
                                                filteredChapters.length &&
                                            filteredChapters.length > 0
                                                ? "Collapse All"
                                                : "Expand All"}
                                        </Text>
                                    </Pressable>
                                </View>

                                {filteredChapters.length === 0 ? (
                                    <EmptyBlock
                                        icon="checkmark-done-circle-outline"
                                        title={
                                            uncoveredOnly
                                                ? "Every topic is covered!"
                                                : "No matching topics"
                                        }
                                        text={
                                            uncoveredOnly
                                                ? "All topics in this subject have been recorded as covered."
                                                : "Try clearing your search or filter."
                                        }
                                        actionLabel={
                                            uncoveredOnly
                                                ? "Show All Topics"
                                                : undefined
                                        }
                                        onAction={
                                            uncoveredOnly
                                                ? () => setUncoveredOnly(false)
                                                : undefined
                                        }
                                    />
                                ) : (
                                    <View style={styles.chapterTreeList}>
                                        {filteredChapters.map((ch, idx) => {
                                            const expanded =
                                                expandedChapters.has(
                                                    ch.chapterId,
                                                ) || !!searchQuery.trim();
                                            const pct =
                                                ch.totalTopics > 0
                                                    ? Math.round(
                                                          (ch.coveredTopics /
                                                              ch.totalTopics) *
                                                              100,
                                                      )
                                                    : 0;
                                            const allIds = ch.topics.map(
                                                (t) => t.topicId,
                                            );
                                            const uncoveredIds = ch.topics
                                                .filter((t) => !t.covered)
                                                .map((t) => t.topicId);
                                            const selectedInCh = ch.topics.filter(
                                                (t) =>
                                                    selectedTopicIds.has(
                                                        t.topicId,
                                                    ),
                                            ).length;
                                            const allSelectedInCh =
                                                allIds.length > 0 &&
                                                selectedInCh === allIds.length;

                                            return (
                                                <View
                                                    key={ch.chapterId}
                                                    style={styles.chapterNodeRow}
                                                >
                                                    <ChapterStatusNode
                                                        status={ch.status}
                                                        isLast={
                                                            idx ===
                                                            filteredChapters.length -
                                                                1
                                                        }
                                                    />

                                                    <View
                                                        style={[
                                                            styles.chapterCard,
                                                            ch.status ===
                                                                "COVERED" &&
                                                                styles.chapterCardCovered,
                                                            ch.status ===
                                                                "PARTIAL" &&
                                                                styles.chapterCardPartial,
                                                        ]}
                                                    >
                                                        {/* Chapter Header */}
                                                        <Pressable
                                                            onPress={() =>
                                                                toggleChapterExpand(
                                                                    ch.chapterId,
                                                                )
                                                            }
                                                            style={
                                                                styles.chapterHeaderPress
                                                            }
                                                        >
                                                            <View
                                                                style={{
                                                                    flex: 1,
                                                                    gap: 6,
                                                                }}
                                                            >
                                                                <View
                                                                    style={
                                                                        styles.chapterTagLine
                                                                    }
                                                                >
                                                                    <Text
                                                                        style={
                                                                            styles.chapterNumBadge
                                                                        }
                                                                    >
                                                                        {`CH ${ch.chapterNo}`}
                                                                    </Text>
                                                                    <View
                                                                        style={[
                                                                            styles.statusPill,
                                                                            ch.status ===
                                                                                "COVERED" &&
                                                                                styles.statusPillCovered,
                                                                            ch.status ===
                                                                                "PARTIAL" &&
                                                                                styles.statusPillPartial,
                                                                        ]}
                                                                    >
                                                                        <Text
                                                                            style={[
                                                                                styles.statusPillText,
                                                                                ch.status ===
                                                                                    "COVERED" && {
                                                                                    color: TRACKER_PALETTE.emerald,
                                                                                },
                                                                                ch.status ===
                                                                                    "PARTIAL" && {
                                                                                    color: TRACKER_PALETTE.amber,
                                                                                },
                                                                            ]}
                                                                        >
                                                                            {ch.status ===
                                                                            "COVERED"
                                                                                ? "Fully Covered"
                                                                                : ch.status ===
                                                                                    "PARTIAL"
                                                                                  ? "Partially Covered"
                                                                                  : ch.status ===
                                                                                      "EMPTY"
                                                                                    ? "No Topics"
                                                                                    : "Uncovered"}
                                                                        </Text>
                                                                    </View>
                                                                    {selectedInCh >
                                                                        0 && (
                                                                        <View
                                                                            style={
                                                                                styles.selectedCountPill
                                                                            }
                                                                        >
                                                                            <Text
                                                                                style={
                                                                                    styles.selectedCountPillText
                                                                                }
                                                                            >
                                                                                {`${selectedInCh} selected`}
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                </View>

                                                                <Text
                                                                    style={
                                                                        styles.chapterTitle
                                                                    }
                                                                >
                                                                    {
                                                                        ch.chapterName
                                                                    }
                                                                </Text>

                                                                <View
                                                                    style={
                                                                        styles.chapterProgressLine
                                                                    }
                                                                >
                                                                    <View
                                                                        style={{
                                                                            flex: 1,
                                                                        }}
                                                                    >
                                                                        <AnimatedCoverageBar
                                                                            percent={
                                                                                pct
                                                                            }
                                                                            status={
                                                                                ch.status
                                                                            }
                                                                            height={
                                                                                5
                                                                            }
                                                                        />
                                                                    </View>
                                                                    <Text
                                                                        style={
                                                                            styles.chapterCountLabel
                                                                        }
                                                                    >
                                                                        {`${ch.coveredTopics}/${ch.totalTopics} topics`}
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            <Ionicons
                                                                name={
                                                                    expanded
                                                                        ? "chevron-up"
                                                                        : "chevron-down"
                                                                }
                                                                size={18}
                                                                color={
                                                                    TRACKER_PALETTE.textSecondary
                                                                }
                                                            />
                                                        </Pressable>

                                                        {/* Explicit Chapter Bulk Actions (Live View only) */}
                                                        {!asOfDate &&
                                                            ch.totalTopics >
                                                                0 && (
                                                                <View
                                                                    style={
                                                                        styles.bulkActionsBar
                                                                    }
                                                                >
                                                                    {uncoveredIds.length >
                                                                        0 &&
                                                                        uncoveredIds.length <
                                                                            allIds.length && (
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
                                                                                    name="sparkles-outline"
                                                                                    size={
                                                                                        11
                                                                                    }
                                                                                    color={
                                                                                        TRACKER_PALETTE.purple
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
                                                                            size={
                                                                                12
                                                                            }
                                                                            color={
                                                                                TRACKER_PALETTE.textSecondary
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

                                                        {/* Expanded Topic Tree */}
                                                        {expanded && (
                                                            <View
                                                                style={
                                                                    styles.topicListWrap
                                                                }
                                                            >
                                                                {ch.visibleTopics
                                                                    .length ===
                                                                0 ? (
                                                                    <Text
                                                                        style={
                                                                            styles.mutedHint
                                                                        }
                                                                    >
                                                                        No topics in this chapter.
                                                                    </Text>
                                                                ) : (
                                                                    ch.visibleTopics.map(
                                                                        (
                                                                            topic,
                                                                        ) => {
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
                                                                                    {/* Saved Coverage State Indicator */}
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
                                                                                                ? TRACKER_PALETTE.emerald
                                                                                                : TRACKER_PALETTE.muted
                                                                                        }
                                                                                    />

                                                                                    {/* Topic Name & Historical Coverage Metadata */}
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
                                                                                                                TRACKER_PALETTE.amber
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

                                                                                    {/* Unsaved Selection Box (Live mode) */}
                                                                                    {!asOfDate && (
                                                                                        <View
                                                                                            style={[
                                                                                                styles.selectCheckbox,
                                                                                                isSelected &&
                                                                                                    styles.selectCheckboxActive,
                                                                                            ]}
                                                                                        >
                                                                                            {isSelected && (
                                                                                                <Ionicons
                                                                                                    name="checkmark"
                                                                                                    size={
                                                                                                        13
                                                                                                    }
                                                                                                    color="#FFFFFF"
                                                                                                />
                                                                                            )}
                                                                                        </View>
                                                                                    )}
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

                        {/* TAB 2: CHRONOLOGICAL COVERAGE TIMELINE */}
                        {activeTab === "timeline" && (
                            <View style={styles.timelineSection}>
                                {timelineGroups.length === 0 ? (
                                    <EmptyBlock
                                        icon="calendar-clear-outline"
                                        title="No lectures recorded yet"
                                        text={
                                            asOfDate
                                                ? `No coverage events were recorded on or before ${formatCalendarDate(asOfDate)}.`
                                                : "Select topics from the Syllabus Map after class to start building your dated coverage history."
                                        }
                                        actionLabel="Go to Syllabus Map"
                                        onAction={() =>
                                            setActiveTab("hierarchy")
                                        }
                                    />
                                ) : (
                                    timelineGroups.map(([dateStr, dayEvents]) => (
                                        <View
                                            key={dateStr}
                                            style={styles.timelineDateBlock}
                                        >
                                            <View
                                                style={styles.timelineDateHeader}
                                            >
                                                <View
                                                    style={styles.timelineDateDot}
                                                />
                                                <Text
                                                    style={
                                                        styles.timelineDateTitle
                                                    }
                                                >
                                                    {formatCalendarDate(dateStr)}
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.timelineDateCount
                                                    }
                                                >
                                                    {`${dayEvents.length} ${
                                                        dayEvents.length === 1
                                                            ? "session"
                                                            : "sessions"
                                                    }`}
                                                </Text>
                                            </View>

                                            {dayEvents.map((ev) => (
                                                <Pressable
                                                    key={ev.eventId}
                                                    onPress={() => {
                                                        setDeleteError(null);
                                                        setInspectedEvent(ev);
                                                    }}
                                                    style={styles.timelineCard}
                                                >
                                                    <View
                                                        style={
                                                            styles.timelineCardTop
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.timelineCardBadge
                                                            }
                                                        >
                                                            {`${ev.topics.length} ${
                                                                ev.topics
                                                                    .length ===
                                                                1
                                                                    ? "topic"
                                                                    : "topics"
                                                            } covered`}
                                                        </Text>
                                                        <View
                                                            style={
                                                                styles.timelineInspectRow
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.timelineInspectText
                                                                }
                                                            >
                                                                Details / Edit
                                                            </Text>
                                                            <Ionicons
                                                                name="chevron-forward"
                                                                size={13}
                                                                color={
                                                                    TRACKER_PALETTE.muted
                                                                }
                                                            />
                                                        </View>
                                                    </View>

                                                    <View
                                                        style={
                                                            styles.timelineTopicPills
                                                        }
                                                    >
                                                        {ev.topics.map((t) => (
                                                            <View
                                                                key={t.topicId}
                                                                style={
                                                                    styles.timelineTopicTag
                                                                }
                                                            >
                                                                <Text
                                                                    style={
                                                                        styles.timelineTopicTagText
                                                                    }
                                                                    numberOfLines={
                                                                        1
                                                                    }
                                                                >
                                                                    {`Ch ${t.chapterNo} • ${t.topicName}`}
                                                                </Text>
                                                            </View>
                                                        ))}
                                                    </View>

                                                    {!!ev.notes && (
                                                        <Text
                                                            style={
                                                                styles.timelineNote
                                                            }
                                                            numberOfLines={2}
                                                        >
                                                            {`Note: ${ev.notes}`}
                                                        </Text>
                                                    )}
                                                </Pressable>
                                            ))}
                                        </View>
                                    ))
                                )}
                            </View>
                        )}

                        {/* TAB 3: WEEKLY PACE & CHAPTER ANALYTICS */}
                        {activeTab === "analytics" && (
                            <View style={styles.analyticsSection}>
                                <WeeklyActivityCard
                                    buckets={treeData.weeklyActivity}
                                    asOf={asOfDate}
                                />

                                <View style={styles.chapterBreakdownCard}>
                                    <Text style={styles.quickCardTitle}>
                                        CHAPTER-WISE COVERAGE BREAKDOWN
                                    </Text>
                                    {treeData.chapters.map((ch) => {
                                        const pct =
                                            ch.totalTopics > 0
                                                ? Math.round(
                                                      (ch.coveredTopics /
                                                          ch.totalTopics) *
                                                          100,
                                                  )
                                                : 0;
                                        return (
                                            <View
                                                key={ch.chapterId}
                                                style={
                                                    styles.analyticsChapterRow
                                                }
                                            >
                                                <View
                                                    style={
                                                        styles.analyticsChapterTop
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.analyticsChapterTitle
                                                        }
                                                        numberOfLines={1}
                                                    >
                                                        {`Ch ${ch.chapterNo}. ${ch.chapterName}`}
                                                    </Text>
                                                    <Text
                                                        style={
                                                            styles.analyticsChapterStat
                                                        }
                                                    >
                                                        {`${ch.coveredTopics}/${ch.totalTopics} (${pct}%)`}
                                                    </Text>
                                                </View>
                                                <AnimatedCoverageBar
                                                    percent={pct}
                                                    status={ch.status}
                                                    height={6}
                                                />
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </>
                ) : null}
            </View>

            {/* Floating selection bar is rendered via AppShell.floatingFooter */}

            {/* MODALS */}
            <RecordCoverageModal
                visible={recordModalVisible}
                editingEvent={editingEvent}
                subjectLabel={
                    activeSubject
                        ? `${activeSubject.subjectId} — ${activeSubject.subjectName ?? ""}`
                        : "Selected Subject"
                }
                chapters={treeData?.chapters ?? []}
                selectedTopicIds={selectedTopicIds}
                onToggleTopic={toggleTopicSelection}
                onClose={() => setRecordModalVisible(false)}
                onSubmit={handleSaveCoverage}
            />

            <AsOfDateModal
                visible={asOfModalVisible}
                currentAsOf={asOfDate}
                recordedDates={recordedDates}
                onApply={(d) => {
                    setSelectedTopicIds(new Set());
                    setEditingEvent(null);
                    setAsOfDate(d);
                }}
                onReset={() => setAsOfDate(null)}
                onClose={() => setAsOfModalVisible(false)}
            />

            <EventDetailModal
                event={inspectedEvent}
                deleting={deletingEvent}
                error={deleteError}
                onEdit={handleStartEditEvent}
                onConfirmDelete={(id) => void handleConfirmDeleteEvent(id)}
                onClose={() => setInspectedEvent(null)}
            />
        </AppShell>
    );
}

const styles = StyleSheet.create({
    pageWrap: {
        width: "100%",
        maxWidth: 1040,
        alignSelf: "center",
        gap: 16,
        paddingBottom: 28,
    },
    topHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    eyebrowRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: TRACKER_PALETTE.purple,
    },
    eyebrowText: {
        color: TRACKER_PALETTE.muted,
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.9,
    },
    screenTitle: {
        color: TRACKER_PALETTE.text,
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: -0.4,
        marginTop: 2,
    },
    viewerLinkBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.surface,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
    },
    viewerLinkText: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 12,
        fontWeight: "600",
    },
    contextCard: {
        position: "relative",
        overflow: "hidden",
        backgroundColor: TRACKER_PALETTE.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        padding: 16,
        gap: 12,
    },
    contextPillsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    contextBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.borderStrong,
    },
    contextBadgeText: {
        color: TRACKER_PALETTE.text,
        fontSize: 11,
        fontWeight: "700",
    },
    semChipsRow: {
        gap: 8,
        paddingRight: 8,
    },
    semChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
    },
    semChipActive: {
        backgroundColor: TRACKER_PALETTE.purpleGlow,
        borderColor: TRACKER_PALETTE.purpleBorder,
    },
    semChipText: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
        fontWeight: "600",
    },
    semChipTextActive: {
        color: TRACKER_PALETTE.purple,
        fontWeight: "800",
    },
    subjectStrip: {
        gap: 10,
        paddingRight: 8,
    },
    subjectCard: {
        width: 196,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        padding: 12,
        gap: 7,
    },
    subjectCardActive: {
        borderColor: TRACKER_PALETTE.purple,
        backgroundColor: TRACKER_PALETTE.purpleGlow,
    },
    subjectCardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    subjectCode: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.4,
    },
    subjectPct: {
        color: TRACKER_PALETTE.text,
        fontSize: 12,
        fontWeight: "800",
    },
    subjectName: {
        color: TRACKER_PALETTE.text,
        fontSize: 13,
        fontWeight: "700",
        minHeight: 34,
    },
    subjectMeta: {
        color: TRACKER_PALETTE.muted,
        fontSize: 10,
        fontWeight: "600",
    },
    mutedHint: {
        color: TRACKER_PALETTE.muted,
        fontSize: 12,
        paddingVertical: 8,
    },
    noticeBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    noticeSuccess: {
        backgroundColor: TRACKER_PALETTE.emeraldSoft,
        borderColor: TRACKER_PALETTE.emeraldBorder,
    },
    noticeInfo: {
        backgroundColor: TRACKER_PALETTE.amberSoft,
        borderColor: TRACKER_PALETTE.amberBorder,
    },
    noticeText: {
        color: TRACKER_PALETTE.text,
        fontSize: 12,
        fontWeight: "600",
        flex: 1,
    },
    cutoffBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
        padding: 14,
        borderRadius: 14,
        backgroundColor: TRACKER_PALETTE.amberSoft,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.amberBorder,
    },
    cutoffTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    cutoffTitle: {
        color: TRACKER_PALETTE.text,
        fontSize: 13,
        fontWeight: "800",
    },
    cutoffSub: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
        lineHeight: 16,
    },
    cutoffActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    cutoffSmallBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: TRACKER_PALETTE.surface,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.borderStrong,
    },
    cutoffSmallBtnText: {
        color: TRACKER_PALETTE.text,
        fontSize: 11,
        fontWeight: "700",
    },
    cutoffResetBtn: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: TRACKER_PALETTE.purple,
    },
    cutoffResetText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "800",
    },
    overviewRow: {
        gap: 14,
    },
    overviewCard: {
        backgroundColor: TRACKER_PALETTE.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        padding: 16,
    },
    dialAndStats: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
    },
    metricsGrid: {
        flex: 1,
        minWidth: 180,
        gap: 10,
    },
    metricBox: {
        gap: 1,
    },
    metricValue: {
        color: TRACKER_PALETTE.text,
        fontSize: 19,
        fontWeight: "800",
    },
    metricLabel: {
        color: TRACKER_PALETTE.muted,
        fontSize: 11,
        fontWeight: "600",
    },
    chapterBreakdownRow: {
        flexDirection: "row",
        gap: 6,
        marginTop: 2,
    },
    chapterBadgeEmerald: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: TRACKER_PALETTE.emeraldSoft,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.emeraldBorder,
        alignItems: "center",
    },
    chapterBadgeValEmerald: {
        color: TRACKER_PALETTE.emerald,
        fontSize: 13,
        fontWeight: "800",
    },
    chapterBadgeAmber: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: TRACKER_PALETTE.amberSoft,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.amberBorder,
        alignItems: "center",
    },
    chapterBadgeValAmber: {
        color: TRACKER_PALETTE.amber,
        fontSize: 13,
        fontWeight: "800",
    },
    chapterBadgeNeutral: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        alignItems: "center",
    },
    chapterBadgeValNeutral: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 13,
        fontWeight: "800",
    },
    chapterBadgeLbl: {
        color: TRACKER_PALETTE.muted,
        fontSize: 9,
        fontWeight: "700",
        marginTop: 1,
    },
    quickActionsCard: {
        backgroundColor: TRACKER_PALETTE.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        padding: 16,
        gap: 10,
        justifyContent: "space-between",
    },
    quickCardTitle: {
        color: TRACKER_PALETTE.muted,
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.8,
    },
    quickGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    quickBtnPrimary: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.purple,
    },
    quickBtnPrimaryText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "800",
    },
    quickBtn: {
        flex: 1,
        minWidth: 110,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
    },
    quickBtnActive: {
        backgroundColor: TRACKER_PALETTE.purpleGlow,
        borderColor: TRACKER_PALETTE.purpleBorder,
    },
    quickBtnText: {
        color: TRACKER_PALETTE.text,
        fontSize: 11,
        fontWeight: "700",
    },
    tabBar: {
        flexDirection: "row",
        backgroundColor: TRACKER_PALETTE.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        padding: 4,
        gap: 4,
    },
    tabPill: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 9,
        borderRadius: 9,
    },
    tabPillActive: {
        backgroundColor: TRACKER_PALETTE.purple,
    },
    tabPillText: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 12,
        fontWeight: "700",
    },
    tabPillTextActive: {
        color: "#FFFFFF",
    },
    hierarchySection: {
        gap: 12,
    },
    toolbarRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.surface,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
    },
    searchInput: {
        flex: 1,
        color: TRACKER_PALETTE.text,
        fontSize: 13,
    },
    toolbarActionBtn: {
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.surface,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        alignItems: "center",
        justifyContent: "center",
    },
    toolbarActionText: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
        fontWeight: "700",
    },
    chapterTreeList: {
        gap: 10,
    },
    chapterNodeRow: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: 8,
    },
    chapterCard: {
        flex: 1,
        backgroundColor: TRACKER_PALETTE.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        overflow: "hidden",
    },
    chapterCardCovered: {
        borderColor: TRACKER_PALETTE.emeraldBorder,
    },
    chapterCardPartial: {
        borderColor: TRACKER_PALETTE.amberBorder,
    },
    chapterHeaderPress: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 14,
    },
    chapterTagLine: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
    },
    chapterNumBadge: {
        color: TRACKER_PALETTE.purple,
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.6,
    },
    statusPill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
    },
    statusPillCovered: {
        backgroundColor: TRACKER_PALETTE.emeraldSoft,
        borderColor: TRACKER_PALETTE.emeraldBorder,
    },
    statusPillPartial: {
        backgroundColor: TRACKER_PALETTE.amberSoft,
        borderColor: TRACKER_PALETTE.amberBorder,
    },
    statusPillText: {
        color: TRACKER_PALETTE.muted,
        fontSize: 9,
        fontWeight: "700",
    },
    selectedCountPill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: TRACKER_PALETTE.purpleGlow,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.purpleBorder,
    },
    selectedCountPillText: {
        color: TRACKER_PALETTE.purple,
        fontSize: 9,
        fontWeight: "800",
    },
    chapterTitle: {
        color: TRACKER_PALETTE.text,
        fontSize: 14,
        fontWeight: "700",
    },
    chapterProgressLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    chapterCountLabel: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
        fontWeight: "600",
    },
    bulkActionsBar: {
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
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
    },
    bulkChipText: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
        fontWeight: "600",
    },
    topicListWrap: {
        borderTopWidth: 1,
        borderTopColor: TRACKER_PALETTE.border,
        backgroundColor: TRACKER_PALETTE.bg,
        paddingVertical: 4,
    },
    topicRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(39, 39, 50, 0.55)",
    },
    topicRowSelected: {
        backgroundColor: TRACKER_PALETTE.purpleGlow,
    },
    topicNameText: {
        color: TRACKER_PALETTE.text,
        fontSize: 13,
        fontWeight: "500",
    },
    topicNameCovered: {
        color: TRACKER_PALETTE.textSecondary,
    },
    topicMetaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    datePill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
        backgroundColor: TRACKER_PALETTE.emeraldSoft,
    },
    datePillText: {
        color: TRACKER_PALETTE.emerald,
        fontSize: 10,
        fontWeight: "700",
    },
    revisitPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
        backgroundColor: TRACKER_PALETTE.amberSoft,
    },
    revisitPillText: {
        color: TRACKER_PALETTE.amber,
        fontSize: 10,
        fontWeight: "700",
    },
    selectCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: TRACKER_PALETTE.borderStrong,
        backgroundColor: TRACKER_PALETTE.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    selectCheckboxActive: {
        backgroundColor: TRACKER_PALETTE.purple,
        borderColor: TRACKER_PALETTE.purple,
    },
    timelineSection: {
        gap: 14,
    },
    timelineDateBlock: {
        gap: 8,
    },
    timelineDateHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    timelineDateDot: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: TRACKER_PALETTE.purple,
    },
    timelineDateTitle: {
        color: TRACKER_PALETTE.text,
        fontSize: 14,
        fontWeight: "800",
        flex: 1,
    },
    timelineDateCount: {
        color: TRACKER_PALETTE.muted,
        fontSize: 11,
        fontWeight: "600",
    },
    timelineCard: {
        marginLeft: 14,
        backgroundColor: TRACKER_PALETTE.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        padding: 12,
        gap: 8,
    },
    timelineCardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    timelineCardBadge: {
        color: TRACKER_PALETTE.emerald,
        fontSize: 11,
        fontWeight: "800",
    },
    timelineInspectRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    timelineInspectText: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
        fontWeight: "600",
    },
    timelineTopicPills: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    timelineTopicTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        maxWidth: "100%",
    },
    timelineTopicTagText: {
        color: TRACKER_PALETTE.text,
        fontSize: 11,
        fontWeight: "500",
    },
    timelineNote: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 12,
        fontStyle: "italic",
    },
    analyticsSection: {
        gap: 14,
    },
    chapterBreakdownCard: {
        backgroundColor: TRACKER_PALETTE.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        padding: 16,
        gap: 12,
    },
    analyticsChapterRow: {
        gap: 5,
    },
    analyticsChapterTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    analyticsChapterTitle: {
        color: TRACKER_PALETTE.text,
        fontSize: 12,
        fontWeight: "600",
        flex: 1,
    },
    analyticsChapterStat: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
        fontWeight: "700",
    },
    floatingBarWrap: {
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 14,
        alignItems: "center",
    },
    floatingBar: {
        width: "100%",
        maxWidth: 680,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: "#16161D",
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.purpleBorder,
        shadowColor: "#000",
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    floatingCount: {
        color: TRACKER_PALETTE.text,
        fontSize: 13,
        fontWeight: "800",
    },
    floatingSub: {
        color: TRACKER_PALETTE.muted,
        fontSize: 10,
        fontWeight: "600",
    },
    floatingClearBtn: {
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.surfaceMuted,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
    },
    floatingClearText: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 12,
        fontWeight: "700",
    },
    floatingRecordBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: TRACKER_PALETTE.purple,
    },
    floatingRecordText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "800",
    },
});
