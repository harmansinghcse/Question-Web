
/**
 * Question Bank screen.
 *
 * Backend status:
 *   - Subjects: fetched live from GET /api/subjects.
 *   - Questions: NOT YET IMPLEMENTED on the backend.
 *     The screen displays an honest empty/pending state rather than fake data.
 *
 * TODO(BACKEND): Once GET /api/questions is implemented, import `api.getQuestions`
 * and replace the pendingQuestions block below with live filtering.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAppTheme } from '../../providers/ThemeProvider';
import { api, type Subject } from '../../services/api';
import { useApiData } from '../../hooks/use-api-data';
import type { AppTheme } from '../../constants/theme';
import {
  sortSubjects,
  subjectColour,
  subjectDisplayName,
} from '../../constants/subjects';

export default function QuestionBankScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [search, setSearch] = useState('');

  // Live subject list for the filter chips
  const fetchSubjects = useCallback(() => api.getSubjects(), []);
  const subjectsState = useApiData<Subject[]>(fetchSubjects);

  const subjectsData =
    subjectsState.status === 'success' ? subjectsState.data : null;
  const subjects: Subject[] = useMemo(
    () => (subjectsData ? sortSubjects(subjectsData) : []),
    [subjectsData],
  );

  const [selectedSubjectKey, setSelectedSubjectKey] = useState<number | null>(null);

  function handleSubjectChip(key: number | null) {
    setSelectedSubjectKey((prev) => (prev === key ? null : key));
  }

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle={theme.mode === 'light' ? 'dark-content' : 'light-content'}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>YOUR STUDY LIBRARY</Text>
            <Text style={styles.title}>Question Bank</Text>
            <Text style={styles.subtitle}>
              Find, organise and practise questions.
            </Text>
          </View>
        </View>

        {/* ── Summary card ────────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>AVAILABLE QUESTIONS</Text>
            {/* TODO(BACKEND): Show real count once Questions API is live. */}
            <Text style={styles.summaryNumber}>—</Text>
            <Text style={styles.summaryHint}>
              Questions API not yet available
            </Text>
          </View>

          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>✦</Text>
          </View>
        </View>

        {/* ── Search box ──────────────────────────────────────────────── */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search questions..."
            placeholderTextColor={theme.muted}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search questions"
            editable={false} // enabled once Questions API is live
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* ── Quick filter pills ───────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFilters}
        >
          {[
            { label: 'All Subjects', active: true },
            { label: 'PYQs', active: false },
            { label: 'Books', active: false },
            { label: '⭐ High Priority', active: false },
          ].map((item) => (
            <Pressable
              key={item.label}
              style={[styles.quickFilter, item.active && styles.quickFilterActive]}
            >
              <Text style={[styles.quickFilterText, item.active && styles.quickFilterTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Subject filter chips section ─────────────────────────────── */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>☰ Filters</Text>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Subject</Text>
            <View style={styles.filterDropdown}>
              <Text style={styles.filterDropdownText} numberOfLines={1}>
                {selectedSubjectKey == null
                  ? 'All Subjects'
                  : subjectDisplayName(subjects.find((s) => s.subjectKey === selectedSubjectKey)!)}
              </Text>
              <Text style={styles.filterDropdownChevron}>▾</Text>
            </View>
          </View>

          {subjectsState.status === 'loading' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={{ color: theme.muted, fontSize: 12 }}>Loading subjects…</Text>
            </View>
          )}

          {subjectsState.status === 'error' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>
                ⚠ Could not load subjects — {subjectsState.message}
              </Text>
              <Pressable onPress={subjectsState.refresh} style={styles.errorRetry}>
                <Text style={styles.errorRetryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {subjectsState.status === 'success' && subjects.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {/* "All" chip */}
              <Pressable
                key="all"
                onPress={() => handleSubjectChip(null)}
                style={[
                  styles.chip,
                  selectedSubjectKey === null && styles.activeChip,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedSubjectKey === null }}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedSubjectKey === null && styles.activeChipText,
                  ]}
                >
                  All
                </Text>
              </Pressable>

              {subjects.map((s) => {
                const active = selectedSubjectKey === s.subjectKey;
                const colour = subjectColour(s);
                return (
                  <Pressable
                    key={s.subjectKey}
                    onPress={() => handleSubjectChip(s.subjectKey)}
                    style={[
                      styles.chip,
                      active && { backgroundColor: colour, borderColor: colour },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View
                      style={[
                        styles.chipDot,
                        { backgroundColor: active ? '#FFFFFF' : colour },
                      ]}
                    />
                    <Text
                      style={[styles.chipText, active && styles.activeChipText]}
                      numberOfLines={1}
                    >
                      {subjectDisplayName(s)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Filter action buttons */}
          <View style={styles.filterActions}>
            <Pressable style={styles.filterResetBtn}>
              <Text style={styles.filterResetText}>Reset</Text>
            </Pressable>
            <Pressable style={styles.filterApplyBtn}>
              <Text style={styles.filterApplyText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Results area ─────────────────────────────────────────────── */}
        <View style={styles.resultsHeader}>
          <View>
            <Text style={styles.resultsTitle}>Questions</Text>
            <Text style={styles.resultsSubtitle}>0 results found</Text>
          </View>
        </View>

        {/* ── Pending state — Questions API not yet implemented ──────────── */}
        <View style={styles.pendingState}>
          <Text style={styles.pendingIcon}>📋</Text>
          <Text style={styles.pendingTitle}>Questions coming soon</Text>
          <Text style={styles.pendingText}>
            The Questions API is not yet implemented on the backend. Once it is
            ready, questions will appear here automatically — no further
            changes to this screen are needed.
          </Text>
          <Text style={styles.pendingHint}>
            You can still browse subjects and chapters in the Syllabus screen.
          </Text>
          <Pressable
            onPress={() => router.push('/syllabus')}
            style={styles.pendingButton}
            accessibilityRole="button"
          >
            <Text style={styles.pendingButtonText}>Open Syllabus →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  const colors = theme;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingTop: 16,
      paddingBottom: 36,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 22,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backText: {
      color: colors.text,
      fontSize: 32,
      lineHeight: 34,
    },
    headerText: { flex: 1 },
    eyebrow: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginBottom: 5,
    },
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 4,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },
    summaryLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },
    summaryNumber: {
      color: colors.muted,
      fontSize: 34,
      fontWeight: '900',
      marginTop: 6,
    },
    summaryHint: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 3,
    },
    summaryIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryIconText: {
      color: '#FFFFFF',
      fontSize: 26,
      fontWeight: '900',
    },
    searchBox: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      marginBottom: 14,
      gap: 10,
    },
    searchIcon: {
      color: colors.muted,
      fontSize: 22,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      paddingVertical: 12,
      opacity: 0.7,
    },
    clearText: {
      color: colors.muted,
      fontSize: 16,
      padding: 4,
    },
    quickFilters: {
      gap: 8,
      paddingBottom: 18,
    },
    quickFilter: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickFilterActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    quickFilterText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    quickFilterTextActive: {
      color: '#FFFFFF',
    },
    // Filter section
    filterSection: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 22,
      gap: 12,
    },
    filterSectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 4,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    filterLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      width: 60,
    },
    filterDropdown: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    filterDropdownText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    filterDropdownChevron: {
      color: colors.muted,
      fontSize: 12,
    },
    sectionTitle: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    chipRow: {
      gap: 8,
      paddingBottom: 4,
      paddingRight: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      maxWidth: 220,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    activeChip: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      flexShrink: 1,
    },
    activeChipText: {
      color: '#FFFFFF',
    },
    filterActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    filterResetBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    filterResetText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    filterApplyBtn: {
      flex: 2,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
    },
    filterApplyText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    emptyNote: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 22,
    },
    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    resultsTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    resultsSubtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 4,
    },
    // Error banner
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: 13,
      padding: 13,
      marginBottom: 16,
    },
    errorBannerText: {
      color: colors.danger,
      fontSize: 11,
      flex: 1,
    },
    errorRetry: {
      backgroundColor: colors.accent,
      borderRadius: 9,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    errorRetryText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    // Pending / not-yet-implemented state
    pendingState: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 28,
      alignItems: 'center',
    },
    pendingIcon: {
      fontSize: 44,
      marginBottom: 14,
    },
    pendingTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
      marginBottom: 10,
    },
    pendingText: {
      color: colors.muted,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
    },
    pendingHint: {
      color: colors.accent,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 12,
    },
    pendingButton: {
      backgroundColor: colors.accent,
      borderRadius: 13,
      paddingHorizontal: 20,
      paddingVertical: 12,
      marginTop: 20,
    },
    pendingButtonText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 13,
    },
  });
}
