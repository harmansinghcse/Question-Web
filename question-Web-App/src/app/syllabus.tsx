
/**
 * Syllabus screen — three-level drill-down: Subject → Chapter → Topic.
 *
 * Data flow:
 *   1. Load all subjects from GET /api/subjects on mount.
 *   2. When the user taps a subject, fetch chapters via GET /api/chapters?subjectKey=<n>.
 *   3. When the user taps a chapter, fetch topics via GET /api/topics?chapterId=<n>.
 *
 * Data is fetched on demand — no pre-loading of descendant data.
 *
 * If this screen is opened from the home screen with a `subjectKey` param,
 * that subject is pre-selected automatically.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api, type Chapter, type Subject, type Topic } from '../services/api';
import { useApiData } from '../hooks/use-api-data';
import { useAppTheme } from '../providers/ThemeProvider';
import type { AppTheme } from '../constants/theme';
import {
  sortSubjects,
  subjectCode,
  subjectColour,
  subjectDisplayName,
  subjectIcon,
  subjectMeta,
} from '../constants/subjects';

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function LoadingRow({ label, accent }: { label: string; accent: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}>
      <ActivityIndicator color={accent} size="small" />
      <Text style={{ color: accent, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

function ErrorCard({
  message,
  onRetry,
  styles,
}: {
  message: string;
  onRetry: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorIcon}>⚠</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.errorTitle}>Could not load data</Text>
        <Text style={styles.errorMessage} numberOfLines={3}>
          {message}
        </Text>
      </View>
      <Pressable onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function EmptyCard({
  text,
  styles,
}: {
  text: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>☁</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}


// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SyllabusScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectKey?: string }>();

  // Store selected subject KEY (number) and chapter as state.
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | null>(
    () => {
      const k = Number(params.subjectKey);
      return Number.isFinite(k) && k > 0 ? k : null;
    },
  );
  const [selectedChapterKey, setSelectedChapterKey] = useState<number | null>(null);

  // ── Subjects ──────────────────────────────────────────────────────────────
  const fetchSubjects = useCallback(() => api.getSubjects(), []);
  const subjectsState = useApiData<Subject[]>(fetchSubjects);

  // ── Derived: resolve subject object from key ──────────────────────────────
  const subjectsData =
    subjectsState.status === 'success' ? subjectsState.data : null;
  const subjects = useMemo(
    () => (subjectsData ? sortSubjects(subjectsData) : []),
    [subjectsData],
  );

  const selectedSubject = useMemo(
    () => (selectedSubjectKey != null ? (subjects.find((s) => s.subjectKey === selectedSubjectKey) ?? null) : null),
    [subjects, selectedSubjectKey],
  );

  // ── Chapters ──────────────────────────────────────────────────────────────
  const fetchChapters = useCallback(
    () =>
      selectedSubjectKey != null
        ? api.getChapters(selectedSubjectKey)
        : Promise.resolve([]),
    [selectedSubjectKey],
  );
  const chaptersState = useApiData<Chapter[]>(fetchChapters, selectedSubjectKey != null);

  const chaptersData =
    chaptersState.status === 'success' ? chaptersState.data : null;
  const chapters = useMemo(
    () =>
      chaptersData
        ? [...chaptersData].sort((a, b) => a.chapterNo - b.chapterNo)
        : [],
    [chaptersData],
  );

  const selectedChapter = useMemo(
    () => (selectedChapterKey != null ? (chapters.find((c) => c.chapterId === selectedChapterKey) ?? null) : null),
    [chapters, selectedChapterKey],
  );

  // ── Topics ────────────────────────────────────────────────────────────────
  const fetchTopics = useCallback(
    () =>
      selectedChapterKey != null
        ? api.getTopics(selectedChapterKey)
        : Promise.resolve([]),
    [selectedChapterKey],
  );
  const topicsState = useApiData<Topic[]>(fetchTopics, selectedChapterKey != null);

  const topics = topicsState.status === 'success' ? topicsState.data : [];

  // ── Helpers ───────────────────────────────────────────────────────────────
  function selectSubject(key: number | null) {
    setSelectedSubjectKey(key);
    setSelectedChapterKey(null);
  }

  function selectChapter(id: number | null) {
    setSelectedChapterKey(id);
  }

  // ── Semester filter + grouping ────────────────────────────────────────────
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null);

  const semesters = useMemo(
    () => Array.from(new Set(subjects.map((s) => s.semester ?? 0))).sort((a, b) => a - b),
    [subjects],
  );

  const groupedSubjects = useMemo(() => {
    const groups = new Map<number, Subject[]>();
    for (const s of subjects) {
      const sem = s.semester ?? 0;
      if (semesterFilter != null && sem !== semesterFilter) continue;
      if (!groups.has(sem)) groups.set(sem, []);
      groups.get(sem)!.push(s);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [subjects, semesterFilter]);

  const totalCredits = useMemo(
    () => subjects.reduce((sum, s) => sum + (s.credits ?? 0), 0),
    [subjects],
  );

  // ── Inline renderers ──────────────────────────────────────────────────────
  function renderTopics(colour: string) {
    return (
      <View style={[styles.topicList, { borderLeftColor: colour + '55' }]}>
        {topicsState.status === 'loading' && (
          <LoadingRow label="Loading topics…" accent={colour} />
        )}
        {topicsState.status === 'error' && (
          <ErrorCard
            message={topicsState.message}
            onRetry={topicsState.refresh}
            styles={styles}
          />
        )}
        {topicsState.status === 'success' && topics.length === 0 && (
          <Text style={styles.inlineEmpty}>No topics found for this chapter.</Text>
        )}
        {topics.map((topic, i) => (
          <View key={topic.topicId} style={styles.topicRow}>
            <View style={[styles.topicDot, { backgroundColor: colour }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.topicName}>{topic.topicName}</Text>
              {/* Questions API is not yet implemented on the backend. */}
              <Text style={styles.topicQStatus}>
                Topic {i + 1} · Questions not yet available
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  function renderChapters(subject: Subject, colour: string) {
    return (
      <View style={styles.chapterList}>
        {chaptersState.status === 'loading' && (
          <LoadingRow label="Loading chapters…" accent={colour} />
        )}
        {chaptersState.status === 'error' && (
          <ErrorCard
            message={chaptersState.message}
            onRetry={chaptersState.refresh}
            styles={styles}
          />
        )}
        {chaptersState.status === 'success' && chapters.length === 0 && (
          <Text style={styles.inlineEmpty}>No chapters found for this subject.</Text>
        )}
        {chaptersState.status === 'success' && chapters.length > 0 && (
          <Text style={styles.chapterCount}>
            {chapters.length} {chapters.length === 1 ? 'CHAPTER' : 'CHAPTERS'}
          </Text>
        )}

        {chapters.map((chapter) => {
          const active = selectedChapter?.chapterId === chapter.chapterId;
          return (
            <View key={chapter.chapterId}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select chapter ${chapter.chapterName} of ${subjectDisplayName(subject)}`}
                accessibilityState={{ expanded: active }}
                onPress={() => selectChapter(active ? null : chapter.chapterId)}
                style={({ pressed }) => [
                  styles.chapterRow,
                  active && { borderColor: colour, backgroundColor: colour + '14' },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={[styles.chapterNo, { backgroundColor: colour + '22' }]}>
                  <Text style={[styles.chapterNoText, { color: colour }]}>
                    {chapter.chapterNo}
                  </Text>
                </View>
                <Text
                  style={[styles.chapterName, active && { color: colour }]}
                  numberOfLines={2}
                >
                  {chapter.chapterName}
                </Text>
                <Text style={[styles.chapterArrow, active && { color: colour }]}>
                  {active ? '⌄' : '›'}
                </Text>
              </Pressable>
              {active && renderTopics(colour)}
            </View>
          );
        })}
      </View>
    );
  }


  return (
    <View style={styles.screen}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>CURRICULUM</Text>
          <Text style={styles.title}>Syllabus</Text>
          <Text style={styles.subtitle}>
            {selectedChapter
              ? selectedChapter.chapterName
              : selectedSubject
              ? subjectDisplayName(selectedSubject)
              : 'Select a subject to get started'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Overview stats ───────────────────────────────────────────── */}
        {subjects.length > 0 && (
          <View style={styles.statsRow}>
            {[
              { label: 'SUBJECTS', value: subjects.length },
              { label: 'SEMESTERS', value: semesters.filter((s) => s > 0).length },
              { label: 'CREDITS', value: totalCredits },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Semester filter pills ─────────────────────────────────────── */}
        {semesters.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {[null, ...semesters].map((sem) => {
              const active = semesterFilter === sem;
              return (
                <Pressable
                  key={sem ?? 'all'}
                  onPress={() => setSemesterFilter(sem)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {sem == null ? 'All' : sem === 0 ? 'Other' : `Sem ${sem}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {subjectsState.status === 'loading' && (
          <LoadingRow label="Loading subjects…" accent={theme.accent} />
        )}
        {subjectsState.status === 'error' && (
          <ErrorCard
            message={subjectsState.message}
            onRetry={subjectsState.refresh}
            styles={styles}
          />
        )}
        {subjectsState.status === 'success' && subjects.length === 0 && (
          <EmptyCard
            text="No subjects found. Ask your administrator to add subjects to the database."
            styles={styles}
          />
        )}

        {/* ── Vertical subject list, grouped by semester ────────────────── */}
        {groupedSubjects.map(([sem, list]) => (
          <View key={sem} style={styles.semesterGroup}>
            <View style={styles.semesterHeader}>
              <Text style={styles.semesterTitle}>
                {sem === 0 ? 'OTHER' : `SEMESTER ${sem}`}
              </Text>
              <View style={styles.semesterLine} />
              <Text style={styles.semesterCount}>
                {list.length} {list.length === 1 ? 'subject' : 'subjects'}
              </Text>
            </View>

            {list.map((subject) => {
              const active = selectedSubject?.subjectKey === subject.subjectKey;
              const colour = subjectColour(subject);
              const name = subjectDisplayName(subject);
              const code = subjectCode(subject);
              return (
                <View
                  key={subject.subjectKey}
                  style={[
                    styles.subjectCard,
                    active && { borderColor: colour },
                  ]}
                >
                  <View style={[styles.subjectAccent, { backgroundColor: colour }]} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${active ? 'Collapse' : 'Expand'} subject ${name}`}
                    accessibilityState={{ expanded: active }}
                    onPress={() => selectSubject(active ? null : subject.subjectKey)}
                    style={({ pressed }) => [
                      styles.subjectRow,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={[styles.subjectIconBox, { backgroundColor: colour + '26' }]}>
                      <Text
                        style={[styles.subjectIcon, { color: colour }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {subjectIcon(subject)}
                      </Text>
                    </View>
                    <View style={styles.subjectBody}>
                      <Text
                        style={[styles.subjectName, active && { color: colour }]}
                        numberOfLines={2}
                      >
                        {name}
                      </Text>
                      <View style={styles.subjectMetaRow}>
                        {code !== '' && code !== name && (
                          <View style={[styles.codeBadge, { borderColor: colour + '55' }]}>
                            <Text style={[styles.codeBadgeText, { color: colour }]}>
                              {code}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.subjectMeta} numberOfLines={1}>
                          {subjectMeta(subject)}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.expandButton,
                        active && { backgroundColor: colour },
                      ]}
                    >
                      <Text style={[styles.expandIcon, active && { color: '#FFFFFF' }]}>
                        {active ? '−' : '+'}
                      </Text>
                    </View>
                  </Pressable>

                  {active && renderChapters(subject, colour)}
                </View>
              );
            })}
          </View>
        ))}

        {/* Bottom padding */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      backgroundColor: t.surface,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backText: { color: t.text, fontSize: 32, lineHeight: 34 },
    headerText: { flex: 1 },
    eyebrow: { color: t.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    title: { color: t.text, fontSize: 26, fontWeight: '900' },
    subtitle: { color: t.muted, fontSize: 12, marginTop: 4 },
    content: { padding: 16 },
    // Stats strip
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statCard: {
      flex: 1,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    statValue: { color: t.text, fontSize: 22, fontWeight: '900' },
    statLabel: { color: t.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
    // Semester filter pills
    filterRow: { gap: 8, paddingBottom: 16, paddingRight: 8 },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    filterPillActive: { backgroundColor: t.accent, borderColor: t.accent },
    filterText: { color: t.text, fontSize: 12, fontWeight: '700' },
    filterTextActive: { color: '#FFFFFF' },
    // Semester groups
    semesterGroup: { marginTop: 18 },
    semesterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    semesterTitle: { color: t.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    semesterLine: { flex: 1, height: 1, backgroundColor: t.border },
    semesterCount: { color: t.muted, fontSize: 10, fontWeight: '700' },
    // Subject cards (vertical, full width)
    subjectCard: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 18,
      marginBottom: 10,
      overflow: 'hidden',
    },
    subjectAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },
    subjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingLeft: 16,
      paddingRight: 14,
    },
    subjectIconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    subjectIcon: { fontSize: 18, fontWeight: '900' },
    subjectBody: { flex: 1 },
    subjectName: { color: t.text, fontSize: 15, fontWeight: '800', lineHeight: 20 },
    subjectMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    codeBadge: {
      borderWidth: 1,
      borderRadius: 7,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    codeBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    subjectMeta: { color: t.muted, fontSize: 11, flexShrink: 1 },
    expandButton: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: t.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    expandIcon: { color: t.text, fontSize: 18, fontWeight: '800', lineHeight: 20 },
    // Chapters
    chapterList: {
      borderTopWidth: 1,
      borderTopColor: t.border,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 6,
      marginLeft: 4,
    },
    chapterCount: {
      color: t.muted,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.3,
      marginBottom: 8,
      marginLeft: 4,
    },
    chapterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.background,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 14,
      padding: 11,
      marginBottom: 8,
    },
    chapterNo: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chapterNoText: { fontWeight: '900', fontSize: 14 },
    chapterName: { flex: 1, color: t.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
    chapterArrow: { color: t.muted, fontSize: 18, fontWeight: '700' },
    // Topics
    topicList: {
      borderLeftWidth: 2,
      marginLeft: 26,
      paddingLeft: 14,
      marginBottom: 10,
      marginTop: 2,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 7,
    },
    topicDot: { width: 7, height: 7, borderRadius: 4, marginTop: 7 },
    topicName: { color: t.text, fontSize: 13, fontWeight: '600', lineHeight: 20 },
    topicQStatus: { color: t.muted, fontSize: 10, marginTop: 2 },
    inlineEmpty: { color: t.muted, fontSize: 12, paddingVertical: 10, paddingHorizontal: 4 },
    // Error card
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.danger,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    errorIcon: { color: t.danger, fontSize: 22 },
    errorTitle: { color: t.danger, fontWeight: '900', fontSize: 13 },
    errorMessage: { color: t.muted, fontSize: 11, marginTop: 4 },
    retryButton: {
      backgroundColor: t.accent,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    retryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    // Empty card
    emptyCard: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 16,
      padding: 28,
      alignItems: 'center',
      marginBottom: 12,
    },
    emptyIcon: { color: t.muted, fontSize: 32, marginBottom: 10 },
    emptyText: { color: t.muted, fontSize: 12, textAlign: 'center', lineHeight: 19 },
  });
}
