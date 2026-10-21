
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

const SUBJECT_COLOURS = [
  '#6387F5', '#B17AE8', '#24A681',
  '#E89B36', '#7654E8', '#E8547A', '#36A6C6',
];

function subjectColour(idx: number) {
  return SUBJECT_COLOURS[idx % SUBJECT_COLOURS.length];
}

function subjectIcon(subjectId: string): string {
  const map: Record<string, string> = {
    DBMS: '▤', OOP: '</>', DAA: '⌘', CO: '▦', DM: 'Σ',
    OS: '⚙', CN: '⬡', DS: '◈', SE: '⚒', AI: '✦',
  };
  return map[subjectId.trim().toUpperCase()] ?? '◉';
}

// ─── Shared UI primitives ────────────────────────────────────────────────────

function LoadingRow({ label, accent }: { label: string; accent: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}>
      <ActivityIndicator color={accent} />
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


// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SyllabusScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectKey?: string }>();

  // Store selected subject KEY (number) and chapter as state.
  // Using the key instead of the full object avoids object identity issues.
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

  // ── Derived: resolve subject object from key ───────────────────────────────
  const subjects = useMemo(
    () => (subjectsState.status === 'success' ? subjectsState.data : []),
    [subjectsState],
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

  const chapters = useMemo(
    () => (chaptersState.status === 'success' ? chaptersState.data : []),
    [chaptersState],
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

  const topics = useMemo(
    () => (topicsState.status === 'success' ? topicsState.data : []),
    [topicsState],
  );

  // ── Colour map ────────────────────────────────────────────────────────────
  const subjectColourMap = useMemo(() => {
    const m = new Map<number, string>();
    subjects.forEach((s, i) => m.set(s.subjectKey, subjectColour(i)));
    return m;
  }, [subjects]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function selectSubject(key: number | null) {
    setSelectedSubjectKey(key);
    setSelectedChapterKey(null);
  }

  function selectChapter(id: number | null) {
    setSelectedChapterKey(id);
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
              ? selectedSubject.subjectName ?? selectedSubject.subjectId
              : 'Select a subject to get started'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Subjects ──────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>SUBJECTS</Text>

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

        {subjects.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectRow}
          >
            {subjects.map((subject) => {
              const active = selectedSubject?.subjectKey === subject.subjectKey;
              const colour = subjectColourMap.get(subject.subjectKey) ?? theme.accent;
              return (
                <Pressable
                  key={subject.subjectKey}
                  accessibilityRole="button"
                  accessibilityLabel={`Select subject ${subject.subjectName ?? subject.subjectId}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setSelectedSubject(active ? null : subject);
                    setSelectedChapter(null);
                  }}
                  style={[
                    styles.subjectChip,
                    active && { borderColor: colour, backgroundColor: colour + '22' },
                  ]}
                >
                  <Text style={[styles.subjectChipIcon, { color: colour }]}>
                    {subjectIcon(subject.subjectId)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.subjectChipName,
                        active && { color: colour },
                      ]}
                      numberOfLines={1}
                    >
                      {subject.subjectName ?? subject.subjectId}
                    </Text>
                    <Text style={styles.subjectChipMeta}>
                      Sem {subject.semester} · {subject.credits} cr
                    </Text>
                  </View>
                  {active && (
                    <Text style={[styles.activeCheck, { color: colour }]}>✓</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── Chapters ──────────────────────────────────────────────────── */}
        {selectedSubject && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>CHAPTERS</Text>
              <Text style={styles.sectionContext}>
                {selectedSubject.subjectName ?? selectedSubject.subjectId}
              </Text>
            </View>

            {chaptersState.status === 'loading' && (
              <LoadingRow label="Loading chapters…" accent={theme.accent} />
            )}
            {chaptersState.status === 'error' && (
              <ErrorCard
                message={chaptersState.message}
                onRetry={chaptersState.refresh}
                styles={styles}
              />
            )}
            {chaptersState.status === 'success' && chapters.length === 0 && (
              <EmptyCard
                text="No chapters found for this subject."
                styles={styles}
              />
            )}

            {chapters.map((chapter) => {
              const active = selectedChapter?.chapterId === chapter.chapterId;
              const colour =
                subjectColourMap.get(selectedSubject.subjectKey) ?? theme.accent;
              return (
                <Pressable
                  key={chapter.chapterId}
                  accessibilityRole="button"
                  accessibilityLabel={`Select chapter ${chapter.chapterName}`}
                  accessibilityState={{ selected: active }}
                  onPress={() =>
                    setSelectedChapter(active ? null : chapter)
                  }
                  style={[styles.chapterCard, active && { borderColor: colour }]}
                >
                  <View style={[styles.chapterNo, { backgroundColor: colour + '22' }]}>
                    <Text style={[styles.chapterNoText, { color: colour }]}>
                      {chapter.chapterNo}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.chapterName,
                        active && { color: colour },
                      ]}
                    >
                      {chapter.chapterName}
                    </Text>
                  </View>
                  <Text style={styles.chapterArrow}>
                    {active ? '▼' : '›'}
                  </Text>
                </Pressable>
              );
            })}
          </>
        )}

        {/* ── Topics ────────────────────────────────────────────────────── */}
        {selectedChapter && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>TOPICS</Text>
              <Text style={styles.sectionContext}>
                Ch. {selectedChapter.chapterNo} — {selectedChapter.chapterName}
              </Text>
            </View>

            {topicsState.status === 'loading' && (
              <LoadingRow label="Loading topics…" accent={theme.accent} />
            )}
            {topicsState.status === 'error' && (
              <ErrorCard
                message={topicsState.message}
                onRetry={topicsState.refresh}
                styles={styles}
              />
            )}
            {topicsState.status === 'success' && topics.length === 0 && (
              <EmptyCard
                text="No topics found for this chapter."
                styles={styles}
              />
            )}

            {topics.map((topic) => (
              <View key={topic.topicId} style={styles.topicCard}>
                <Text style={styles.topicBullet}>◈</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.topicName}>{topic.topicName}</Text>

                  {/* Questions API is not yet implemented on the backend. */}
                  <Text style={styles.topicQStatus}>
                    Questions: not yet available
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Bottom padding so last card clears the safe area */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: t.surface,
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
    sectionLabel: {
      color: t.muted,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.5,
      marginBottom: 12,
      marginTop: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      marginTop: 24,
    },
    sectionContext: { color: t.accent, fontSize: 10, fontWeight: '700' },
    // Subject chips (horizontal scroll)
    subjectRow: { gap: 10, paddingBottom: 4, paddingRight: 8 },
    subjectChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minWidth: 160,
    },
    subjectChipIcon: { fontSize: 20, fontWeight: '900' },
    subjectChipName: { color: t.text, fontSize: 13, fontWeight: '800' },
    subjectChipMeta: { color: t.muted, fontSize: 10, marginTop: 3 },
    activeCheck: { fontSize: 16, fontWeight: '900' },
    // Chapter cards
    chapterCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
    },
    chapterNo: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chapterNoText: { fontWeight: '900', fontSize: 16 },
    chapterName: { color: t.text, fontSize: 14, fontWeight: '800' },
    chapterArrow: { color: t.muted, fontSize: 18 },
    // Topic cards
    topicCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 14,
      padding: 13,
      marginBottom: 9,
    },
    topicBullet: { color: t.accent, fontSize: 16, marginTop: 2 },
    topicName: { color: t.text, fontSize: 13, fontWeight: '700', lineHeight: 20 },
    topicQStatus: { color: t.muted, fontSize: 10, marginTop: 5 },
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
      padding: 24,
      alignItems: 'center',
      marginBottom: 12,
    },
    emptyIcon: { color: t.muted, fontSize: 32, marginBottom: 10 },
    emptyText: { color: t.muted, fontSize: 12, textAlign: 'center', lineHeight: 19 },
  });
}
