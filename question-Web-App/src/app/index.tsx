import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
    Platform,
} from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import { api, type Subject } from "../services/api";
import { useApiData } from "../hooks/use-api-data";
import {
    sortSubjects,
    subjectCode,
    subjectColour,
    subjectDisplayName,
    subjectIcon,
    subjectMeta,
} from "../constants/subjects";
import type { AppTheme } from "../constants/theme";

// Upcoming exams — UI/calendar data, not yet in the database.
// TODO(BACKEND): Replace with aggregated calendar API when available.
const STATIC_EXAMS = [
    {
        day: "15",
        month: "NOV",
        title: "Mid Sem - CSE",
        remaining: "3 days left",
        level: "Important",
        levelColor: "#EF6090",
    },
    {
        day: "28",
        month: "NOV",
        title: "DBMS",
        remaining: "16 days left",
        level: "Medium",
        levelColor: "#F0B45A",
    },
    {
        day: "12",
        month: "DEC",
        title: "OOP",
        remaining: "30 days left",
        level: "Low",
        levelColor: "#3AC9A0",
    },
] as const;

// NAV items shared between bottom bar (mobile) and sidebar (desktop)
const NAV_ITEMS = [
    { label: "Home", icon: "⌂", path: "/" },
    { label: "Question Bank", icon: "▤", path: "/question-bank" },
    { label: "Syllabus", icon: "☑", path: "/syllabus" },
    { label: "Prompt Studio", icon: "✧", path: "/prompt-studio" },
    { label: "Resources", icon: "◈", path: "/resources" },
] as const;

