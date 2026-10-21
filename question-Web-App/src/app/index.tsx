
import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native';

import { useAppTheme } from '../providers/ThemeProvider';
import { api, type Subject } from '../services/api';
import { useApiData } from '../hooks/use-api-data';
import {
  sortSubjects,
  subjectCode,
  subjectColour,
  subjectDisplayName,
  subjectIcon,
  subjectMeta,
} from '../constants/subjects';
import type { AppTheme } from '../constants/theme';

// Upcoming exams — UI/calendar data, not yet in the database.
// TODO(BACKEND): Replace with aggregated calendar API when available.
const STATIC_EXAMS = [
  { day: '15', month: 'NOV', title: 'Mid Sem - CSE', remaining: '3 days left', level: 'Important', levelColor: '#EF6090' },
  { day: '28', month: 'NOV', title: 'DBMS', remaining: '16 days left', level: 'Medium', levelColor: '#F0B45A' },
  { day: '12', month: 'DEC', title: 'OOP', remaining: '30 days left', level: 'Low', levelColor: '#3AC9A0' },
] as const;

// NAV items shared between bottom bar (mobile) and sidebar (desktop)
const NAV_ITEMS = [
  { label: 'Home', icon: '⌂', path: '/' },
  { label: 'Question Bank', icon: '▤', path: '/question-bank' },
  { label: 'Syllabus', icon: '☑', path: '/syllabus' },
  { label: 'Prompt Studio', icon: '✧', path: '/prompt-studio' },
  { label: 'Resources', icon: '◈', path: '/resources' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { theme, mode, toggleTheme, ready } = useAppTheme();
  const { width } = useWindowDimensions();

  // Wide layout threshold — sidebar visible at 768+
  const isWide = Platform.OS === 'web' && width >= 768;
  const hasRightPanel = Platform.OS === 'web' && width >= 1100;

  const s = useMemo(() => makeStyles(theme, isWide), [theme, isWide]);

  const fetchSubjects = useCallback(() => api.getSubjects(), []);
  const subjectsState = useApiData<Subject[]>(fetchSubjects, ready);

  if (!ready) {
    return <View style={[s.screen, { flex: 1 }]} />;
  }

  const subjects =
    subjectsState.status === 'success' ? sortSubjects(subjectsState.data) : [];

  // ── Desktop sidebar ─────────────────────────────────────────────────────
  function renderSidebar() {
    if (!isWide) return null;
    return (
      <View style={s.sidebar}>
        {/* Brand */}
        <View style={s.sidebarBrand}>
          <View style={s.sidebarLogo}>
            <Text style={s.sidebarLogoText}>Q</Text>
          </View>
          <Text style={s.sidebarBrandName}>Question Web</Text>
        </View>

        {/* Nav */}
        <View style={s.sidebarNav}>
          {NAV_ITEMS.map((item, i) => {
            const active = i === 0;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
                onPress={() => router.push(item.path as never)}
                style={({ pressed }) => [
                  s.sidebarItem,
                  active && s.sidebarItemActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[s.sidebarItemIcon, active && s.sidebarItemIconActive]}>
                  {item.icon}
                </Text>
                <Text style={[s.sidebarItemLabel, active && s.sidebarItemLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Theme toggle at the bottom */}
        <View style={s.sidebarBottom}>
          <View style={s.themeToggle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch to light mode"
              onPress={() => toggleTheme()}
              style={[
                s.themeToggleOption,
                mode === 'light' && s.themeToggleOptionActive,
              ]}
            >
              <Text style={[s.themeToggleText, mode === 'light' && s.themeToggleTextActive]}>
                ☀ Light
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch to dark mode"
              onPress={() => toggleTheme()}
              style={[
                s.themeToggleOption,
                mode === 'dark' && s.themeToggleOptionActive,
              ]}
            >
              <Text style={[s.themeToggleText, mode === 'dark' && s.themeToggleTextActive]}>
                ☾ Dark
              </Text>
            </Pressable>
          </View>
          {/* Mascot area */}
          <View style={s.sidebarMascotArea}>
            <Text style={s.sidebarMascotText}>🕷️</Text>
            <View>
              <Text style={s.sidebarMascotTitle}>Small steps</Text>
              <Text style={s.sidebarMascotSubtitle}>Big progress!</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ── Right panel (desktop) ────────────────────────────────────────────────
  function renderRightPanel() {
    if (!hasRightPanel) return null;
    return (
      <View style={s.rightPanel}>
        {/* Upcoming Exams */}
        <View style={s.panelSection}>
          <View style={s.panelSectionHeader}>
            <Text style={s.panelIcon}>📅</Text>
            <Text style={s.panelTitle}>Upcoming Exams</Text>
            <Pressable style={s.viewAllBtn}>
              <Text style={s.viewAllText}>View All</Text>
            </Pressable>
          </View>
          {STATIC_EXAMS.map((exam) => (
            <View key={exam.title} style={s.examCard}>
              <View style={s.examDateBox}>
                <Text style={s.examDay}>{exam.day}</Text>
                <Text style={s.examMonth}>{exam.month}</Text>
              </View>
              <View style={s.examInfo}>
                <Text style={s.examTitle}>{exam.title}</Text>
                <Text style={s.examRemaining}>{exam.remaining}</Text>
              </View>
              <View style={[s.examLevelBadge, { backgroundColor: exam.levelColor + '22', borderColor: exam.levelColor + '55' }]}>
                <Text style={[s.examLevelText, { color: exam.levelColor }]}>{exam.level}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Progress motivator */}
        <View style={s.progressCard}>
          <Text style={s.progressMascot}>🕷️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.progressTitle}>Progress looks good! 🎉</Text>
            <Text style={s.progressText}>Keep going, one question at a time.</Text>
          </View>
          <Text style={s.progressStar}>★</Text>
        </View>

        {/* Quick Stats — TODO(BACKEND): Replace with real counts when Questions API ships */}
        <View style={s.panelSection}>
          <View style={s.panelSectionHeader}>
            <Text style={s.panelIcon}>📊</Text>
            <Text style={s.panelTitle}>Quick Stats</Text>
          </View>
          <View style={s.statsGrid}>
            {[
              { label: 'Total Questions', value: '—', icon: '📋', color: '#6845E8' },
              { label: 'PYQ', value: '—', icon: '📅', color: '#EF6090' },
              { label: 'From Books', value: '—', icon: '📘', color: '#3AC9A0' },
              { label: 'High Priority', value: '—', icon: '⭐', color: '#F0B45A' },
            ].map((stat) => (
              <View key={stat.label} style={s.statCard}>
                <Text style={[s.statIcon, { color: stat.color }]}>{stat.icon}</Text>
                <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ── Main content ─────────────────────────────────────────────────────────
  function renderMain() {
    return (
      <ScrollView
        style={s.mainScroll}
        contentContainerStyle={s.mainContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Desktop top bar */}
        {isWide && (
          <View style={s.topBar}>
            <View style={s.topBarSearch}>
              <Text style={s.topBarSearchIcon}>⌕</Text>
              <Text style={s.topBarSearchPlaceholder}>
                Search questions, chapters, topics...
              </Text>
            </View>
            <View style={s.topBarRight}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
                onPress={toggleTheme}
                style={s.topBarThemeBtn}
              >
                <Text style={s.topBarThemeBtnText}>
                  {mode === 'dark' ? '☀' : '☾'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Hero / Welcome banner ──────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.heroCopy}>
            <Text style={s.eyebrow}>YOUR LEARNING SPACE</Text>
            <Text style={s.heroTitle}>
              {isWide ? 'Ready to ace\nyour exams?' : 'Ready to ace your exams?'}
            </Text>
            <Text style={s.heroDescription}>
              Find the right questions, practise smart and make{'\n'}progress every day!
            </Text>
            <Pressable
              onPress={() => router.push('/question-bank')}
              style={({ pressed }) => [s.primaryButton, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="Explore Question Bank"
            >
              <Text style={s.primaryButtonText}>Explore Question Bank  →</Text>
            </Pressable>
          </View>

          {/* Mascot area — reserved, emoji placeholder */}
          <View style={s.mascotArea}>
            <Text style={s.mascotEmoji}>🕷️</Text>
            <View style={s.mascotStars}>
              <Text style={s.mascotStar}>✦</Text>
              <Text style={s.mascotStar}>✧</Text>
            </View>
            <Text style={s.mascotCaption}>You got this!</Text>
          </View>
        </View>

        {/* ── Your Subjects ─────────────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.sectionHeaderIcon}>✿</Text>
            <Text style={s.sectionTitle}>Your Subjects</Text>
          </View>
          <Pressable
            onPress={() => router.push('/syllabus')}
            accessibilityRole="button"
            accessibilityLabel="View all subjects"
          >
            <Text style={s.viewAllLink}>View All →</Text>
          </Pressable>
        </View>

        {subjectsState.status === 'loading' && (
          <View style={s.loadingRow}>
            <ActivityIndicator color={theme.accent} size="small" />
            <Text style={s.loadingText}>Loading subjects…</Text>
          </View>
        )}

        {subjectsState.status === 'error' && (
          <View style={s.inlineError}>
            <View style={{ flex: 1 }}>
              <Text style={s.inlineErrorText}>Could not load subjects.</Text>
              <Text style={s.inlineErrorDetail} numberOfLines={2}>
                {subjectsState.message}
              </Text>
            </View>
            <Pressable onPress={subjectsState.refresh} style={s.retrySmall}>
              <Text style={s.retrySmallText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {subjectsState.status === 'success' && subjects.length === 0 && (
          <Text style={s.emptyNote}>No subjects found in the database.</Text>
        )}

        {subjects.length > 0 && (
          isWide ? (
            // Desktop: wrapping grid row
            <View style={s.subjectGridRow}>
              {subjects.map((subject) => renderSubjectCard(subject))}
            </View>
          ) : (
            // Mobile: horizontal scroll
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.subjectScrollRow}
            >
              {subjects.map((subject) => renderSubjectCard(subject))}
            </ScrollView>
          )
        )}

        {/* ── Find Your Next Question ─────────────────────────────────── */}
        <View style={s.findSection}>
          <View style={s.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.sectionHeaderIcon}>⌕</Text>
              <View>
                <Text style={s.sectionTitle}>Find Your Next Question</Text>
                {isWide && (
                  <Text style={s.sectionSubtitle}>
                    Search, filter and explore questions from previous year papers and recommended books.
                  </Text>
                )}
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/question-bank')}
            style={s.searchBox}
            accessibilityRole="button"
            accessibilityLabel="Go to Question Bank search"
          >
            <Text style={s.searchIcon}>⌕</Text>
            <Text style={s.searchPlaceholder}>
              Search by keyword, chapter or topic...
            </Text>
            <View style={s.searchBtn}>
              <Text style={s.searchBtnText}>⌕</Text>
            </View>
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.quickFilters}
          >
            {[
              { label: 'All Subjects', active: true },
              { label: 'Previous Year Papers', active: false },
              { label: 'Recommended Books', active: false },
              { label: '⭐ High Priority', active: false },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={() => router.push('/question-bank')}
                style={[s.quickFilter, item.active && s.quickFilterActive]}
                accessibilityRole="button"
              >
                <Text style={[s.quickFilterText, item.active && s.quickFilterTextActive]}>
                  {item.label}
                </Text>
                {item.active && <Text style={s.quickFilterChevron}>▾</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── Recommended for You ────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.sectionHeaderIcon}>✦</Text>
            <Text style={s.sectionTitle}>Recommended for You</Text>
          </View>
          <Pressable onPress={() => router.push('/question-bank')}>
            <Text style={s.viewAllLink}>See all →</Text>
          </Pressable>
        </View>

        {/* Questions API not yet implemented — honest pending state */}
        <View style={s.pendingCard}>
          <Text style={s.pendingIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.pendingTitle}>Questions coming soon</Text>
            <Text style={s.pendingText}>
              The Questions API is not yet available. Visit the Question Bank screen to explore once the backend is ready.
            </Text>
          </View>
        </View>

        {/* Mobile-only upcoming exams (hidden on wide — right panel covers this) */}
        {!hasRightPanel && (
          <>
            <View style={s.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.sectionHeaderIcon}>📅</Text>
                <Text style={s.sectionTitle}>Upcoming Exams</Text>
              </View>
              <Text style={s.mutedNote}>Demo</Text>
            </View>
            {STATIC_EXAMS.map((exam) => (
              <View key={exam.title} style={s.examCardInline}>
                <View style={[s.examDateBox, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[s.examDay, { color: theme.accent }]}>{exam.day}</Text>
                  <Text style={[s.examMonth, { color: theme.accent }]}>{exam.month}</Text>
                </View>
                <View style={s.examInfo}>
                  <Text style={s.examTitle}>{exam.title}</Text>
                  <Text style={s.examRemaining}>{exam.remaining}</Text>
                </View>
                <View style={[s.examLevelBadge, { backgroundColor: exam.levelColor + '22', borderColor: exam.levelColor + '55' }]}>
                  <Text style={[s.examLevelText, { color: exam.levelColor }]}>{exam.level}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  function renderSubjectCard(subject: Subject) {
    const colour = subjectColour(subject);
    const name = subjectDisplayName(subject);
    const code = subjectCode(subject);
    return (
      <Pressable
        key={subject.subjectKey}
        accessibilityRole="button"
        accessibilityLabel={`Open syllabus for ${name}`}
        onPress={() =>
          router.push({
            pathname: '/syllabus',
            params: { subjectKey: String(subject.subjectKey) },
          } as never)
        }
        style={({ pressed }) => [
          s.subjectCard,
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
      >
        {/* Accent top border */}
        <View style={[s.subjectCardAccentBar, { backgroundColor: colour }]} />

        <View style={s.subjectCardTop}>
          <View style={[s.subjectIconBox, { backgroundColor: colour + '26' }]}>
            <Text
              style={[s.subjectIconText, { color: colour }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {subjectIcon(subject)}
            </Text>
          </View>
          {code !== '' && code !== name && (
            <View style={[s.subjectCodeBadge, { borderColor: colour + '55' }]}>
              <Text style={[s.subjectCodeText, { color: colour }]} numberOfLines={1}>
                {code}
              </Text>
            </View>
          )}
        </View>

        <Text numberOfLines={2} style={s.subjectName}>
          {name}
        </Text>

        {/* Progress bar placeholder — no real progress data yet */}
        <View style={s.subjectProgressBar}>
          <View style={[s.subjectProgressFill, { backgroundColor: colour, width: '0%' }]} />
        </View>

        <Text style={s.subjectMeta} numberOfLines={1}>
          {subjectMeta(subject)}
        </Text>
      </Pressable>
    );
  }

  // ── Mobile header ────────────────────────────────────────────────────────
  function renderMobileHeader() {
    if (isWide) return null;
    return (
      <View style={s.mobileHeader}>
        <View style={s.mobileBrand}>
          <View style={s.mobileLogo}>
            <Text style={s.mobileLogoText}>Q</Text>
          </View>
          <View>
            <Text style={s.mobileBrandName}>Question Web</Text>
            <Text style={s.mobileBrandSub}>LEARN · PRACTISE · MASTER</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          onPress={toggleTheme}
          style={s.mobileThemeBtn}
        >
          <Text style={s.mobileThemeBtnText}>
            {mode === 'dark' ? '☀' : '☾'}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── Mobile bottom nav ────────────────────────────────────────────────────
  function renderBottomNav() {
    if (isWide) return null;
    const visibleItems = NAV_ITEMS.slice(0, 4);
    return (
      <View style={s.bottomBar}>
        {visibleItems.map((item, index) => {
          const active = index === 0;
          return (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.path as never)}
              style={s.navItem}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
            >
              <View style={[s.navIconWrap, active && s.navIconWrapActive]}>
                <Text style={[s.navIcon, active && s.navIconActive]}>{item.icon}</Text>
              </View>
              <Text style={[s.navLabel, active && s.navLabelActive]}>
                {item.label === 'Question Bank' ? 'Questions' : item.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => router.push('/resources' as never)}
          style={s.navItem}
          accessibilityRole="button"
          accessibilityLabel="More"
        >
          <View style={s.navIconWrap}>
            <Text style={s.navIcon}>···</Text>
          </View>
          <Text style={s.navLabel}>More</Text>
        </Pressable>
      </View>
    );
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      {renderMobileHeader()}
      <View style={s.body}>
        {renderSidebar()}
        {renderMain()}
        {renderRightPanel()}
      </View>
      {renderBottomNav()}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(t: AppTheme, isWide: boolean) {
  const isMobile = !isWide;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background },

    // ── Layout shells ──────────────────────────────────────────────────────
    body: {
      flex: 1,
      flexDirection: 'row',
    },

    // ── Sidebar ───────────────────────────────────────────────────────────
    sidebar: {
      width: 220,
      backgroundColor: t.sidebarBg,
      borderRightWidth: 1,
      borderRightColor: t.sidebarBorder,
      paddingTop: 24,
      paddingBottom: 20,
      display: isWide ? 'flex' : 'none',
    } as any,
    sidebarBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 18,
      paddingBottom: 28,
    },
    sidebarLogo: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sidebarLogoText: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: 22,
    },
    sidebarBrandName: {
      color: t.sidebarText,
      fontWeight: '900',
      fontSize: 15,
    },
    sidebarNav: {
      flex: 1,
      gap: 4,
      paddingHorizontal: 12,
    },
    sidebarItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
    },
    sidebarItemActive: {
      backgroundColor: t.sidebarActiveBg,
    },
    sidebarItemIcon: {
      color: t.sidebarMuted,
      fontSize: 16,
      width: 20,
      textAlign: 'center',
    },
    sidebarItemIconActive: {
      color: '#FFFFFF',
    },
    sidebarItemLabel: {
      color: t.sidebarMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    sidebarItemLabelActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    sidebarBottom: {
      paddingHorizontal: 12,
      paddingTop: 16,
      gap: 16,
      borderTopWidth: 1,
      borderTopColor: t.sidebarBorder,
    },
    themeToggle: {
      flexDirection: 'row',
      backgroundColor: t.sidebarBorder,
      borderRadius: 10,
      padding: 3,
      gap: 2,
    },
    themeToggleOption: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 8,
      alignItems: 'center',
    },
    themeToggleOptionActive: {
      backgroundColor: t.accent,
    },
    themeToggleText: {
      color: t.sidebarMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    themeToggleTextActive: {
      color: '#FFFFFF',
    },
    sidebarMascotArea: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 6,
      paddingBottom: 4,
    },
    sidebarMascotText: { fontSize: 30 },
    sidebarMascotTitle: {
      color: t.sidebarText,
      fontSize: 11,
      fontWeight: '800',
    },
    sidebarMascotSubtitle: {
      color: t.sidebarMuted,
      fontSize: 10,
    },

    // ── Main scroll area ───────────────────────────────────────────────────
    mainScroll: { flex: 1 },
    mainContent: {
      padding: isWide ? 24 : 16,
      paddingBottom: 32,
    },

    // ── Top bar (desktop) ─────────────────────────────────────────────────
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 22,
    },
    topBarSearch: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    topBarSearchIcon: { color: t.muted, fontSize: 18 },
    topBarSearchPlaceholder: { color: t.muted, fontSize: 12, flex: 1 },
    topBarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    topBarThemeBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarThemeBtnText: { color: t.text, fontSize: 18 },

    // ── Mobile header ──────────────────────────────────────────────────────
    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      backgroundColor: t.surface,
    },
    mobileBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mobileLogo: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mobileLogoText: { color: '#FFFFFF', fontWeight: '900', fontSize: 20 },
    mobileBrandName: { color: t.text, fontWeight: '900', fontSize: 15 },
    mobileBrandSub: { color: t.muted, fontSize: 8, letterSpacing: 1, marginTop: 2 },
    mobileThemeBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: t.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mobileThemeBtnText: { color: t.text, fontSize: 20 },

    // ── Hero banner ─────────────────────────────────────────────────────────
    hero: {
      flexDirection: isWide ? 'row' : 'column',
      alignItems: isWide ? 'center' : 'flex-start',
      padding: isWide ? 30 : 20,
      borderRadius: isWide ? 20 : 18,
      backgroundColor: t.accentSoft,
      borderWidth: 1,
      borderColor: t.accentMuted,
      marginBottom: 24,
      overflow: 'hidden',
      minHeight: isWide ? 160 : undefined,
    },
    heroCopy: {
      flex: isWide ? 1 : undefined,
    },
    eyebrow: {
      color: t.accent,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    heroTitle: {
      color: t.text,
      fontSize: isWide ? 26 : 22,
      fontWeight: '900',
      lineHeight: isWide ? 34 : 30,
    },
    heroDescription: {
      color: t.muted,
      fontSize: 12,
      lineHeight: 19,
      marginTop: 8,
    },
    primaryButton: {
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
      alignSelf: 'flex-start',
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 13,
    },
    mascotArea: {
      alignItems: 'center',
      marginTop: isMobile ? 12 : 0,
      marginLeft: isWide ? 24 : 0,
      minWidth: isWide ? 100 : undefined,
    },
    mascotEmoji: { fontSize: isWide ? 56 : 44 },
    mascotStars: { flexDirection: 'row', gap: 4, marginTop: 2 },
    mascotStar: { color: t.accent, fontSize: 14 },
    mascotCaption: { color: t.muted, fontSize: 10, marginTop: 4 },

    // ── Section headers ─────────────────────────────────────────────────────
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginTop: 6,
      marginBottom: 14,
    },
    sectionHeaderIcon: { color: t.accent, fontSize: 14 },
    sectionTitle: { color: t.text, fontSize: 15, fontWeight: '900' },
    sectionSubtitle: { color: t.muted, fontSize: 11, marginTop: 2 },
    viewAllLink: { color: t.accent, fontSize: 11, fontWeight: '800', paddingTop: 2 },
    mutedNote: { color: t.muted, fontSize: 10, paddingTop: 2 },

    // ── Loading / error ─────────────────────────────────────────────────────
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    loadingText: { color: t.muted, fontSize: 12 },
    inlineError: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.danger,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    inlineErrorText: { color: t.danger, fontSize: 12, fontWeight: '800' },
    inlineErrorDetail: { color: t.muted, fontSize: 10, marginTop: 3 },
    retrySmall: {
      backgroundColor: t.accent,
      borderRadius: 9,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    retrySmallText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    emptyNote: { color: t.muted, fontSize: 12, marginBottom: 8 },

    // ── Subject cards ────────────────────────────────────────────────────────
    subjectGridRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 6,
    },
    subjectScrollRow: {
      gap: 10,
      paddingRight: 8,
      paddingBottom: 4,
    },
    subjectCard: {
      width: isWide ? 160 : 148,
      minHeight: 140,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      overflow: 'hidden',
      ...(isWide ? {} : { marginRight: 0 }),
    },
    subjectCardAccentBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
    },
    subjectCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      marginTop: 6,
    },
    subjectIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    subjectIconText: { fontSize: 16, fontWeight: '900' },
    subjectCodeBadge: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
      flexShrink: 1,
    },
    subjectCodeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    subjectName: {
      color: t.text,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 18,
    },
    subjectProgressBar: {
      height: 3,
      backgroundColor: t.border,
      borderRadius: 2,
      marginTop: 10,
      marginBottom: 6,
      overflow: 'hidden',
    },
    subjectProgressFill: {
      height: 3,
      borderRadius: 2,
    },
    subjectMeta: {
      color: t.muted,
      fontSize: 10,
      marginTop: 'auto',
    },

    // ── Find Question section ───────────────────────────────────────────────
    findSection: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 18,
      padding: 18,
      marginBottom: 24,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 14,
    },
    searchIcon: { color: t.muted, fontSize: 20 },
    searchPlaceholder: { color: t.muted, fontSize: 12, flex: 1 },
    searchBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBtnText: { color: '#FFFFFF', fontSize: 16 },
    quickFilters: {
      gap: 8,
      paddingBottom: 2,
    },
    quickFilter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    quickFilterActive: {
      backgroundColor: t.accent,
      borderColor: t.accent,
    },
    quickFilterText: { color: t.text, fontSize: 11, fontWeight: '700' },
    quickFilterTextActive: { color: '#FFFFFF' },
    quickFilterChevron: { color: '#FFFFFF', fontSize: 11 },

    // ── Pending / no-data card ─────────────────────────────────────────────
    pendingCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 16,
      padding: 18,
      marginBottom: 24,
    },
    pendingIcon: { fontSize: 30 },
    pendingTitle: { color: t.text, fontSize: 13, fontWeight: '800' },
    pendingText: { color: t.muted, fontSize: 11, lineHeight: 18, marginTop: 4 },

    // ── Exam cards (mobile inline) ────────────────────────────────────────
    examCardInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 14,
      padding: 12,
      marginBottom: 9,
    },
    examDateBox: {
      width: 46,
      height: 50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    examDay: { fontWeight: '900', fontSize: 17 },
    examMonth: { fontWeight: '800', fontSize: 8 },
    examInfo: { flex: 1 },
    examTitle: { color: t.text, fontSize: 12, fontWeight: '800' },
    examRemaining: { color: t.muted, fontSize: 10, marginTop: 4 },
    examLevelBadge: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    examLevelText: { fontSize: 10, fontWeight: '800' },

    // ── Right panel ───────────────────────────────────────────────────────
    rightPanel: {
      width: 280,
      paddingTop: 0,
      paddingHorizontal: 0,
      paddingRight: 0,
      display: 'flex' as any,
      flexDirection: 'column',
      gap: 0,
      borderLeftWidth: 1,
      borderLeftColor: t.border,
    },
    panelSection: {
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    panelSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 14,
    },
    panelIcon: { fontSize: 14 },
    panelTitle: { color: t.text, fontSize: 14, fontWeight: '800', flex: 1 },
    viewAllBtn: {},
    viewAllText: { color: t.accent, fontSize: 11, fontWeight: '800' },

    // Right panel exam card
    examCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.surfaceAlt,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },

    // Progress card
    progressCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.accentSoft,
      borderRadius: 14,
      padding: 16,
      margin: 18,
      marginTop: 0,
      borderWidth: 1,
      borderColor: t.accentMuted,
    },
    progressMascot: { fontSize: 28 },
    progressTitle: { color: t.text, fontSize: 12, fontWeight: '800' },
    progressText: { color: t.muted, fontSize: 10, marginTop: 3 },
    progressStar: { color: t.accent, fontSize: 18 },

    // Stats grid
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    statCard: {
      flex: 1,
      minWidth: '44%',
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      padding: 12,
      alignItems: 'flex-start',
      gap: 4,
    },
    statIcon: { fontSize: 16 },
    statValue: { fontSize: 22, fontWeight: '900' },
    statLabel: { color: t.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

    // ── Bottom nav (mobile) ────────────────────────────────────────────────
    bottomBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.border,
      paddingTop: 8,
      paddingBottom: 10,
      display: isWide ? ('none' as any) : 'flex',
    },
    navItem: { alignItems: 'center', gap: 3, flex: 1 },
    navIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navIconWrapActive: {
      backgroundColor: t.accentSoft,
    },
    navIcon: { color: t.muted, fontSize: 18 },
    navIconActive: { color: t.accent },
    navLabel: { color: t.muted, fontSize: 9, fontWeight: '700' },
    navLabelActive: { color: t.accent, fontWeight: '900' },
  });
}
