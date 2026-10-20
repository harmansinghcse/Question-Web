
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '../providers/ThemeProvider';
import { subjects } from '../data/subjects';
import { questions } from '../data/questions';

export default function HomeScreen() {
  const router = useRouter();
  const { theme, mode, toggleTheme, ready } = useAppTheme();
  const s = makeStyles(theme);

  if (!ready) {
    return <View style={[s.screen, { flex: 1 }]} />;
  }

  const exams = [
    { day: '15', month: 'NOV', title: 'Mid Sem - CSE', remaining: '3 days left', level: 'Important' },
    { day: '28', month: 'NOV', title: 'DBMS', remaining: '16 days left', level: 'Medium' },
    { day: '12', month: 'DEC', title: 'OOP', remaining: '30 days left', level: 'Low' },
  ];

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

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>✿ Your Subjects</Text>
          <Pressable onPress={() => router.push('/syllabus')}>
            <Text style={s.link}>View All →</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.subjectList}
        >
          {subjects.map((subject) => {
            const percent = Math.round(
              (subject.completed / subject.total) * 100,
            );

            return (
              <Pressable
                key={subject.id}
                onPress={() => router.push('/syllabus')}
                style={s.subjectCard}
              >
                <View style={s.subjectIcon}>
                  <Text style={[s.subjectIconText, { color: subject.color }]}>
                    {subject.icon}
                  </Text>
                </View>

                <Text numberOfLines={1} style={s.subjectName}>
                  {subject.name}
                </Text>

                <Text style={s.subjectPercent}>{percent}%</Text>

                <View style={s.progressTrack}>
                  <View
                    style={[
                      s.progressFill,
                      {
                        width: `${percent}%`,
                        backgroundColor: subject.color,
                      },
                    ]}
                  />
                </View>

                <Text style={s.subjectCount}>
                  {subject.completed} / {subject.total} topics
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

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

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recommended for You</Text>
          <Pressable onPress={() => router.push('/question-bank')}>
            <Text style={s.link}>See all →</Text>
          </Pressable>
        </View>

        {questions.slice(0, 3).map((question) => (
          <View key={question.id} style={s.questionCard}>
            <View style={s.questionTop}>
              <Text style={s.questionSubject}>{question.subject}</Text>
              <Text
                style={[
                  s.priority,
                  question.priority === 'High'
                    ? s.high
                    : question.priority === 'Medium'
                      ? s.medium
                      : s.low,
                ]}
              >
                {question.priority} Priority
              </Text>
            </View>

            <Text style={s.questionTitle}>{question.title}</Text>

            <Text style={s.questionMeta}>
              ◇ {question.chapter}  ·  {question.year ?? 'Book'}  ·  {question.marks} Marks
            </Text>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/question-bank/[id]',
                  params: { id: question.id },
                })
              }
              style={s.viewButton}
            >
              <Text style={s.viewButtonText}>View →</Text>
            </Pressable>
          </View>
        ))}

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Upcoming Exams</Text>
          <Text style={s.link}>View All</Text>
        </View>

        {exams.map((exam) => (
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

        <View style={s.statsCard}>
          <Text style={s.sectionTitle}>Quick Stats</Text>
          <View style={s.statsGrid}>
            {[
              ['842', 'Total Questions'],
              ['512', 'Previous Papers'],
              ['330', 'From Books'],
              ['214', 'High Priority'],
            ].map(([value, label]) => (
              <View key={label} style={s.statItem}>
                <Text style={s.statValue}>{value}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
          {/* TODO(BACKEND): Replace demo statistics with aggregated API data. */}
        </View>

        <View style={s.footer}>
          <Text style={s.footerMascot}>🕷️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.footerTitle}>Progress looks good!</Text>
            <Text style={s.footerText}>
              Keep going, one question at a time.
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
    subjectPercent: { color: t.muted, fontSize: 10, marginTop: 7, marginBottom: 7 },
    progressTrack: { height: 5, backgroundColor: t.surfaceAlt, borderRadius: 5, overflow: 'hidden' },
    progressFill: { height: 5, borderRadius: 5 },
    subjectCount: { color: t.muted, fontSize: 9, marginTop: 8 },
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
    questionCard: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
    },
    questionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    questionSubject: { color: t.accent, fontSize: 11, fontWeight: '900' },
    priority: { fontSize: 10, fontWeight: '800' },
    high: { color: t.danger },
    medium: { color: t.warning },
    low: { color: t.success },
    questionTitle: { color: t.text, fontSize: 13, fontWeight: '800', lineHeight: 20, marginTop: 11 },
    questionMeta: { color: t.muted, fontSize: 10, lineHeight: 17, marginTop: 7 },
    viewButton: { alignSelf: 'flex-end', backgroundColor: t.accent, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, marginTop: 10 },
    viewButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
    examCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 15, padding: 12, marginBottom: 9 },
    examDate: { width: 45, height: 48, borderRadius: 12, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' },
    examDay: { color: t.accent, fontWeight: '900', fontSize: 17 },
    examMonth: { color: t.accent, fontWeight: '800', fontSize: 8 },
    examTitle: { color: t.text, fontSize: 12, fontWeight: '800' },
    examRemaining: { color: t.muted, fontSize: 10, marginTop: 5 },
    examLevel: { color: t.accent, fontSize: 9, fontWeight: '800' },
    statsCard: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 18, padding: 15, marginTop: 12 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 13 },
    statItem: { width: '47%', flexGrow: 1, backgroundColor: t.surfaceAlt, padding: 13, borderRadius: 13 },
    statValue: { color: t.text, fontSize: 22, fontWeight: '900' },
    statLabel: { color: t.muted, fontSize: 10, marginTop: 5 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceAlt, padding: 16, borderRadius: 17, marginTop: 18 },
    footerMascot: { fontSize: 35 },
    footerTitle: { color: t.text, fontSize: 13, fontWeight: '900' },
    footerText: { color: t.muted, fontSize: 11, marginTop: 5 },
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
