import React, { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppShell from "../components/AppShell";
import { useAppTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";
import type { AppTheme } from "../constants/theme";

export default function AccountScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const { user, isAuthenticated, isRestoring, logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const s = useMemo(() => makeStyles(theme), [theme]);

    const handleLogout = async () => {
        const performLogout = async () => {
            setIsLoggingOut(true);
            try {
                await logout();
                router.replace("/login" as never);
            } catch (err) {
                console.warn("[AccountScreen] Logout error:", err);
                router.replace("/login" as never);
            } finally {
                setIsLoggingOut(false);
            }
        };

        if (Platform.OS === "web") {
            const confirmed = window.confirm("Are you sure you want to log out?");
            if (confirmed) {
                void performLogout();
            }
        } else {
            Alert.alert(
                "Log Out",
                "Are you sure you want to log out of your account?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Log Out",
                        style: "destructive",
                        onPress: () => void performLogout(),
                    },
                ],
            );
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "–";
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return dateString;
        }
    };

    if (isRestoring) {
        return (
            <AppShell active="account">
                <View style={s.centered}>
                    <ActivityIndicator size="large" color={theme.accent} />
                    <Text style={[s.mutedText, { marginTop: 12 }]}>
                        Checking session...
                    </Text>
                </View>
            </AppShell>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <AppShell active="account">
                <View style={s.centered}>
                    <View style={s.guestIconCircle}>
                        <Ionicons
                            name="person-outline"
                            size={36}
                            color={theme.muted}
                        />
                    </View>
                    <Text style={s.title}>Not Signed In</Text>
                    <Text style={s.subtitle}>
                        Sign in to access your student profile and personalized
                        study tools.
                    </Text>

                    <View style={s.authButtonsRow}>
                        <Pressable
                            style={s.signInButton}
                            onPress={() => router.push("/login" as never)}
                        >
                            <Text style={s.signInButtonText}>Sign In</Text>
                        </Pressable>

                        <Pressable
                            style={s.registerButton}
                            onPress={() => router.push("/register" as never)}
                        >
                            <Text style={s.registerButtonText}>Register</Text>
                        </Pressable>
                    </View>
                </View>
            </AppShell>
        );
    }

    const initials = user.displayName
        ? user.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
        : "U";

    return (
        <AppShell active="account">
            <View style={s.container}>
                {/* Profile Card */}
                <View style={s.card}>
                    <View style={s.avatarRow}>
                        <View style={s.avatarCircle}>
                            <Text style={s.avatarText}>{initials}</Text>
                        </View>
                        <View style={s.avatarMeta}>
                            <Text style={s.nameText} numberOfLines={1}>
                                {user.displayName}
                            </Text>
                            <Text style={s.emailText} numberOfLines={1}>
                                {user.email}
                            </Text>
                            <View style={s.roleBadge}>
                                <Ionicons
                                    name="school-outline"
                                    size={12}
                                    color={theme.accent}
                                />
                                <Text style={s.roleText}>{user.role}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Account Details Section */}
                <View style={s.sectionCard}>
                    <Text style={s.sectionTitle}>Account Details</Text>

                    <View style={s.detailRow}>
                        <Text style={s.detailLabel}>User ID</Text>
                        <Text style={s.detailValue}>#{user.userId}</Text>
                    </View>

                    <View style={s.divider} />

                    <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Account Status</Text>
                        <View style={s.statusBadge}>
                            <View style={s.statusDot} />
                            <Text style={s.statusText}>
                                {user.accountStatus}
                            </Text>
                        </View>
                    </View>

                    <View style={s.divider} />

                    <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Member Since</Text>
                        <Text style={s.detailValue}>
                            {formatDate(user.createdAt)}
                        </Text>
                    </View>
                </View>

                {/* Security & Storage Info */}
                <View style={s.sectionCard}>
                    <Text style={s.sectionTitle}>Session & Security</Text>
                    <View style={s.securityRow}>
                        <Ionicons
                            name="shield-checkmark-outline"
                            size={20}
                            color={theme.success}
                        />
                        <Text style={s.securityText}>
                            Refresh token stored securely via Expo SecureStore.
                            Access token kept in memory.
                        </Text>
                    </View>
                </View>

                {/* Logout Button */}
                <Pressable
                    style={({ pressed }) => [
                        s.logoutButton,
                        isLoggingOut && s.buttonDisabled,
                        pressed && !isLoggingOut && { opacity: 0.85 },
                    ]}
                    onPress={() => void handleLogout()}
                    disabled={isLoggingOut}
                >
                    {isLoggingOut ? (
                        <ActivityIndicator color={theme.danger} size="small" />
                    ) : (
                        <>
                            <Ionicons
                                name="log-out-outline"
                                size={18}
                                color={theme.danger}
                            />
                            <Text style={s.logoutText}>Log Out</Text>
                        </>
                    )}
                </Pressable>
            </View>
        </AppShell>
    );
}

function makeStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: {
            gap: 16,
            maxWidth: 600,
            width: "100%",
            alignSelf: "center",
            paddingBottom: 24,
        },
        centered: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            maxWidth: 440,
            alignSelf: "center",
        },
        guestIconCircle: {
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: theme.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
        },
        title: {
            fontSize: theme.fontSize.xl,
            fontWeight: "700",
            color: theme.text,
            marginBottom: 8,
            textAlign: "center",
        },
        subtitle: {
            fontSize: theme.fontSize.base,
            color: theme.muted,
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 20,
        },
        authButtonsRow: {
            flexDirection: "row",
            gap: 12,
            width: "100%",
        },
        signInButton: {
            flex: 1,
            backgroundColor: theme.accent,
            height: 44,
            borderRadius: theme.radius.md,
            alignItems: "center",
            justifyContent: "center",
        },
        signInButtonText: {
            color: "#FFFFFF",
            fontSize: theme.fontSize.sm,
            fontWeight: "600",
        },
        registerButton: {
            flex: 1,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            height: 44,
            borderRadius: theme.radius.md,
            alignItems: "center",
            justifyContent: "center",
        },
        registerButtonText: {
            color: theme.text,
            fontSize: theme.fontSize.sm,
            fontWeight: "600",
        },
        mutedText: {
            fontSize: theme.fontSize.sm,
            color: theme.muted,
        },
        card: {
            backgroundColor: theme.surface,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 20,
        },
        avatarRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
        },
        avatarCircle: {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.accent,
            alignItems: "center",
            justifyContent: "center",
        },
        avatarText: {
            color: "#FFFFFF",
            fontSize: 22,
            fontWeight: "700",
        },
        avatarMeta: {
            flex: 1,
            minWidth: 0,
            gap: 4,
        },
        nameText: {
            fontSize: theme.fontSize.lg,
            fontWeight: "700",
            color: theme.text,
            flexShrink: 1,
        },
        emailText: {
            fontSize: theme.fontSize.sm,
            color: theme.muted,
            flexShrink: 1,
        },
        roleBadge: {
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            backgroundColor: theme.surfaceAlt,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: theme.radius.full,
            gap: 4,
            marginTop: 2,
        },
        roleText: {
            fontSize: theme.fontSize.xs,
            fontWeight: "600",
            color: theme.accent,
        },
        sectionCard: {
            backgroundColor: theme.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            gap: 12,
        },
        sectionTitle: {
            fontSize: theme.fontSize.sm,
            fontWeight: "600",
            color: theme.muted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 2,
        },
        detailRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
        },
        detailLabel: {
            fontSize: theme.fontSize.base,
            color: theme.text,
        },
        detailValue: {
            fontSize: theme.fontSize.base,
            fontWeight: "500",
            color: theme.text,
        },
        divider: {
            height: 1,
            backgroundColor: theme.border,
        },
        statusBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        statusDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.success,
        },
        statusText: {
            fontSize: theme.fontSize.sm,
            fontWeight: "600",
            color: theme.success,
        },
        securityRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
        },
        securityText: {
            flex: 1,
            fontSize: theme.fontSize.sm,
            color: theme.muted,
            lineHeight: 18,
        },
        logoutButton: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            height: 48,
            borderRadius: theme.radius.md,
            gap: 8,
            marginTop: 8,
        },
        buttonDisabled: {
            opacity: 0.6,
        },
        logoutText: {
            color: theme.danger,
            fontSize: theme.fontSize.base,
            fontWeight: "600",
        },
    });
}
