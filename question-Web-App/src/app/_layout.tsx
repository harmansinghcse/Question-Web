import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, SplashScreen, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useAppTheme } from "../providers/ThemeProvider";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import QuestionWebSplash from "../components/QuestionWebSplash";
import "../../global.css";

// Prevent the native OS splash screen from auto-hiding before React mounts
void SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
    const router = useRouter();
    const segments = useSegments();
    const { isAuthenticated, isRestoring } = useAuth();
    const appTheme = useAppTheme();

    const isThemeReady =
        "ready" in appTheme
            ? Boolean((appTheme as { ready?: boolean }).ready)
            : true;

    const isInitialized = !isRestoring && isThemeReady;

    const firstSegment = segments[0] as string | undefined;
    const isAuthRoute =
        firstSegment === "login" ||
        firstSegment === "register" ||
        firstSegment === "signup" ||
        firstSegment === "forgot-password" ||
        firstSegment === "(auth)";

    // Immediately hide the static native splash so QuestionWebSplash takes over seamlessly
    useEffect(() => {
        void SplashScreen.hideAsync().catch(() => {});
    }, []);

    // Route protection once initialization finishes
    useEffect(() => {
        if (!isInitialized) return;

        if (!isAuthenticated && !isAuthRoute) {
            router.replace("/login" as never);
        } else if (isAuthenticated && isAuthRoute) {
            router.replace("/" as never);
        }
    }, [isInitialized, isAuthenticated, isAuthRoute, router]);

    const isRedirecting =
        isInitialized &&
        ((!isAuthenticated && !isAuthRoute) ||
            (isAuthenticated && isAuthRoute));

    const showSplash = !isInitialized || isRedirecting;

    return (
        <View style={styles.container}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: "slide_from_right",
                }}
            />
            {showSplash && (
                <View style={StyleSheet.absoluteFill} pointerEvents="auto">
                    <QuestionWebSplash />
                </View>
            )}
        </View>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <AuthProvider>
                    <RootLayoutNav />
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#070610",
    },
});
