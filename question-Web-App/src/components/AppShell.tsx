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
import type { AppTheme } from "../constants/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export type NavKey = "home" | "questions" | "syllabus" | "prompt" | "resources";

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
        key: "questions",
        label: "Question Bank",
        short: "Questions",
        icon: "library-outline",
        iconActive: "library",
        path: "/question-bank",
    },
    {
        key: "syllabus",
        label: "Syllabus Tracker",
        short: "Syllabus",
        icon: "checkbox-outline",
        iconActive: "checkbox",
        path: "/syllabus",
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
        key: "resources",
        label: "Resources",
        short: "Resources",
        icon: "bookmarks-outline",
        iconActive: "bookmarks",
        path: "/resources",
    },
];

/** Breakpoints shared by every screen that uses the shell. */
export function useLayout() {
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === "web";
    return {
        width,
        isWide: isWeb && width >= 768,
        hasRightPanel: isWeb && width >= 1100,
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
    /** Shown beside the content on screens ≥ 1100px wide */
    rightPanel?: ReactNode;
    hideTopSearch?: boolean;
}) {
    const router = useRouter();
    const { theme, mode, toggleTheme } = useAppTheme();
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

            {/* Mobile header */}
            {!isWide && (
                <View style={[s.mobileHeader, { paddingTop: insets.top + 10 }]}>
                    <View style={s.brand}>
                        <View style={s.logo}>
                            <Text style={s.logoText}>Q</Text>
                        </View>
                        <Text style={s.brandName}>Question Web</Text>
                    </View>
                    <Pressable
                        onPress={toggleTheme}
                        accessibilityRole="button"
                        accessibilityLabel={themeLabel}
                        style={s.iconButton}
                    >
                        <Ionicons
                            name={themeIcon}
                            size={18}
                            color={theme.text}
                        />
                    </Pressable>
                </View>
            )}

            <View style={s.body}>
                {/* Sidebar */}
                {isWide && (
                    <View style={s.sidebar}>
                        <View style={s.sidebarBrand}>
                            <View style={s.logo}>
                                <Text style={s.logoText}>Q</Text>
                            </View>
                            <Text style={s.brandName}>Question Web</Text>
                        </View>

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

                        <Pressable
                            onPress={toggleTheme}
                            accessibilityRole="button"
                            accessibilityLabel={themeLabel}
                            style={s.sidebarThemeRow}
                        >
                            <Ionicons
                                name={themeIcon}
                                size={18}
                                color={theme.muted}
                            />
                            <Text style={s.sidebarLabel}>
                                {mode === "dark" ? "Light mode" : "Dark mode"}
                            </Text>
                        </Pressable>
                    </View>
                )}

                <View style={s.contentArea}>
                    {/* Desktop top bar */}
                    {isWide && !hideTopSearch && (
                        <View style={s.topBar}>
                            <Pressable
                                onPress={() => go("/question-bank")}
                                accessibilityRole="button"
                                accessibilityLabel="Search questions"
                                style={s.topSearch}
                            >
                                <Ionicons
                                    name="search"
                                    size={16}
                                    color={theme.muted}
                                />
                                <Text style={s.topSearchText}>
                                    Search questions, chapters, topics
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    <View style={s.mainRow}>
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={[
                                s.mainContent,
                                { padding: isWide ? 24 : 16 },
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
                                    padding: 20,
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

            {/* Mobile bottom nav */}
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
                                <Ionicons
                                    name={
                                        isActive ? item.iconActive : item.icon
                                    }
                                    size={22}
                                    color={
                                        isActive ? theme.accent : theme.muted
                                    }
                                />
                                <Text
                                    style={[
                                        s.navLabel,
                                        isActive && {
                                            color: theme.accent,
                                            fontWeight: "800",
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
            paddingBottom: 40,
            width: "100%",
            maxWidth: 1100,
            alignSelf: "center",
        },
        rightPanel: { width: 320 },

        logo: {
            width: 36,
            height: 36,
            borderRadius: 11,
            backgroundColor: t.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        logoText: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
        brand: { flexDirection: "row", alignItems: "center", gap: 10 },
        brandName: { color: t.text, fontWeight: "800", fontSize: 16 },

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
        iconButton: {
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },

        sidebar: {
            width: 240,
            paddingTop: 24,
            paddingBottom: 20,
            paddingHorizontal: 14,
            backgroundColor: t.surface,
            borderRightWidth: 1,
            borderRightColor: t.border,
        },
        sidebarBrand: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 8,
            paddingBottom: 28,
        },
        sidebarNav: { flex: 1, gap: 4 },
        sidebarItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 12,
            paddingVertical: 11,
            borderRadius: 12,
        },
        sidebarItemActive: { backgroundColor: t.surfaceAlt },
        sidebarLabel: { color: t.muted, fontSize: 14, fontWeight: "600" },
        sidebarLabelActive: { color: t.text, fontWeight: "800" },
        sidebarThemeRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 12,
            paddingVertical: 11,
            borderTopWidth: 1,
            borderTopColor: t.border,
        },

        topBar: {
            paddingHorizontal: 24,
            paddingVertical: 14,
            backgroundColor: t.surface,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
        },
        topSearch: {
            maxWidth: 420,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
        },
        topSearchText: { color: t.muted, fontSize: 13 },

        bottomBar: {
            flexDirection: "row",
            backgroundColor: t.surface,
            borderTopWidth: 1,
            borderTopColor: t.border,
            paddingTop: 8,
        },
        navItem: { flex: 1, alignItems: "center", gap: 3 },
        navLabel: { color: t.muted, fontSize: 10, fontWeight: "600" },
    });
}
