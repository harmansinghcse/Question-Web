import { useMemo, type ReactNode } from "react";
import { useRouter } from "expo-router";
import {
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";
import type { AppTheme } from "../constants/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export type NavKey =
    | "home"
    | "revision"
    | "questions"
    | "syllabus"
    | "prompt"
    | "resources"
    | "account";

const NAV_ITEMS: {
    key: NavKey;
    label: string;
    short: string;
    icon: IconName;
    iconActive: IconName;
    path: string;
}[] = [
    {
        key: "home",
        label: "Overview",
        short: "Home",
        icon: "grid-outline",
        iconActive: "grid",
        path: "/",
    },
    {
        key: "revision",
        label: "Quiz Revision",
        short: "Revision",
        icon: "flash-outline",
        iconActive: "flash",
        path: "/quiz-revision",
    },
    {
        key: "questions",
        label: "Question Bank",
        short: "Questions",
        icon: "library-outline",
        iconActive: "library",
        path: "/question-bank",
    },
    {
        key: "syllabus",
        label: "Syllabus",
        short: "Syllabus",
        icon: "layers-outline",
        iconActive: "layers",
        path: "/syllabus",
    },
    {
        key: "resources",
        label: "Sources & Books",
        short: "Resources",
        icon: "book-outline",
        iconActive: "book",
        path: "/resources",
    },
    {
        key: "prompt",
        label: "Prompt Studio",
        short: "Studio",
        icon: "Terminal-outline" in Ionicons.glyphMap ? ("terminal-outline" as IconName) : "sparkles-outline",
        iconActive: "Terminal" in Ionicons.glyphMap ? ("terminal" as IconName) : "sparkles",
        path: "/prompt-studio",
    },
];

/** Breakpoints shared by every screen that uses the shell. */
export function useLayout() {
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === "web";
    return {
        width,
        isWide: isWeb && width >= 768,
        hasRightPanel: isWeb && width >= 1120,
    };
}

export default function AppShell({
    active,
    children,
    rightPanel,
    hideTopSearch = false,
}: {
    active: NavKey;
    children: ReactNode;
    /** Shown beside the content on screens >= 1120px wide */
    rightPanel?: ReactNode;
    hideTopSearch?: boolean;
}) {
    const router = useRouter();
    const { theme, mode, toggleTheme } = useAppTheme();
    const { user, isAuthenticated } = useAuth();
    const { isWide, hasRightPanel } = useLayout();
    const insets = useSafeAreaInsets();
    const s = useMemo(() => makeStyles(theme), [theme]);

    const themeIcon: IconName =
        mode === "dark" ? "sunny-outline" : "moon-outline";
    const themeLabel = `Switch to ${mode === "dark" ? "light" : "dark"} mode`;

    const go = (path: string) => router.push(path as never);

    return (
        <View
            style={[
                s.screen,
                !isWide && {
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                },
            ]}
        >
            <StatusBar
                barStyle={mode === "light" ? "dark-content" : "light-content"}
            />

            {/* Mobile Top Header */}
            {!isWide && (
                <View style={[s.mobileHeader, { paddingTop: insets.top + 10 }]}>
                    <Pressable
                        onPress={() => go("/")}
                        style={s.brand}
                        accessibilityRole="button"
                        accessibilityLabel="Question Web Home"
                    >
                        <View style={s.logo}>
                            <Text style={s.logoText}>Q</Text>
                        </View>
                        <View>
                            <Text style={s.brandName}>Question Web</Text>
                            <Text style={s.brandSub}>ACADEMIC REPOSITORY</Text>
                        </View>
                    </Pressable>
                    <View style={s.mobileActions}>
                        <Pressable
                            onPress={toggleTheme}
                            accessibilityRole="button"
                            accessibilityLabel={themeLabel}
                            style={s.iconButton}
                        >
                            <Ionicons
                                name={themeIcon}
                                size={18}
                                color={theme.textSecondary}
                            />
                        </Pressable>
                        <Pressable
                            onPress={() =>
                                go(isAuthenticated ? "/account" : "/login")
                            }
                            accessibilityRole="button"
                            accessibilityLabel={
                                isAuthenticated ? "Account profile" : "Sign in"
                            }
                            style={[
                                s.iconButton,
                                active === "account" && {
                                    borderColor: theme.accent,
                                    backgroundColor: theme.accentSoft,
                                },
                            ]}
                        >
                            <Ionicons
                                name={
                                    isAuthenticated
                                        ? "person"
                                        : "person-outline"
                                }
                                size={17}
                                color={
                                    isAuthenticated || active === "account"
                                        ? theme.accent
                                        : theme.textSecondary
                                }
                            />
                        </Pressable>
                    </View>
                </View>
            )}

            <View style={s.body}>
                {/* Desktop Sidebar */}
                {isWide && (
                    <View style={s.sidebar}>
                        <Pressable
                            onPress={() => go("/")}
                            style={s.sidebarBrand}
                            accessibilityRole="button"
                        >
                            <View style={s.logo}>
                                <Text style={s.logoText}>Q</Text>
                            </View>
                            <View>
                                <Text style={s.brandName}>Question Web</Text>
                                <Text style={s.brandSub}>ACADEMIC PORTAL</Text>
                            </View>
                        </Pressable>

                        <Text style={s.sidebarSectionLabel}>NAVIGATION</Text>
                        <View style={s.sidebarNav}>
                            {NAV_ITEMS.map((item) => {
                                const isActive = item.key === active;
                                return (
                                    <Pressable
                                        key={item.key}
                                        onPress={() => go(item.path)}
                                        accessibilityRole="button"
                                        accessibilityLabel={item.label}
                                        accessibilityState={{
                                            selected: isActive,
                                        }}
                                        style={({ pressed }) => [
                                            s.sidebarItem,
                                            isActive && s.sidebarItemActive,
                                            pressed && { opacity: 0.85 },
                                        ]}
                                    >
                                        {isActive && (
                                            <View style={s.activeBar} />
                                        )}
                                        <Ionicons
                                            name={
                                                isActive
                                                    ? item.iconActive
                                                    : item.icon
                                            }
                                            size={18}
                                            color={
                                                isActive
                                                    ? theme.accent
                                                    : theme.muted
                                            }
                                        />
                                        <Text
                                            style={[
                                                s.sidebarLabel,
                                                isActive &&
                                                    s.sidebarLabelActive,
                                            ]}
                                        >
                                            {item.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <View style={s.sidebarFooter}>
                            <Pressable
                                onPress={toggleTheme}
                                accessibilityRole="button"
                                accessibilityLabel={themeLabel}
                                style={({ pressed }) => [
                                    s.sidebarFooterItem,
                                    pressed && { opacity: 0.85 },
                                ]}
                            >
                                <Ionicons
                                    name={themeIcon}
                                    size={18}
                                    color={theme.muted}
                                />
                                <Text style={s.sidebarLabel}>
                                    {mode === "dark"
                                        ? "Light Theme"
                                        : "Dark Theme"}
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() =>
                                    go(isAuthenticated ? "/account" : "/login")
                                }
                                accessibilityRole="button"
                                accessibilityLabel={
                                    isAuthenticated
                                        ? "Account profile"
                                        : "Sign in"
                                }
                                style={({ pressed }) => [
                                    s.sidebarAccountCard,
                                    active === "account" && {
                                        borderColor: theme.accent,
                                    },
                                    pressed && { opacity: 0.85 },
                                ]}
                            >
                                <View style={s.sidebarAvatar}>
                                    <Ionicons
                                        name={
                                            isAuthenticated
                                                ? "person"
                                                : "log-in-outline"
                                        }
                                        size={15}
                                        color={theme.accent}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={s.sidebarAccountName}
                                        numberOfLines={1}
                                    >
                                        {isAuthenticated
                                            ? user?.displayName || "Student"
                                            : "Guest Session"}
                                    </Text>
                                    <Text
                                        style={s.sidebarAccountSub}
                                        numberOfLines={1}
                                    >
                                        {isAuthenticated
                                            ? user?.email
                                            : "Sign in to sync"}
                                    </Text>
                                </View>
                                <Ionicons
                                    name="chevron-forward"
                                    size={14}
                                    color={theme.muted}
                                />
                            </Pressable>
                        </View>
                    </View>
                )}

                <View style={s.contentArea}>
                    {/* Desktop Top Bar */}
                    {isWide && !hideTopSearch && (
                        <View style={s.topBar}>
                            <Pressable
                                onPress={() => go("/question-bank")}
                                accessibilityRole="button"
                                accessibilityLabel="Search questions"
                                style={({ pressed }) => [
                                    s.topSearch,
                                    pressed && { opacity: 0.85 },
                                ]}
                            >
                                <Ionicons
                                    name="search-outline"
                                    size={16}
                                    color={theme.muted}
                                />
                                <Text style={s.topSearchText}>
                                    Search questions, topics, or keywords...
                                </Text>
                                <View style={s.topSearchShortcut}>
                                    <Text style={s.topSearchShortcutText}>
                                        Explore
                                    </Text>
                                </View>
                            </Pressable>

                            <View style={s.topBarRight}>
                                <Pressable
                                    onPress={() => go("/prompt-studio")}
                                    style={({ pressed }) => [
                                        s.studioQuickBtn,
                                        pressed && { opacity: 0.85 },
                                    ]}
                                >
                                    <Ionicons
                                        name="sparkles-outline"
                                        size={15}
                                        color={theme.accent}
                                    />
                                    <Text style={s.studioQuickText}>
                                        Prompt Studio
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() =>
                                        go(
                                            isAuthenticated
                                                ? "/account"
                                                : "/login",
                                        )
                                    }
                                    style={({ pressed }) => [
                                        s.topAccountBtn,
                                        pressed && { opacity: 0.85 },
                                    ]}
                                >
                                    <Ionicons
                                        name={
                                            isAuthenticated
                                                ? "person-circle"
                                                : "person-outline"
                                        }
                                        size={18}
                                        color={
                                            isAuthenticated
                                                ? theme.accent
                                                : theme.textSecondary
                                        }
                                    />
                                    <Text style={s.topAccountText}>
                                        {isAuthenticated
                                            ? user?.displayName || "Account"
                                            : "Sign In"}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    )}

                    <View style={s.mainRow}>
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={[
                                s.mainContent,
                                { padding: isWide ? 28 : 16 },
                            ]}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {children}
                        </ScrollView>
                        {hasRightPanel && rightPanel ? (
                            <ScrollView
                                style={s.rightPanel}
                                contentContainerStyle={{
                                    padding: 24,
                                    paddingLeft: 0,
                                    gap: 16,
                                }}
                                showsVerticalScrollIndicator={false}
                            >
                                {rightPanel}
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </View>

            {/* Mobile Bottom Navigation */}
            {!isWide && (
                <View
                    style={[
                        s.bottomBar,
                        { paddingBottom: Math.max(insets.bottom, 10) },
                    ]}
                >
                    {NAV_ITEMS.map((item) => {
                        const isActive = item.key === active;
                        return (
                            <Pressable
                                key={item.key}
                                onPress={() => go(item.path)}
                                accessibilityRole="button"
                                accessibilityLabel={item.label}
                                accessibilityState={{ selected: isActive }}
                                style={s.navItem}
                            >
                                <View
                                    style={[
                                        s.navIconPill,
                                        isActive && {
                                            backgroundColor: theme.accentSoft,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name={
                                            isActive
                                                ? item.iconActive
                                                : item.icon
                                        }
                                        size={20}
                                        color={
                                            isActive
                                                ? theme.accent
                                                : theme.muted
                                        }
                                    />
                                </View>
                                <Text
                                    style={[
                                        s.navLabel,
                                        isActive && {
                                            color: theme.text,
                                            fontWeight: "700",
                                        },
                                    ]}
                                >
                                    {item.short}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

function makeStyles(t: AppTheme) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: t.background },
        body: { flex: 1, flexDirection: "row" },
        contentArea: { flex: 1 },
        mainRow: { flex: 1, flexDirection: "row" },
        mainContent: {
            paddingBottom: 48,
            width: "100%",
            maxWidth: 1120,
            alignSelf: "center",
        },
        rightPanel: { width: 320 },
        logo: {
            width: 34,
            height: 34,
            borderRadius: 9,
            backgroundColor: t.accentSoft,
            borderWidth: 1,
            borderColor: t.accent + "66",
            alignItems: "center",
            justifyContent: "center",
        },
        logoText: { color: t.accent, fontWeight: "900", fontSize: 17 },
        brand: { flexDirection: "row", alignItems: "center", gap: 10 },
        brandName: {
            color: t.text,
            fontWeight: "800",
            fontSize: 15,
            letterSpacing: 0.2,
        },
        brandSub: {
            color: t.muted,
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 1.1,
            marginTop: 1,
        },
        mobileHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingBottom: 12,
            backgroundColor: t.surface,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        mobileActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        iconButton: {
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        sidebar: {
            width: 248,
            paddingTop: 22,
            paddingBottom: 18,
            paddingHorizontal: 14,
            backgroundColor: t.surface,
            borderRightWidth: 1,
            borderRightColor: t.border,
        },
        sidebarBrand: {
            flexDirection: "row",
            alignItems: "center",
            gap: 11,
            paddingHorizontal: 8,
            paddingBottom: 24,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
            marginBottom: 18,
        },
        sidebarSectionLabel: {
            color: t.muted,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1.2,
            paddingHorizontal: 10,
            marginBottom: 8,
        },
        sidebarNav: { flex: 1, gap: 4 },
        sidebarItem: {
            position: "relative",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 12,
            paddingVertical: 11,
            borderRadius: 10,
            overflow: "hidden",
        },
        sidebarItemActive: {
            backgroundColor: t.surfaceAlt,
        },
        activeBar: {
            position: "absolute",
            left: 0,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: 2,
            backgroundColor: t.accent,
        },
        sidebarLabel: { color: t.muted, fontSize: 13, fontWeight: "600" },
        sidebarLabelActive: { color: t.text, fontWeight: "700" },
        sidebarFooter: {
            borderTopWidth: 1,
            borderTopColor: t.border,
            paddingTop: 12,
            gap: 8,
        },
        sidebarFooterItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 10,
        },
        sidebarAccountCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 10,
            borderRadius: 12,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        sidebarAvatar: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: t.accentSoft,
            alignItems: "center",
            justifyContent: "center",
        },
        sidebarAccountName: {
            color: t.text,
            fontSize: 12,
            fontWeight: "700",
        },
        sidebarAccountSub: {
            color: t.muted,
            fontSize: 11,
            marginTop: 1,
        },
        topBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 28,
            paddingVertical: 12,
            backgroundColor: t.surface,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        topSearch: {
            flex: 1,
            maxWidth: 440,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingLeft: 14,
            paddingRight: 8,
            paddingVertical: 7,
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        topSearchText: { flex: 1, color: t.muted, fontSize: 13 },
        topSearchShortcut: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
        },
        topSearchShortcutText: {
            color: t.textSecondary,
            fontSize: 11,
            fontWeight: "600",
        },
        topBarRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
        },
        studioQuickBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            height: 36,
            borderRadius: 10,
            backgroundColor: t.accentSoft,
            borderWidth: 1,
            borderColor: t.accent + "44",
        },
        studioQuickText: {
            color: t.accent,
            fontSize: 12,
            fontWeight: "700",
        },
        topAccountBtn: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            height: 36,
            gap: 8,
        },
        topAccountText: {
            fontSize: 12,
            color: t.text,
            fontWeight: "600",
        },
        bottomBar: {
            flexDirection: "row",
            backgroundColor: t.surface,
            borderTopWidth: 1,
            borderTopColor: t.border,
            paddingTop: 6,
        },
        navItem: { flex: 1, alignItems: "center", gap: 3 },
        navIconPill: {
            paddingHorizontal: 14,
            paddingVertical: 3,
            borderRadius: 999,
        },
        navLabel: { color: t.muted, fontSize: 10, fontWeight: "600" },
    });
}