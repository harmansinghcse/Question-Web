
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '../providers/ThemeProvider';
import { api, type Subject } from '../services/api';
import { useApiData } from '../hooks/use-api-data';

// Palette for subject cards — cycles when there are more subjects than colours.
const SUBJECT_COLOURS = [
  '#6387F5',
  '#B17AE8',
  '#24A681',
  '#E89B36',
  '#7654E8',
  '#E8547A',
  '#36A6C6',
];

// Upcoming exams are UI / calendar data — not yet in the database.
// TODO(BACKEND): Replace with aggregated calendar API when available.
const STATIC_EXAMS = [
  { day: '15', month: 'NOV', title: 'Mid Sem - CSE', remaining: '3 days left', level: 'Important' },
  { day: '28', month: 'NOV', title: 'DBMS', remaining: '16 days left', level: 'Medium' },
  { day: '12', month: 'DEC', title: 'OOP', remaining: '30 days left', level: 'Low' },
] as const;

function subjectIcon(subjectId: string): string {
  const map: Record<string, string> = {
    DBMS: '▤', OOP: '</>',  DAA: '⌘', CO: '▦', DM: 'Σ',
    OS: '⚙', CN: '⬡', DS: '◈', SE: '⚒', AI: '✦',
  };
  const key = subjectId.trim().toUpperCase();
  return map[key] ?? '◉';
}

