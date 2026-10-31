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
    | "learn"
    | "quiz"
    | "prompt"
    | "tools"
    | "revision"
    | "questions"
    | "syllabus"
    | "tracker"
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
        label: "Home",
        short: "Home",
        icon: "home-outline",
        iconActive: "home",
        path: "/",
    },
    {
        key: "learn",
        label: "Learn",
        short: "Learn",
        icon: "book-outline",
        iconActive: "book",
        path: "/learn",
    },
    {
        key: "quiz",
        label: "Quiz",
        short: "Quiz",
        icon: "clipboard-outline",
        iconActive: "clipboard",
        path: "/quiz",
    },
    {
        key: "prompt",
        label: "Prompt Studio",
        short: "Studio",
        icon: "sparkles-outline",
        iconActive: "sparkles",
        path: "/prompt-studio",
    },
    {
        key: "tools",
        label: "Study Tools",
        short: "Tools",
        icon: "grid-outline",
        iconActive: "grid",
        path: "/study-tools",
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
    floatingFooter,
    hideTopSearch = false,
}: {
    active: NavKey;
    children: ReactNode;
    /** Shown beside the content on screens >= 1120px wide */
    rightPanel?: ReactNode;
    /** Viewport-pinned footer rendered above bottom navigation */
    floatingFooter?: ReactNode;
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

    const isItemActive = (key: NavKey) => {
        if (key === active) return true;
        if (key === "quiz" && active === "revision") return true;
        if (key === "learn" && (active === "questions" || active === "resources")) return true;
        if (key === "tools" && (active === "syllabus" || active === "tracker")) return true;
        return false;
    };

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
                backgroundColor={theme.surface}
            />

            {/* Mobile Top Header */}
            {!isWide && (
                <View style={[s.mobileHeader, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
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
                            <Text style={s.brandSub}>Academic Productivity • v2.0</Text>
                        </View>
                    </Pressable>
                    <View style={s.mobileActions}>
                        <Pressable
                            onPress={toggleTheme}
                            accessibilityRole="button"
                            accessibilityLabel={themeLabel}
                            style={({ pressed }) => [
                                s.iconButton,
                                pressed && { opacity: 0.75 },
                            ]}
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
                            style={({ pressed }) => [
                                s.iconButton,
                                active === "account" && {
                                    borderColor: theme.accent,
                                    backgroundColor: theme.accentSoft,
                                },
                                pressed && { opacity: 0.75 },
                            ]}
                        >
                            <Ionicons
                                name={
                                    isAuthenticated
                                        ? "person"
                                        : "person-outline"
                                }
                                size={18}
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
                                <Text style={s.brandSub}>Academic Portal • v2.0</Text>
                            </View>
                        </Pressable>

                        <Text style={s.sidebarSectionLabel}>NAVIGATION</Text>
                        <View style={s.sidebarNav}>
                            {NAV_ITEMS.map((item) => {
                                const isActive = isItemActive(item.key);
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
                                        <Ionicons
                                            name={
                                                isActive
                                                    ? item.iconActive
                                                    : item.icon
                                            }
                                            size={19}
                                            color={
                                                isActive
                                                    ? theme.accent
                                                    : theme.textSecondary
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
                                    size={17}
                                    color={theme.textSecondary}
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
                                        backgroundColor: theme.accentSoft,
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
                                onPress={() => go("/learn")}
                                accessibilityRole="button"
                                accessibilityLabel="Search questions"
                                style={({ pressed }) => [
                                    s.topSearch,
                                    pressed && { opacity: 0.85 },
                                ]}
                            >
                                <Ionicons
                                    name="search-outline"
                                    size={17}
                                    color={theme.muted}
                                />
                                <Text style={s.topSearchText}>
                                    Search questions, topics, or resources...
                                </Text>
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
                                        size={14}
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
                                {
                                    paddingHorizontal: isWide ? 32 : 18,
                                    paddingTop: isWide ? 26 : 18,
                                    paddingBottom: floatingFooter
                                        ? isWide
                                            ? 110
                                            : 140
                                        : isWide
                                          ? 48
                                          : 96,
                                },
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
                    {floatingFooter}
                </View>
            </View>

            {/* Mobile Bottom Navigation */}
            {!isWide && (
                <View
                    style={[
                        s.bottomBar,
                        { paddingBottom: Math.max(insets.bottom, 8) + 6 },
                    ]}
                >
                    {NAV_ITEMS.map((item) => {
                        const isActive = isItemActive(item.key);
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
                                        s.navIconWrapper,
                                        isActive && s.navIconWrapperActive,
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
                                                : theme.textSecondary
                                        }
                                    />
                                </View>
                                <Text
                                    style={[
                                        s.navLabel,
                                        isActive
                                            ? s.navLabelActive
                                            : { color: theme.textSecondary },
                                    ]}
                                    numberOfLines={1}
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
        contentArea: { flex: 1, position: "relative" },
        mainRow: { flex: 1, flexDirection: "row" },
        mainContent: {
            width: "100%",
            maxWidth: 1040,
            alignSelf: "center",
        },
        rightPanel: { width: 320 },
        logo: {
            width: 34,
            height: 34,
            borderRadius: 9,
            backgroundColor: t.accent,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: t.accent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 3,
        },
        logoText: { color: "#FFFFFF", fontWeight: "900", fontSize: 17 },
        brand: { flexDirection: "row", alignItems: "center", gap: 11 },
        brandName: {
            color: t.text,
            fontWeight: "800",
            fontSize: 16,
            letterSpacing: -0.3,
        },
        brandSub: {
            color: t.textSecondary,
            fontSize: 11,
            fontWeight: "500",
            marginTop: 1,
        },
        mobileHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 18,
            paddingBottom: 12,
            backgroundColor: t.surface,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        mobileActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
        },
        iconButton: {
            width: 38,
            height: 38,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        sidebar: {
            width: 244,
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
            paddingBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
            marginBottom: 18,
        },
        sidebarSectionLabel: {
            color: t.muted,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.9,
            paddingHorizontal: 8,
            marginBottom: 10,
        },
        sidebarNav: { flex: 1, gap: 5 },
        sidebarItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 13,
            paddingVertical: 11,
            borderRadius: 10,
        },
        sidebarItemActive: {
            backgroundColor: t.accentSoft,
        },
        sidebarLabel: { color: t.textSecondary, fontSize: 13, fontWeight: "600" },
        sidebarLabelActive: { color: t.accent, fontWeight: "700" },
        sidebarFooter: {
            borderTopWidth: 1,
            borderTopColor: t.border,
            paddingTop: 14,
            gap: 10,
        },
        sidebarFooterItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 11,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 9,
        },
        sidebarAccountCard: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 10,
            borderRadius: 11,
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
            fontSize: 13,
            fontWeight: "700",
        },
        sidebarAccountSub: {
            color: t.textSecondary,
            fontSize: 11,
            marginTop: 1,
        },
        topBar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 32,
            paddingVertical: 13,
            backgroundColor: t.surface,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        topSearch: {
            flex: 1,
            maxWidth: 400,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 10,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        topSearchText: { flex: 1, color: t.muted, fontSize: 13 },
        topBarRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        studioQuickBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingHorizontal: 14,
            height: 36,
            borderRadius: 9,
            backgroundColor: t.accentSoft,
            borderWidth: 1,
            borderColor: t.accent + "33",
        },
        studioQuickText: {
            color: t.accent,
            fontSize: 13,
            fontWeight: "700",
        },
        topAccountBtn: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 9,
            paddingHorizontal: 13,
            height: 36,
            gap: 7,
        },
        topAccountText: {
            fontSize: 13,
            color: t.text,
            fontWeight: "600",
        },
        bottomBar: {
            flexDirection: "row",
            backgroundColor: t.surface,
            borderTopWidth: 1,
            borderTopColor: t.border,
            paddingTop: 8,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
        },
        navItem: { flex: 1, alignItems: "center", gap: 3 },
        navIconWrapper: {
            paddingHorizontal: 14,
            paddingVertical: 4,
            borderRadius: 14,
        },
        navIconWrapperActive: {
            backgroundColor: t.accentSoft,
        },
        navLabel: { fontSize: 11, fontWeight: "600" },
        navLabelActive: { color: t.accent, fontWeight: "700" },
    });
}