export default function HomeScreen() {
    const router = useRouter();
    const { theme, mode, toggleTheme, ready } = useAppTheme();
    const { width } = useWindowDimensions();

    // Wide layout threshold — sidebar visible at 768+
    const isWide = Platform.OS === "web" && width >= 768;
    const hasRightPanel = Platform.OS === "web" && width >= 1100;

    // Calculate subject card width so ~1.85 cards show on mobile (peek effect)
    // and ~3.5-4.5 cards show on wider screens in the horizontal carousel.
    const subjectCardWidth = useMemo(() => {
        if (!isWide) {
            return Math.max(
                150,
                Math.min(200, Math.floor((width - 32 - 12) / 1.85)),
            );
        }
        return 172;
    }, [width, isWide]);

    const s = useMemo(
        () => makeStyles(theme, mode, isWide),
        [theme, mode, isWide],
    );

    const fetchSubjects = useCallback(() => api.getSubjects(), []);
    const subjectsState = useApiData<Subject[]>(fetchSubjects, ready);

    if (!ready) {
        return <View style={[s.screen, { flex: 1 }]} />;
    }

    const subjects =
        subjectsState.status === "success"
            ? sortSubjects(subjectsState.data)
            : [];

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
                        const displayLabel =
                            item.label === "Syllabus"
                                ? "Syllabus Tracker"
                                : item.label;
                        return (
                            <Pressable
                                key={item.label}
                                accessibilityRole="button"
                                accessibilityLabel={displayLabel}
                                accessibilityState={{ selected: active }}
                                onPress={() => router.push(item.path as never)}
                                style={({ pressed }) => [
                                    s.sidebarItem,
                                    active && s.sidebarItemActive,
                                    pressed && { opacity: 0.85 },
                                ]}
                            >
                                <Text
                                    style={[
                                        s.sidebarItemIcon,
                                        active && s.sidebarItemIconActive,
                                    ]}
                                >
                                    {item.icon}
                                </Text>
                                <Text
                                    style={[
                                        s.sidebarItemLabel,
                                        active && s.sidebarItemLabelActive,
                                    ]}
                                >
                                    {displayLabel}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Motivational footer & Theme toggle at the bottom */}
                <View style={s.sidebarBottom}>
                    <View style={s.sidebarQuoteBox}>
                        <View style={s.sidebarQuoteSparkleRow}>
                            <Text style={s.sidebarQuoteSparkle}>✦</Text>
                            <Text style={s.sidebarQuoteTitle}>Small steps</Text>
                        </View>
                        <Text style={s.sidebarQuoteSubtitle}>
                            Big progress!
                        </Text>
                    </View>

                    <View style={s.themeToggle}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Switch to light mode"
                            onPress={() => mode !== "light" && toggleTheme()}
                            style={[
                                s.themeToggleOption,
                                mode === "light" && s.themeToggleOptionActive,
                            ]}
                        >
                            <Text
                                style={[
                                    s.themeToggleText,
                                    mode === "light" && s.themeToggleTextActive,
                                ]}
                            >
                                ☀ Light
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Switch to dark mode"
                            onPress={() => mode !== "dark" && toggleTheme()}
                            style={[
                                s.themeToggleOption,
                                mode === "dark" && s.themeToggleOptionActive,
                            ]}
                        >
                            <Text
                                style={[
                                    s.themeToggleText,
                                    mode === "dark" && s.themeToggleTextActive,
                                ]}
                            >
                                ☾ Dark
                            </Text>
                        </Pressable>
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
                <View style={s.panelCard}>
                    <View style={s.panelSectionHeader}>
                        <Text style={s.panelIcon}>📅</Text>
                        <Text style={s.panelTitle}>Upcoming Exams</Text>
                        <Pressable style={s.viewAllBtn}>
                            <Text style={s.viewAllText}>View All</Text>
                        </Pressable>
                    </View>
                    <View style={{ gap: 10 }}>
                        {STATIC_EXAMS.map((exam) => (
                            <View key={exam.title} style={s.examCard}>
                                <View
                                    style={[
                                        s.examDateBox,
                                        {
                                            backgroundColor:
                                                exam.levelColor + "1F",
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            s.examDay,
                                            { color: exam.levelColor },
                                        ]}
                                    >
                                        {exam.day}
                                    </Text>
                                    <Text
                                        style={[
                                            s.examMonth,
                                            { color: exam.levelColor },
                                        ]}
                                    >
                                        {exam.month}
                                    </Text>
                                </View>
                                <View style={s.examInfo}>
                                    <Text style={s.examTitle} numberOfLines={1}>
                                        {exam.title}
                                    </Text>
                                    <Text style={s.examRemaining}>
                                        {exam.remaining}
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        s.examLevelBadge,
                                        {
                                            backgroundColor:
                                                exam.levelColor + "1F",
                                            borderColor: exam.levelColor + "44",
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            s.examLevelText,
                                            { color: exam.levelColor },
                                        ]}
                                    >
                                        {exam.level}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Progress motivator (Mascot-free clean lavender banner) */}
                <View style={s.progressCard}>
                    <View style={s.progressSparkleBadge}>
                        <Text style={s.progressSparkleIcon}>✦</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.progressTitle}>
                            Progress looks good! 🎉
                        </Text>
                        <Text style={s.progressText}>
                            Keep going, one question at a time.
                        </Text>
                    </View>
                    <Text style={s.progressStar}>★</Text>
                </View>

                {/* Quick Stats — TODO(BACKEND): Replace with real counts when Questions API ships */}
                <View style={s.panelCard}>
                    <View style={s.panelSectionHeader}>
                        <Text style={s.panelIcon}>📊</Text>
                        <Text style={s.panelTitle}>Quick Stats</Text>
                    </View>
                    <View style={s.statsGrid}>
                        {[
                            {
                                label: "Total Questions",
                                value: "—",
                                icon: "📋",
                                color: "#6842E8",
                            },
                            {
                                label: "PYQ",
                                value: "—",
                                icon: "📅",
                                color: "#EF6090",
                            },
                            {
                                label: "From Books",
                                value: "—",
                                icon: "📘",
                                color: "#3AC9A0",
                            },
                            {
                                label: "High Priority",
                                value: "—",
                                icon: "⭐",
                                color: "#F0B45A",
                            },
                        ].map((stat) => (
                            <View key={stat.label} style={s.statCard}>
                                <View
                                    style={[
                                        s.statIconBadge,
                                        { backgroundColor: stat.color + "1F" },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            s.statIcon,
                                            { color: stat.color },
                                        ]}
                                    >
                                        {stat.icon}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.statLabel} numberOfLines={1}>
                                        {stat.label}
                                    </Text>
                                    <Text style={s.statValue}>
                                        {stat.value}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        );
    }

    // ── Main content ─────────────────────────────────────────────────────────
    function renderMain() {
        const quickFilters = isWide
            ? [
                  { label: "All Subjects", active: true, chevron: true },
                  {
                      label: "Previous Year Papers",
                      active: false,
                      chevron: false,
                  },
                  { label: "Recommended Books", active: false, chevron: false },
                  { label: "⭐ High Priority", active: false, chevron: false },
              ]
            : [
                  { label: "All Subjects", active: true, chevron: true },
                  {
                      label: "📅 PYQs",
                      active: false,
                      chevron: false,
                      accent: "#EF6090",
                  },
                  {
                      label: "📘 Books",
                      active: false,
                      chevron: false,
                      accent: "#3AC9A0",
                  },
                  {
                      label: "⭐ High Priority",
                      active: false,
                      chevron: false,
                      accent: "#F0B45A",
                  },
              ];

        return (
            <ScrollView
                style={s.mainScroll}
                contentContainerStyle={s.mainContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero / Welcome banner (Mascot-free, rich lavender surface) ── */}
                <View style={s.hero}>
                    <View style={s.heroDecorCircleLarge} />
                    <View style={s.heroDecorCircleSmall} />

                    <View style={s.heroCopy}>
                        <View style={s.eyebrowPill}>
                            <Text style={s.eyebrowSparkle}>✦</Text>
                            <Text style={s.eyebrowText}>
                                YOUR LEARNING SPACE
                            </Text>
                        </View>
                        <Text style={s.heroTitle}>
                            Ready to ace your exams?
                        </Text>
                        <Text style={s.heroDescription}>
                            Find the right questions, practise smart and make
                            progress every day!
                        </Text>
                        <Pressable
                            onPress={() => router.push("/question-bank")}
                            style={({ pressed }) => [
                                s.primaryButton,
                                pressed && {
                                    opacity: 0.9,
                                    transform: [{ scale: 0.98 }],
                                },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Explore Question Bank"
                        >
                            <Text style={s.primaryButtonText}>
                                Explore Question Bank
                            </Text>
                            <Text style={s.primaryButtonArrow}>→</Text>
                        </Pressable>
                    </View>
                </View>

                {/* ── Your Subjects (Always horizontal scrolling carousel) ──────── */}
                <View style={s.sectionHeader}>
                    <View style={s.sectionTitleRow}>
                        <Text style={s.sectionHeaderIcon}>✿</Text>
                        <Text style={s.sectionTitle}>Your Subjects</Text>
                    </View>
                    <Pressable
                        onPress={() => router.push("/syllabus")}
                        accessibilityRole="button"
                        accessibilityLabel="View all subjects"
                    >
                        <Text style={s.viewAllLink}>View All →</Text>
                    </Pressable>
                </View>

                {subjectsState.status === "loading" && (
                    <View style={s.loadingRow}>
                        <ActivityIndicator color="#7549F5" size="small" />
                        <Text style={s.loadingText}>Loading subjects…</Text>
                    </View>
                )}

                {subjectsState.status === "error" && (
                    <View style={s.inlineError}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.inlineErrorText}>
                                Could not load subjects.
                            </Text>
                            <Text style={s.inlineErrorDetail} numberOfLines={2}>
                                {subjectsState.message}
                            </Text>
                        </View>
                        <Pressable
                            onPress={subjectsState.refresh}
                            style={s.retrySmall}
                        >
                            <Text style={s.retrySmallText}>Retry</Text>
                        </Pressable>
                    </View>
                )}

                {subjectsState.status === "success" &&
                    subjects.length === 0 && (
                        <Text style={s.emptyNote}>
                            No subjects found in the database.
                        </Text>
                    )}

                {subjects.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        decelerationRate="fast"
                        snapToInterval={subjectCardWidth + 12}
                        snapToAlignment="start"
                        contentContainerStyle={s.subjectScrollRow}
                    >
                        {subjects.map((subject) => renderSubjectCard(subject))}
                    </ScrollView>
                )}

                {/* ── Find Your Next Question ─────────────────────────────────── */}
                <View style={s.findSection}>
                    <View style={s.findHeader}>
                        <View style={s.findIconBadge}>
                            <Text style={s.findIconBadgeText}>⌕</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.findSectionTitle}>
                                {isWide
                                    ? "Find Your Next Question"
                                    : "Find a Question"}
                            </Text>
                            {isWide && (
                                <Text style={s.findSectionSubtitle}>
                                    Search, filter and explore questions from
                                    previous year papers and recommended books.
                                </Text>
                            )}
                        </View>
                    </View>

                    <Pressable
                        onPress={() => router.push("/question-bank")}
                        style={({ pressed }) => [
                            s.searchBox,
                            pressed && { opacity: 0.9 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Go to Question Bank search"
                    >
                        <Text style={s.searchIcon}>⌕</Text>
                        <Text style={s.searchPlaceholder} numberOfLines={1}>
                            {isWide
                                ? "Search by keyword, chapter or topic..."
                                : "Search questions, chapters, topics..."}
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
                        {quickFilters.map((item: any) => (
                            <Pressable
                                key={item.label}
                                onPress={() => router.push("/question-bank")}
                                style={({ pressed }) => [
                                    s.quickFilter,
                                    item.active && s.quickFilterActive,
                                    !item.active &&
                                        item.accent && {
                                            borderColor: item.accent + "44",
                                            backgroundColor: item.accent + "18",
                                        },
                                    pressed && { opacity: 0.85 },
                                ]}
                                accessibilityRole="button"
                            >
                                <Text
                                    style={[
                                        s.quickFilterText,
                                        item.active && s.quickFilterTextActive,
                                        !item.active &&
                                            item.accent && {
                                                color: item.accent,
                                            },
                                    ]}
                                >
                                    {item.label}
                                </Text>
                                {item.chevron && (
                                    <Text style={s.quickFilterChevron}>▾</Text>
                                )}
                            </Pressable>
                        ))}
                    </ScrollView>

                    {/* ── Recommended for You (Integrated inside card on desktop) ─── */}
                    {isWide && (
                        <View style={s.recommendedInCard}>
                            <View style={s.recommendedSubHeader}>
                                <View style={s.sectionTitleRow}>
                                    <Text style={s.sectionHeaderIcon}>✦</Text>
                                    <Text style={s.recommendedSubTitle}>
                                        Recommended for You
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() =>
                                        router.push("/question-bank")
                                    }
                                >
                                    <Text style={s.viewAllLink}>See all →</Text>
                                </Pressable>
                            </View>

                            <Pressable
                                onPress={() => router.push("/question-bank")}
                                style={({ pressed }) => [
                                    s.pendingCard,
                                    pressed && { opacity: 0.92 },
                                ]}
                            >
                                <View style={s.pendingIconWrap}>
                                    <Text style={s.pendingIcon}>📋</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.pendingTitle}>
                                        Questions coming soon
                                    </Text>
                                    <Text style={s.pendingText}>
                                        The Questions API is not yet available.
                                        Visit the Question Bank screen to
                                        explore once the backend is ready.
                                    </Text>
                                </View>
                                <View style={s.pendingActionPill}>
                                    <Text style={s.pendingActionText}>
                                        View
                                    </Text>
                                </View>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* ── Mobile Recommended for You ───────────────────────────────── */}
                {!isWide && (
                    <>
                        <View style={s.sectionHeader}>
                            <View style={s.sectionTitleRow}>
                                <Text style={s.sectionHeaderIcon}>✦</Text>
                                <Text style={s.sectionTitle}>
                                    Recommended for You
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => router.push("/question-bank")}
                            >
                                <Text style={s.viewAllLink}>See all →</Text>
                            </Pressable>
                        </View>

                        <Pressable
                            onPress={() => router.push("/question-bank")}
                            style={({ pressed }) => [
                                s.pendingCardMobile,
                                pressed && { opacity: 0.92 },
                            ]}
                        >
                            <View style={s.pendingIconWrap}>
                                <Text style={s.pendingIcon}>📋</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={s.pendingBadgeRow}>
                                    <View style={s.pendingTagBadge}>
                                        <Text style={s.pendingTagText}>
                                            QUESTION BANK
                                        </Text>
                                    </View>
                                    <Text style={s.pendingDot}>•</Text>
                                    <Text style={s.pendingSubNote}>
                                        Pending API
                                    </Text>
                                </View>
                                <Text style={s.pendingTitleMobile}>
                                    Questions coming soon
                                </Text>
                                <Text
                                    style={s.pendingTextMobile}
                                    numberOfLines={2}
                                >
                                    Tap to visit the Question Bank screen and
                                    explore once the backend is ready.
                                </Text>
                            </View>
                            <Text style={s.pendingChevron}>›</Text>
                        </Pressable>
                    </>
                )}

                {/* ── Mobile-only Upcoming Exams (hidden on wide — right panel covers this) ── */}
                {!hasRightPanel && (
                    <>
                        <View style={[s.sectionHeader, { marginTop: 8 }]}>
                            <View style={s.sectionTitleRow}>
                                <Text style={s.sectionHeaderIcon}>📅</Text>
                                <Text style={s.sectionTitle}>
                                    Upcoming Exams
                                </Text>
                            </View>
                            <View style={s.demoBadge}>
                                <Text style={s.demoBadgeText}>Demo</Text>
                            </View>
                        </View>
                        <View style={{ gap: 10 }}>
                            {STATIC_EXAMS.map((exam) => (
                                <View key={exam.title} style={s.examCardInline}>
                                    <View
                                        style={[
                                            s.examDateBox,
                                            {
                                                backgroundColor:
                                                    exam.levelColor + "22",
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                s.examDay,
                                                { color: exam.levelColor },
                                            ]}
                                        >
                                            {exam.day}
                                        </Text>
                                        <Text
                                            style={[
                                                s.examMonth,
                                                { color: exam.levelColor },
                                            ]}
                                        >
                                            {exam.month}
                                        </Text>
                                    </View>
                                    <View style={s.examInfo}>
                                        <Text style={s.examTitle}>
                                            {exam.title}
                                        </Text>
                                        <Text style={s.examRemaining}>
                                            {exam.remaining}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            s.examLevelBadge,
                                            {
                                                backgroundColor:
                                                    exam.levelColor + "22",
                                                borderColor:
                                                    exam.levelColor + "55",
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                s.examLevelText,
                                                { color: exam.levelColor },
                                            ]}
                                        >
                                            {exam.level}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                <View style={{ height: 24 }} />
            </ScrollView>
        );
    }

    function renderSubjectCard(subject: Subject) {
        const colour = subjectColour(subject);
        const name = subjectDisplayName(subject);
        const code = subjectCode(subject);
        const meta = subjectMeta(subject);

        return (
            <Pressable
                key={subject.subjectKey}
                accessibilityRole="button"
                accessibilityLabel={`Open syllabus for ${name}`}
                onPress={() =>
                    router.push({
                        pathname: "/syllabus",
                        params: { subjectKey: String(subject.subjectKey) },
                    } as never)
                }
                style={({ pressed }) => [
                    s.subjectCard,
                    { width: subjectCardWidth },
                    isWide &&
                        mode === "light" && {
                            backgroundColor: colour + "12",
                            borderColor: colour + "30",
                        },
                    pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
                ]}
            >
                {/* Top vibrant accent bar */}
                <View
                    style={[
                        s.subjectCardAccentBar,
                        { backgroundColor: colour },
                    ]}
                />

                <View style={s.subjectCardTop}>
                    <View
                        style={[
                            s.subjectIconBox,
                            {
                                backgroundColor:
                                    isWide && mode === "light"
                                        ? "#FFFFFF"
                                        : colour + "24",
                            },
                        ]}
                    >
                        <Text
                            style={[s.subjectIconText, { color: colour }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {subjectIcon(subject)}
                        </Text>
                    </View>
                    {code !== "" && code !== name && (
                        <View
                            style={[
                                s.subjectCodeBadge,
                                {
                                    backgroundColor: colour + "18",
                                    borderColor: colour + "48",
                                },
                            ]}
                        >
                            <Text
                                style={[s.subjectCodeText, { color: colour }]}
                                numberOfLines={1}
                            >
                                {code}
                            </Text>
                        </View>
                    )}
                </View>

                <Text numberOfLines={2} style={s.subjectName}>
                    {name}
                </Text>

                {/* Honest progress track placeholder (0% fill, no fabricated numbers) */}
                <View
                    style={[
                        s.subjectProgressBar,
                        { backgroundColor: colour + "28" },
                    ]}
                >
                    <View
                        style={[
                            s.subjectProgressFill,
                            { backgroundColor: colour, width: "0%" },
                        ]}
                    />
                </View>

                <Text style={s.subjectMeta} numberOfLines={1}>
                    {meta}
                </Text>
            </Pressable>
        );
    }

    // ── Desktop top bar ──────────────────────────────────────────────────────
    function renderDesktopTopBar() {
        if (!isWide) return null;
        return (
            <View style={s.topBar}>
                <Pressable
                    onPress={() => router.push("/question-bank")}
                    style={s.topBarSearch}
                    accessibilityRole="button"
                    accessibilityLabel="Search questions, chapters, topics"
                >
                    <Text style={s.topBarSearchIcon}>⌕</Text>
                    <Text style={s.topBarSearchPlaceholder}>
                        Search questions, chapters, topics...
                    </Text>
                </Pressable>
                <View style={s.topBarRight}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
                        onPress={toggleTheme}
                        style={s.topBarThemeBtn}
                    >
                        <Text style={s.topBarThemeBtnText}>
                            {mode === "dark" ? "☀" : "☾"}
                        </Text>
                    </Pressable>
                </View>
            </View>
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
                        <Text style={s.mobileBrandSub}>
                            LEARN · PRACTISE · MASTER
                        </Text>
                    </View>
                </View>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
                    onPress={toggleTheme}
                    style={s.mobileThemeBtn}
                >
                    <Text style={s.mobileThemeBtnText}>
                        {mode === "dark" ? "☀" : "☾"}
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
                            <View
                                style={[
                                    s.navIconWrap,
                                    active && s.navIconWrapActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        s.navIcon,
                                        active && s.navIconActive,
                                    ]}
                                >
                                    {item.icon}
                                </Text>
                            </View>
                            <Text
                                style={[s.navLabel, active && s.navLabelActive]}
                            >
                                {item.label === "Question Bank"
                                    ? "Questions"
                                    : item.label}
                            </Text>
                        </Pressable>
                    );
                })}
                <Pressable
                    onPress={() => router.push("/resources" as never)}
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
                <View style={s.contentArea}>
                    {renderDesktopTopBar()}
                    <View style={s.mainAndRightRow}>
                        {renderMain()}
                        {renderRightPanel()}
                    </View>
                </View>
            </View>
            {renderBottomNav()}
        </View>
    );
}

// ─── Styles & Vibrant Purple/Lavender Palette ────────────────────────────────

function makeStyles(t: AppTheme, mode: "light" | "dark", isWide: boolean) {
    const isDark = mode === "dark";

    // Core reference palette
    const PRIMARY_PURPLE = "#6842E8";
    const BRIGHT_PURPLE = "#7549F5";
    const LAVENDER_HIGHLIGHT = "#B9A5FF";
    const LIGHT_LAVENDER_SURFACE = "#F0ECFF";
    const DARK_NAVY_BG = "#10101F";
    const DARK_CARD_SURFACE = "#1B1930";

    const bg = isDark ? DARK_NAVY_BG : "#F6F4FF";
    const cardBg = isDark ? DARK_CARD_SURFACE : "#FFFFFF";
    const cardAltBg = isDark ? "#252242" : LIGHT_LAVENDER_SURFACE;
    const borderCol = isDark ? "#2E2A4F" : "#E5DEFF";
    const textPrimary = isDark ? "#FFFFFF" : "#16132E";
    const textSecondary = isDark ? "#B9A5FF" : "#5E5882";
    const textMuted = isDark ? "#8E88B5" : "#7B749E";

    // Hero surface blends rich purple/lavender per reference
    const heroBg = isDark ? "#261D4C" : "#E6DFFF";
    const heroBorder = isDark ? "#463582" : "#CFC2FF";
    const heroTitleCol = isDark ? "#FFFFFF" : "#181236";
    const heroDescCol = isDark ? "#D6C9FF" : "#4A4175";

    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: bg,
        },

        // ── Layout shells ──────────────────────────────────────────────────────
        body: {
            flex: 1,
            flexDirection: "row",
        },
        contentArea: {
            flex: 1,
            flexDirection: "column",
        },
        mainAndRightRow: {
            flex: 1,
            flexDirection: "row",
        },

        // ── Sidebar (Always rich dark navy as in reference) ───────────────────
        sidebar: {
            width: 232,
            backgroundColor: DARK_NAVY_BG,
            borderRightWidth: 1,
            borderRightColor: "#221F3B",
            paddingTop: 24,
            paddingBottom: 20,
            display: isWide ? "flex" : "none",
            justifyContent: "space-between",
        } as any,
        sidebarBrand: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 20,
            paddingBottom: 28,
        },
        sidebarLogo: {
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: BRIGHT_PURPLE,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: BRIGHT_PURPLE,
            shadowOpacity: 0.4,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
        },
        sidebarLogoText: {
            color: "#FFFFFF",
            fontWeight: "900",
            fontSize: 20,
        },
        sidebarBrandName: {
            color: "#FFFFFF",
            fontWeight: "900",
            fontSize: 16,
            letterSpacing: 0.2,
        },
        sidebarNav: {
            flex: 1,
            gap: 6,
            paddingHorizontal: 14,
        },
        sidebarItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 12,
        },
        sidebarItemActive: {
            backgroundColor: PRIMARY_PURPLE,
        },
        sidebarItemIcon: {
            color: "#9590B8",
            fontSize: 16,
            width: 22,
            textAlign: "center",
        },
        sidebarItemIconActive: {
            color: "#FFFFFF",
        },
        sidebarItemLabel: {
            color: "#9590B8",
            fontSize: 13,
            fontWeight: "600",
        },
        sidebarItemLabelActive: {
            color: "#FFFFFF",
            fontWeight: "800",
        },
        sidebarBottom: {
            paddingHorizontal: 14,
            paddingTop: 16,
            gap: 14,
            borderTopWidth: 1,
            borderTopColor: "#221F3B",
        },
        sidebarQuoteBox: {
            backgroundColor: "#1B1930",
            borderWidth: 1,
            borderColor: "#2E2A4F",
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 14,
            alignItems: "center",
        },
        sidebarQuoteSparkleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        sidebarQuoteSparkle: {
            color: LAVENDER_HIGHLIGHT,
            fontSize: 12,
        },
        sidebarQuoteTitle: {
            color: "#E2DCFF",
            fontSize: 12,
            fontWeight: "700",
            fontStyle: "italic",
        },
        sidebarQuoteSubtitle: {
            color: LAVENDER_HIGHLIGHT,
            fontSize: 13,
            fontWeight: "900",
            fontStyle: "italic",
            marginTop: 2,
        },
        themeToggle: {
            flexDirection: "row",
            backgroundColor: "#1B1930",
            borderRadius: 20,
            padding: 4,
            gap: 4,
            borderWidth: 1,
            borderColor: "#2E2A4F",
        },
        themeToggleOption: {
            flex: 1,
            paddingVertical: 7,
            borderRadius: 16,
            alignItems: "center",
        },
        themeToggleOptionActive: {
            backgroundColor: BRIGHT_PURPLE,
        },
        themeToggleText: {
            color: "#9590B8",
            fontSize: 11,
            fontWeight: "700",
        },
        themeToggleTextActive: {
            color: "#FFFFFF",
            fontWeight: "800",
        },

        // ── Top bar (desktop) ─────────────────────────────────────────────────
        topBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 28,
            paddingVertical: 14,
            backgroundColor: cardBg,
            borderBottomWidth: 1,
            borderBottomColor: borderCol,
        },
        topBarSearch: {
            width: 380,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: cardAltBg,
            borderWidth: 1,
            borderColor: borderCol,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 9,
        },
        topBarSearchIcon: { color: textSecondary, fontSize: 16 },
        topBarSearchPlaceholder: { color: textMuted, fontSize: 12, flex: 1 },
        topBarRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        topBarThemeBtn: {
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: cardAltBg,
            borderWidth: 1,
            borderColor: borderCol,
            alignItems: "center",
            justifyContent: "center",
        },
        topBarThemeBtnText: { color: textPrimary, fontSize: 17 },

        // ── Mobile header ──────────────────────────────────────────────────────
        mobileHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: Platform.OS === "ios" ? 48 : 14,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: borderCol,
            backgroundColor: cardBg,
        },
        mobileBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
        mobileLogo: {
            width: 36,
            height: 36,
            borderRadius: 11,
            backgroundColor: BRIGHT_PURPLE,
            alignItems: "center",
            justifyContent: "center",
        },
        mobileLogoText: { color: "#FFFFFF", fontWeight: "900", fontSize: 19 },
        mobileBrandName: {
            color: textPrimary,
            fontWeight: "900",
            fontSize: 16,
        },
        mobileBrandSub: {
            color: textSecondary,
            fontSize: 8,
            fontWeight: "700",
            letterSpacing: 1.1,
            marginTop: 2,
        },
        mobileThemeBtn: {
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: cardAltBg,
            borderWidth: 1,
            borderColor: borderCol,
            alignItems: "center",
            justifyContent: "center",
        },
        mobileThemeBtnText: { color: textPrimary, fontSize: 18 },

        // ── Main scroll area ───────────────────────────────────────────────────
        mainScroll: { flex: 1 },
        mainContent: {
            padding: isWide ? 24 : 16,
            paddingBottom: 28,
        },

        // ── Hero banner ─────────────────────────────────────────────────────────
        hero: {
            position: "relative",
            padding: isWide ? 28 : 20,
            borderRadius: 22,
            backgroundColor: heroBg,
            borderWidth: 1,
            borderColor: heroBorder,
            marginBottom: 22,
            overflow: "hidden",
        },
        heroDecorCircleLarge: {
            position: "absolute",
            right: -30,
            top: -30,
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: BRIGHT_PURPLE,
            opacity: isDark ? 0.18 : 0.1,
        },
        heroDecorCircleSmall: {
            position: "absolute",
            right: 60,
            bottom: -25,
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: LAVENDER_HIGHLIGHT,
            opacity: isDark ? 0.15 : 0.25,
        },
        heroCopy: {
            maxWidth: isWide ? 520 : undefined,
            zIndex: 1,
        },
        eyebrowPill: {
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 5,
            backgroundColor: isDark
                ? "rgba(185, 165, 255, 0.14)"
                : "rgba(104, 66, 232, 0.1)",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            marginBottom: 10,
        },
        eyebrowSparkle: {
            color: isDark ? LAVENDER_HIGHLIGHT : PRIMARY_PURPLE,
            fontSize: 10,
        },
        eyebrowText: {
            color: isDark ? LAVENDER_HIGHLIGHT : PRIMARY_PURPLE,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1.2,
        },
        heroTitle: {
            color: heroTitleCol,
            fontSize: isWide ? 26 : 21,
            fontWeight: "900",
            lineHeight: isWide ? 33 : 27,
        },
        heroDescription: {
            color: heroDescCol,
            fontSize: 12,
            lineHeight: 18,
            marginTop: 6,
        },
        primaryButton: {
            backgroundColor: BRIGHT_PURPLE,
            borderRadius: 20,
            paddingHorizontal: 18,
            paddingVertical: 11,
            alignSelf: "flex-start",
            marginTop: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            shadowColor: PRIMARY_PURPLE,
            shadowOpacity: 0.35,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
        },
        primaryButtonText: {
            color: "#FFFFFF",
            fontWeight: "800",
            fontSize: 12,
        },
        primaryButtonArrow: {
            color: "#FFFFFF",
            fontWeight: "900",
            fontSize: 13,
        },

        // ── Section headers ─────────────────────────────────────────────────────
        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
        },
        sectionTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        sectionHeaderIcon: {
            color: isDark ? LAVENDER_HIGHLIGHT : PRIMARY_PURPLE,
            fontSize: 15,
        },
        sectionTitle: {
            color: textPrimary,
            fontSize: 15,
            fontWeight: "900",
        },
        viewAllLink: {
            color: isDark ? LAVENDER_HIGHLIGHT : PRIMARY_PURPLE,
            fontSize: 12,
            fontWeight: "800",
        },

        // ── Loading / error ─────────────────────────────────────────────────────
        loadingRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
        },
        loadingText: { color: textMuted, fontSize: 12 },
        inlineError: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: "#EF6090",
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
        },
        inlineErrorText: { color: "#EF6090", fontSize: 12, fontWeight: "800" },
        inlineErrorDetail: { color: textMuted, fontSize: 10, marginTop: 3 },
        retrySmall: {
            backgroundColor: BRIGHT_PURPLE,
            borderRadius: 9,
            paddingHorizontal: 12,
            paddingVertical: 7,
        },
        retrySmallText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
        emptyNote: { color: textMuted, fontSize: 12, marginBottom: 16 },

        // ── Subject cards (Horizontal carousel) ─────────────────────────────────
        subjectScrollRow: {
            gap: 12,
            paddingRight: 16,
            paddingBottom: 4,
            marginBottom: 20,
        },
        subjectCard: {
            minHeight: 132,
            padding: 14,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: borderCol,
            backgroundColor: cardBg,
            overflow: "hidden",
            justifyContent: "space-between",
        },
        subjectCardAccentBar: {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
        },
        subjectCardTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
            marginTop: 4,
        },
        subjectIconBox: {
            width: 38,
            height: 38,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
        },
        subjectIconText: { fontSize: 15, fontWeight: "900" },
        subjectCodeBadge: {
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 7,
            paddingVertical: 3,
            flexShrink: 1,
        },
        subjectCodeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
        subjectName: {
            color: textPrimary,
            fontSize: 13,
            fontWeight: "800",
            lineHeight: 18,
        },
        subjectProgressBar: {
            height: 4,
            borderRadius: 2,
            marginTop: 10,
            marginBottom: 6,
            overflow: "hidden",
        },
        subjectProgressFill: {
            height: 4,
            borderRadius: 2,
        },
        subjectMeta: {
            color: textMuted,
            fontSize: 10,
            fontWeight: "600",
        },

        // ── Find Question section ───────────────────────────────────────────────
        findSection: {
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: borderCol,
            borderRadius: 20,
            padding: isWide ? 20 : 16,
            marginBottom: 20,
        },
        findHeader: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
        },
        findIconBadge: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: isDark ? "#2A234D" : LIGHT_LAVENDER_SURFACE,
            alignItems: "center",
            justifyContent: "center",
        },
        findIconBadgeText: {
            color: isDark ? LAVENDER_HIGHLIGHT : PRIMARY_PURPLE,
            fontSize: 17,
            fontWeight: "800",
        },
        findSectionTitle: {
            color: textPrimary,
            fontSize: 15,
            fontWeight: "900",
        },
        findSectionSubtitle: {
            color: textMuted,
            fontSize: 11,
            marginTop: 2,
        },
        searchBox: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: cardAltBg,
            borderWidth: 1,
            borderColor: borderCol,
            borderRadius: 14,
            paddingLeft: 14,
            paddingRight: 6,
            paddingVertical: 6,
            marginBottom: 12,
        },
        searchIcon: { color: textSecondary, fontSize: 18 },
        searchPlaceholder: { color: textMuted, fontSize: 12, flex: 1 },
        searchBtn: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: BRIGHT_PURPLE,
            alignItems: "center",
            justifyContent: "center",
        },
        searchBtnText: { color: "#FFFFFF", fontSize: 16 },
        quickFilters: {
            gap: 8,
            paddingBottom: 2,
        },
        quickFilter: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: cardAltBg,
            borderWidth: 1,
            borderColor: borderCol,
            paddingHorizontal: 13,
            paddingVertical: 7,
            borderRadius: 18,
        },
        quickFilterActive: {
            backgroundColor: BRIGHT_PURPLE,
            borderColor: BRIGHT_PURPLE,
        },
        quickFilterText: {
            color: textPrimary,
            fontSize: 11,
            fontWeight: "700",
        },
        quickFilterTextActive: { color: "#FFFFFF", fontWeight: "800" },
        quickFilterChevron: { color: "#FFFFFF", fontSize: 11 },

        // ── Recommended / Pending states ───────────────────────────────────────
        recommendedInCard: {
            marginTop: 18,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: borderCol,
        },
        recommendedSubHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
        },
        recommendedSubTitle: {
            color: textPrimary,
            fontSize: 13,
            fontWeight: "800",
        },
        pendingCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: cardAltBg,
            borderWidth: 1,
            borderColor: borderCol,
            borderRadius: 14,
            padding: 14,
        },
        pendingIconWrap: {
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: isDark ? "#1B1930" : "#FFFFFF",
            borderWidth: 1,
            borderColor: borderCol,
            alignItems: "center",
            justifyContent: "center",
        },
        pendingIcon: { fontSize: 20 },
        pendingTitle: { color: textPrimary, fontSize: 13, fontWeight: "800" },
        pendingText: {
            color: textMuted,
            fontSize: 11,
            lineHeight: 16,
            marginTop: 2,
        },
        pendingActionPill: {
            backgroundColor: BRIGHT_PURPLE,
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 9,
        },
        pendingActionText: {
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: "800",
        },

        // Mobile recommended card (bright floating contrast card like reference)
        pendingCardMobile: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: isDark ? "#F5F2FF" : "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E5DEFF",
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
        },
        pendingBadgeRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
        },
        pendingTagBadge: {
            backgroundColor: "#E6DFFF",
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
        },
        pendingTagText: {
            color: PRIMARY_PURPLE,
            fontSize: 9,
            fontWeight: "900",
        },
        pendingDot: {
            color: "#7B749E",
            fontSize: 10,
        },
        pendingSubNote: {
            color: "#7B749E",
            fontSize: 10,
            fontWeight: "600",
        },
        pendingTitleMobile: {
            color: "#16132E",
            fontSize: 13,
            fontWeight: "800",
        },
        pendingTextMobile: {
            color: "#5E5882",
            fontSize: 11,
            lineHeight: 16,
            marginTop: 2,
        },
        pendingChevron: {
            color: PRIMARY_PURPLE,
            fontSize: 22,
            fontWeight: "700",
            marginLeft: 4,
        },

        // ── Exam cards (mobile inline) ────────────────────────────────────────
        demoBadge: {
            backgroundColor: cardAltBg,
            borderWidth: 1,
            borderColor: borderCol,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
        },
        demoBadgeText: {
            color: textSecondary,
            fontSize: 10,
            fontWeight: "700",
        },
        examCardInline: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: borderCol,
            borderRadius: 16,
            padding: 12,
        },
        examDateBox: {
            width: 46,
            height: 48,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
        },
        examDay: { fontWeight: "900", fontSize: 16 },
        examMonth: { fontWeight: "800", fontSize: 8, marginTop: 1 },
        examInfo: { flex: 1 },
        examTitle: { color: textPrimary, fontSize: 13, fontWeight: "800" },
        examRemaining: { color: textMuted, fontSize: 11, marginTop: 3 },
        examLevelBadge: {
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 9,
            paddingVertical: 4,
        },
        examLevelText: { fontSize: 10, fontWeight: "800" },

        // ── Right panel (Desktop) ─────────────────────────────────────────────
        rightPanel: {
            width: 300,
            padding: 20,
            paddingLeft: 0,
            gap: 16,
        },
        panelCard: {
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: borderCol,
            borderRadius: 20,
            padding: 18,
        },
        panelSectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 14,
        },
        panelIcon: { fontSize: 14 },
        panelTitle: {
            color: textPrimary,
            fontSize: 14,
            fontWeight: "900",
            flex: 1,
        },
        viewAllBtn: {},
        viewAllText: {
            color: isDark ? LAVENDER_HIGHLIGHT : PRIMARY_PURPLE,
            fontSize: 11,
            fontWeight: "800",
        },
        examCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: cardAltBg,
            borderRadius: 14,
            padding: 10,
        },

        // Progress card
        progressCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: heroBg,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: heroBorder,
        },
        progressSparkleBadge: {
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: BRIGHT_PURPLE,
            alignItems: "center",
            justifyContent: "center",
        },
        progressSparkleIcon: { color: "#FFFFFF", fontSize: 16 },
        progressTitle: { color: heroTitleCol, fontSize: 12, fontWeight: "900" },
        progressText: { color: heroDescCol, fontSize: 11, marginTop: 2 },
        progressStar: {
            color: isDark ? LAVENDER_HIGHLIGHT : PRIMARY_PURPLE,
            fontSize: 18,
        },

        // Stats grid
        statsGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
        },
        statCard: {
            flex: 1,
            minWidth: "45%",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: cardAltBg,
            borderWidth: 1,
            borderColor: borderCol,
            borderRadius: 14,
            padding: 10,
        },
        statIconBadge: {
            width: 32,
            height: 32,
            borderRadius: 9,
            alignItems: "center",
            justifyContent: "center",
        },
        statIcon: { fontSize: 14 },
        statLabel: { color: textMuted, fontSize: 9, fontWeight: "700" },
        statValue: {
            color: textPrimary,
            fontSize: 16,
            fontWeight: "900",
            marginTop: 1,
        },

        // ── Bottom nav (mobile) ────────────────────────────────────────────────
        bottomBar: {
            flexDirection: "row",
            justifyContent: "space-around",
            backgroundColor: cardBg,
            borderTopWidth: 1,
            borderTopColor: borderCol,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? 22 : 10,
            display: isWide ? ("none" as any) : "flex",
        },
        navItem: { alignItems: "center", gap: 3, flex: 1 },
        navIconWrap: {
            width: 34,
            height: 30,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
        },
        navIconWrapActive: {
            backgroundColor: isDark ? "#2B2254" : LIGHT_LAVENDER_SURFACE,
        },
        navIcon: { color: textMuted, fontSize: 17 },
        navIconActive: { color: BRIGHT_PURPLE },
        navLabel: { color: textMuted, fontSize: 9, fontWeight: "700" },
        navLabelActive: {
            color: isDark ? "#FFFFFF" : PRIMARY_PURPLE,
            fontWeight: "900",
        },
    });
}