export default function HomeScreen() {
  const router = useRouter();
  const { theme, mode, toggleTheme, ready } = useAppTheme();
  const s = makeStyles(theme);

  // Stable fetcher reference — no dependency on anything that changes.
  const fetchSubjects = useCallback(() => api.getSubjects(), []);
  const subjectsState = useApiData<Subject[]>(fetchSubjects, ready);

  if (!ready) {
    return <View style={[s.screen, { flex: 1 }]} />;
  }

  const subjects =
    subjectsState.status === 'success' ? subjectsState.data : [];

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View style={s.brand}>
          <View style={s.logo}>
            <Text style={s.logoText}>Q</Text>
          </View>
          <View>
            <Text style={s.brandTitle}>Question Web</Text>
            <Text style={s.brandSubtitle}>LEARN · PRACTISE · MASTER</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          onPress={toggleTheme}
          style={s.themeButton}
        >
          <Text style={s.themeIcon}>
            {mode === 'dark' ? '☀' : '☾'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.heroCopy}>
            <Text style={s.eyebrow}>YOUR LEARNING SPACE</Text>
            <Text style={s.heroTitle}>Ready to ace your exams?</Text>
            <Text style={s.heroDescription}>
              Find the right questions, practise smart and make
              progress every day!
            </Text>

            <Pressable
              onPress={() => router.push('/question-bank')}
              style={s.primaryButton}
            >
              <Text style={s.primaryButtonText}>
                Explore Question Bank  →
              </Text>
            </Pressable>
          </View>

          <View style={s.mascotArea}>
            {/* TODO(FRONTEND): Replace placeholder with approved spider mascot artwork. */}
            <Text style={s.mascot}>🕷️</Text>
            <Text style={s.mascotDecoration}>✦  ✧</Text>
            <Text style={s.mascotCaption}>You got this!</Text>
          </View>
        </View>

        {/* ── Your Subjects ─────────────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>✿ Your Subjects</Text>
          <Pressable onPress={() => router.push('/syllabus')}>
            <Text style={s.link}>View All →</Text>
          </Pressable>
        </View>

        {subjectsState.status === 'loading' && (
          <View style={s.loadingRow}>
            <ActivityIndicator color={theme.accent} />
            <Text style={s.loadingText}>Loading subjects…</Text>
          </View>
        )}

        {subjectsState.status === 'error' && (
          <View style={s.inlineError}>
            <Text style={s.inlineErrorText}>
              Could not load subjects.
            </Text>
            <Pressable onPress={subjectsState.refresh} style={s.retrySmall}>
              <Text style={s.retrySmallText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {subjectsState.status === 'success' && subjects.length === 0 && (
          <Text style={s.emptyNote}>No subjects found in the database.</Text>
        )}

        {subjects.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.subjectList}
          >
            {subjects.map((subject, idx) => {
              const colour = SUBJECT_COLOURS[idx % SUBJECT_COLOURS.length];
              return (
                <Pressable
                  key={subject.subjectKey}
                  onPress={() =>
                    router.push({
                      pathname: '/syllabus',
                      params: { subjectKey: subject.subjectKey },
                    } as never)
                  }
                  style={s.subjectCard}
                >
                  <View style={s.subjectIcon}>
                    <Text style={[s.subjectIconText, { color: colour }]}>
                      {subjectIcon(subject.subjectId)}
                    </Text>
                  </View>

                  <Text numberOfLines={1} style={s.subjectName}>
                    {subject.subjectName ?? subject.subjectId}
                  </Text>

                  <Text style={s.subjectMeta}>
                    Sem {subject.semester} · {subject.credits} cr
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── Find Questions ───────────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Find Your Next Question</Text>
        </View>

        <Pressable
          onPress={() => router.push('/question-bank')}
          style={s.searchBox}
        >
          <Text style={s.searchIcon}>⌕</Text>
          <Text style={s.searchPlaceholder}>
            Search by keyword, chapter or topic...
          </Text>
        </Pressable>

        <View style={s.quickFilters}>
          {['All Subjects', 'Previous Papers', 'Books', '⭐ High Priority'].map(
            (item) => (
              <Pressable
                key={item}
                onPress={() => router.push('/question-bank')}
                style={s.quickFilter}
              >
                <Text style={s.quickFilterText}>{item}</Text>
              </Pressable>
            ),
          )}
        </View>

        {/* ── Recommended Questions ─────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recommended for You</Text>
          <Pressable onPress={() => router.push('/question-bank')}>
            <Text style={s.link}>See all →</Text>
          </Pressable>
        </View>

        {/* Questions API is not yet implemented on the backend.
            Showing an informational placeholder instead of fabricated data. */}
        <View style={s.pendingCard}>
          <Text style={s.pendingIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.pendingTitle}>Questions coming soon</Text>
            <Text style={s.pendingText}>
              The Questions API is not yet available. Visit the Question Bank
              screen to explore the question browser once the backend is ready.
            </Text>
          </View>
        </View>

        {/* ── Upcoming Exams ────────────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Upcoming Exams</Text>
          {/* TODO(BACKEND): Link to a calendar/exam API when implemented. */}
          <Text style={s.mutedNote}>Demo</Text>
        </View>

        {STATIC_EXAMS.map((exam) => (
          <View key={exam.title} style={s.examCard}>
            <View style={s.examDate}>
              <Text style={s.examDay}>{exam.day}</Text>
              <Text style={s.examMonth}>{exam.month}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.examTitle}>{exam.title}</Text>
              <Text style={s.examRemaining}>{exam.remaining}</Text>
            </View>
            <Text style={s.examLevel}>{exam.level}</Text>
          </View>
        ))}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={s.footerMascot}>🕷️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.footerTitle}>Keep it up!</Text>
            <Text style={s.footerText}>
              One question at a time.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={s.bottomBar}>
        {[
          { label: 'Home', icon: '⌂', path: '/' },
          { label: 'Questions', icon: '▤', path: '/question-bank' },
          { label: 'Syllabus', icon: '☑', path: '/syllabus' },
          { label: 'Prompt Studio', icon: '✧', path: '/prompt-studio' },
        ].map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.path as never)}
            style={s.navItem}
          >
            <Text style={[s.navIcon, index === 0 && s.navActive]}>
              {item.icon}
            </Text>
            <Text style={[s.navLabel, index === 0 && s.navActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(t: import('../constants/theme').AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logo: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: { color: '#FFFFFF', fontWeight: '900', fontSize: 23 },
    brandTitle: { color: t.text, fontWeight: '900', fontSize: 17 },
    brandSubtitle: { color: t.muted, fontSize: 8, marginTop: 3, letterSpacing: 1 },
    themeButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: t.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeIcon: { color: t.text, fontSize: 23 },
    content: { padding: 16, paddingBottom: 28 },
    hero: {
      padding: 19,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surfaceAlt,
      overflow: 'hidden',
    },
    heroCopy: { maxWidth: '100%' },
    eyebrow: { color: t.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
    heroTitle: { color: t.text, fontSize: 25, fontWeight: '900', lineHeight: 32, marginTop: 10 },
    heroDescription: { color: t.muted, fontSize: 12, lineHeight: 19, marginTop: 8 },
    primaryButton: {
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 12,
      alignSelf: 'flex-start',
      marginTop: 15,
    },
    primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
    mascotArea: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    mascot: { fontSize: 42 },
    mascotDecoration: { color: t.accent, fontSize: 23 },
    mascotCaption: { color: t.muted, fontSize: 10 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 23,
      marginBottom: 12,
    },
    sectionTitle: { color: t.text, fontSize: 16, fontWeight: '900' },
    link: { color: t.accent, fontSize: 11, fontWeight: '800' },
    mutedNote: { color: t.muted, fontSize: 10 },
    // Loading / error inline states
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    loadingText: { color: t.muted, fontSize: 12 },
    inlineError: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.danger,
      borderRadius: 13,
      padding: 14,
      marginBottom: 8,
    },
    inlineErrorText: { color: t.danger, fontSize: 12, flex: 1 },
    retrySmall: {
      backgroundColor: t.accent,
      borderRadius: 9,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    retrySmallText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    emptyNote: { color: t.muted, fontSize: 12, marginBottom: 8 },
    // Subject cards
    subjectList: { paddingRight: 6 },
    subjectCard: {
      width: 140,
      padding: 13,
      marginRight: 10,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    subjectIcon: {
      width: 39,
      height: 39,
      borderRadius: 14,
      backgroundColor: t.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    subjectIconText: { fontSize: 18, fontWeight: '900' },
    subjectName: { color: t.text, fontSize: 12, fontWeight: '800' },
    subjectMeta: { color: t.muted, fontSize: 9, marginTop: 8 },
    // Search
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 13,
    },
    searchIcon: { color: t.accent, fontSize: 23 },
    searchPlaceholder: { color: t.muted, fontSize: 11, flex: 1 },
    quickFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
    quickFilter: { backgroundColor: t.surfaceAlt, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 11 },
    quickFilterText: { color: t.text, fontSize: 10, fontWeight: '700' },
    // Pending / no-data card
    pendingCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
    },
    pendingIcon: { fontSize: 28 },
    pendingTitle: { color: t.text, fontSize: 13, fontWeight: '800' },
    pendingText: { color: t.muted, fontSize: 11, lineHeight: 18, marginTop: 5 },
    // Exam cards
    examCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 15, padding: 12, marginBottom: 9 },
    examDate: { width: 45, height: 48, borderRadius: 12, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' },
    examDay: { color: t.accent, fontWeight: '900', fontSize: 17 },
    examMonth: { color: t.accent, fontWeight: '800', fontSize: 8 },
    examTitle: { color: t.text, fontSize: 12, fontWeight: '800' },
    examRemaining: { color: t.muted, fontSize: 10, marginTop: 5 },
    examLevel: { color: t.accent, fontSize: 9, fontWeight: '800' },
    // Footer
    footer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceAlt, padding: 16, borderRadius: 17, marginTop: 18 },
    footerMascot: { fontSize: 35 },
    footerTitle: { color: t.text, fontSize: 13, fontWeight: '900' },
    footerText: { color: t.muted, fontSize: 11, marginTop: 5 },
    // Bottom navigation
    bottomBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.border,
      paddingTop: 10,
      paddingBottom: 8,
    },
    navItem: { alignItems: 'center', gap: 4, flex: 1 },
    navIcon: { color: t.muted, fontSize: 21 },
    navActive: { color: t.accent, fontWeight: '900' },
    navLabel: { color: t.muted, fontSize: 9, fontWeight: '700' },
  });
}
