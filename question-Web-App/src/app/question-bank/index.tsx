
import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { questions } from '../../data/questions';
import { useAppTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '@/constants/theme';

const subjects = ['All', 'DBMS', 'OOP', 'DAA', 'OS'];
const priorities = ['All', 'High', 'Medium', 'Low'] as const;

export default function QuestionBankScreen() {
  const { theme } = useAppTheme();

  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All');
  const [priority, setPriority] =
    useState<(typeof priorities)[number]>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesSearch =
        !term ||
        question.title.toLowerCase().includes(term) ||
        question.chapter.toLowerCase().includes(term) ||
        question.subject.toLowerCase().includes(term);

      const matchesSubject =
        subject === 'All' || question.subject === subject;

      const matchesPriority =
        priority === 'All' || question.priority === priority;

      return matchesSearch && matchesSubject && matchesPriority;
    });
  }, [search, subject, priority]);

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle={theme.background === 'light' ? 'dark-content' : 'light-content'}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
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

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>AVAILABLE QUESTIONS</Text>
            <Text style={styles.summaryNumber}>{questions.length}</Text>
            <Text style={styles.summaryHint}>
              Across your subjects
            </Text>
          </View>

          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>✦</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search questions, chapters..."
            placeholderTextColor={theme.muted}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search questions"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>SUBJECT</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {subjects.map((item) => {
            const active = subject === item;

            return (
              <Pressable
                key={item}
                onPress={() => setSubject(item)}
                style={[styles.chip, active && styles.activeChip]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && styles.activeChipText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>PRIORITY</Text>
        <View style={styles.priorityRow}>
          {priorities.map((item) => {
            const active = priority === item;

            return (
              <Pressable
                key={item}
                onPress={() => setPriority(item)}
                style={[
                  styles.priorityChip,
                  active && styles.activeChip,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && styles.activeChipText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.resultsHeader}>
          <View>
            <Text style={styles.resultsTitle}>Explore questions</Text>
            <Text style={styles.resultsSubtitle}>
              {filteredQuestions.length} result
              {filteredQuestions.length === 1 ? '' : 's'} found
            </Text>
          </View>

          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>
              {selectedIds.length} selected
            </Text>
          </View>
        </View>

        {filteredQuestions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No questions found</Text>
            <Text style={styles.emptyText}>
              Try another search or change your filters.
            </Text>
            <Pressable
              onPress={() => {
                setSearch('');
                setSubject('All');
                setPriority('All');
              }}
              style={styles.resetButton}
            >
              <Text style={styles.resetText}>Reset filters</Text>
            </Pressable>
          </View>
        ) : (
          filteredQuestions.map((question) => {
            const selected = selectedIds.includes(question.id);

            return (
              <View key={question.id} style={styles.questionCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.subjectBadge}>
                    <Text style={styles.subjectBadgeText}>
                      {question.subject}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => toggleSelection(question.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`Select ${question.title}`}
                    style={[
                      styles.selectButton,
                      selected && styles.selectedButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        selected && styles.selectedButtonText,
                      ]}
                    >
                      {selected ? '✓' : '+'}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/question-bank/[id]',
                      params: { id: question.id },
                    })
                  }
                >
                  <Text style={styles.questionTitle}>
                    {question.title}
                  </Text>

                  <Text style={styles.chapterText}>
                    Chapter: {question.chapter}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.metaText}>
                      {question.marks} marks
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>
                      {question.source}
                      {question.year ? ` · ${question.year}` : ''}
                    </Text>
                  </View>

                  <View style={styles.cardBottomRow}>
                    <View
                      style={[
                        styles.priorityBadge,
                        question.priority === 'High' &&
                          styles.highPriority,
                        question.priority === 'Medium' &&
                          styles.mediumPriority,
                        question.priority === 'Low' &&
                          styles.lowPriority,
                      ]}
                    >
                      <Text style={styles.priorityText}>
                        {question.priority} priority
                      </Text>
                    </View>

                    <Text style={styles.viewDetails}>
                      View details ›
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          })
        )}

        {selectedIds.length > 0 && (
          <View style={styles.selectionPanel}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectionTitle}>
                {selectedIds.length} questions selected
              </Text>
              <Text style={styles.selectionSubtitle}>
                Ready for your study session
              </Text>
            </View>

            <Pressable
              onPress={() => setSelectedIds([])}
              style={styles.clearSelectionButton}
            >
              <Text style={styles.clearSelectionText}>Clear</Text>
            </Pressable>
          </View>
        )}
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
      borderRadius: 14,
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
    headerText: {
      flex: 1,
    },
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
      borderRadius: 22,
      padding: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    summaryLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },
    summaryNumber: {
      color: colors.text,
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
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryIconText: {
      color: '#FFFFFF',
      fontSize: 28,
      fontWeight: '900',
    },
    searchBox: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      marginBottom: 24,
      gap: 10,
    },
    searchIcon: {
      color: colors.muted,
      fontSize: 25,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      paddingVertical: 12,
    },
    clearText: {
      color: colors.muted,
      fontSize: 16,
      padding: 4,
    },
    sectionTitle: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    chipRow: {
      gap: 9,
      paddingBottom: 22,
    },
    chip: {
      paddingHorizontal: 17,
      paddingVertical: 10,
      borderRadius: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeChip: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    activeChipText: {
      color: '#FFFFFF',
    },
    priorityRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 28,
    },
    priorityChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    resultsTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '900',
    },
    resultsSubtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 5,
    },
    selectedBadge: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
    },
    selectedBadgeText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '800',
    },
    questionCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 17,
      marginBottom: 13,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 13,
    },
    subjectBadge: {
      backgroundColor: colors.background,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 9,
    },
    subjectBadgeText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '900',
    },
    selectButton: {
      width: 30,
      height: 30,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedButton: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    selectButtonText: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 22,
    },
    selectedButtonText: {
      color: '#FFFFFF',
    },
    questionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      lineHeight: 23,
    },
    chapterText: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 9,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 7,
      marginTop: 14,
    },
    metaText: {
      color: colors.muted,
      fontSize: 10,
    },
    metaDot: {
      color: colors.muted,
      fontSize: 10,
    },
    cardBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 14,
    },
    priorityBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
    },
    highPriority: {
      backgroundColor: '#FCE7E7',
    },
    mediumPriority: {
      backgroundColor: '#FFF1D6',
    },
    lowPriority: {
      backgroundColor: '#DDF6E9',
    },
    priorityText: {
      color: '#493C50',
      fontSize: 10,
      fontWeight: '800',
    },
    viewDetails: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '800',
    },
    emptyState: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
    },
    emptyText: {
      color: colors.muted,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
    },
    resetButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      marginTop: 16,
    },
    resetText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    selectionPanel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 18,
      padding: 16,
      marginTop: 8,
    },
    selectionTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    selectionSubtitle: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 4,
    },
    clearSelectionButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    clearSelectionText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '800',
    },
  });
}
