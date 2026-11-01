import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Keyboard,
    TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";
import type { AppTheme } from "../constants/theme";

export default function LoginScreen() {
    const router = useRouter();
    const { theme } = useAppTheme();
    const insets = useSafeAreaInsets();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const s = makeStyles(theme);

    const handleSubmit = async () => {
        if (isSubmitting) return;

        Keyboard.dismiss();
        setErrorMessage(null);

        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            setErrorMessage("Please enter your email address.");
            return;
        }

        if (!password) {
            setErrorMessage("Please enter your password.");
            return;
        }

        setIsSubmitting(true);

        try {
            await login({ email: trimmedEmail, password });
            router.replace("/");
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : "Invalid credentials. Please try again.";

            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={s.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        >
            <TouchableWithoutFeedback
                onPress={Keyboard.dismiss}
                accessible={false}
            >
                <ScrollView
                    contentContainerStyle={[
                        s.scrollContent,
                        {
                            paddingTop: Math.max(insets.top, 24),
                            paddingBottom: Math.max(insets.bottom, 24),
                        },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                    showsVerticalScrollIndicator={false}
                    contentInsetAdjustmentBehavior="never"
                >
                    {/* Brand */}
                    <View style={s.headerContainer}>
                        <View style={s.logo}>
                            <Text style={s.logoText}>Q</Text>
                        </View>

                        <Text style={s.title}>Welcome Back</Text>

                        <Text style={s.subtitle}>
                            Sign in to continue your learning journey with
                            Question Web.
                        </Text>
                    </View>

                    {/* Error */}
                    {errorMessage ? (
                        <View style={s.errorBanner}>
                            <Ionicons
                                name="alert-circle-outline"
                                size={20}
                                color={theme.danger}
                            />
                            <Text style={s.errorText}>{errorMessage}</Text>
                            <Pressable
                                onPress={() => setErrorMessage(null)}
                                hitSlop={8}
                            >
                                <Ionicons
                                    name="close"
                                    size={18}
                                    color={theme.danger}
                                />
                            </Pressable>
                        </View>
                    ) : null}

                    {/* Login Card */}
                    <View style={s.card}>
                        <View style={s.cardHeader}>
                            <Text style={s.cardTitle}>
                                Sign in to your account
                            </Text>
                            <Text style={s.cardDescription}>
                                Enter your registered academic email and
                                password.
                            </Text>
                        </View>

                        {/* Email */}
                        <View style={s.fieldGroup}>
                            <Text style={s.label}>Email Address</Text>

                            <View style={s.inputWrapper}>
                                <Ionicons
                                    name="mail-outline"
                                    size={19}
                                    color={theme.muted}
                                />

                                <TextInput
                                    style={s.input}
                                    placeholder="student@example.com"
                                    placeholderTextColor={theme.muted}
                                    value={email}
                                    onChangeText={(value) => {
                                        setEmail(value);
                                        if (errorMessage) setErrorMessage(null);
                                    }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="email"
                                    textContentType="emailAddress"
                                    returnKeyType="next"
                                    editable={!isSubmitting}
                                    blurOnSubmit={false}
                                    onSubmitEditing={() => Keyboard.dismiss()}
                                    accessibilityLabel="Email address"
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={s.fieldGroup}>
                            <Text style={s.label}>Password</Text>

                            <View style={s.inputWrapper}>
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={19}
                                    color={theme.muted}
                                />

                                <TextInput
                                    style={s.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor={theme.muted}
                                    value={password}
                                    onChangeText={(value) => {
                                        setPassword(value);
                                        if (errorMessage) setErrorMessage(null);
                                    }}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="current-password"
                                    textContentType="password"
                                    returnKeyType="go"
                                    editable={!isSubmitting}
                                    onSubmitEditing={handleSubmit}
                                    accessibilityLabel="Password"
                                />

                                <Pressable
                                    onPress={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                    style={s.eyeButton}
                                    hitSlop={10}
                                    accessibilityLabel={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    <Ionicons
                                        name={
                                            showPassword
                                                ? "eye-off-outline"
                                                : "eye-outline"
                                        }
                                        size={19}
                                        color={theme.muted}
                                    />
                                </Pressable>
                            </View>
                        </View>

                        {/* Submit */}
                        <Pressable
                            style={({ pressed }) => [
                                s.submitButton,
                                isSubmitting && s.buttonDisabled,
                                pressed && !isSubmitting && s.buttonPressed,
                            ]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <View style={s.submitContent}>
                                    <ActivityIndicator
                                        color="#FFFFFF"
                                        size="small"
                                    />
                                    <Text style={s.submitText}>
                                        Signing in...
                                    </Text>
                                </View>
                            ) : (
                                <View style={s.submitContent}>
                                    <Text style={s.submitText}>Sign In</Text>
                                    <Ionicons
                                        name="arrow-forward"
                                        size={18}
                                        color="#FFFFFF"
                                    />
                                </View>
                            )}
                        </Pressable>

                        <Text style={s.securityNote}>
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={13}
                            />{" "}
                            Your account information is securely handled.
                        </Text>
                    </View>

                    {/* Register */}
                    <View style={s.footerRow}>
                        <Text style={s.footerText}>
                            Don't have an account?{" "}
                        </Text>

                        <Pressable
                            onPress={() => router.push("/register" as never)}
                            disabled={isSubmitting}
                            hitSlop={6}
                        >
                            <Text style={s.footerLink}>Create account</Text>
                        </Pressable>
                    </View>

                    {/* Guest */}
                    <Pressable
                        style={s.guestButton}
                        onPress={() => {
                            Keyboard.dismiss();
                            router.replace("/");
                        }}
                        disabled={isSubmitting}
                    >
                        <Text style={s.guestText}>
                            Continue browsing as guest
                        </Text>
                        <Ionicons
                            name="arrow-forward-outline"
                            size={15}
                            color={theme.muted}
                        />
                    </Pressable>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

function makeStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },

        scrollContent: {
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 28,
            width: "100%",
            maxWidth: 480,
            alignSelf: "center",
        },

        headerContainer: {
            alignItems: "center",
            marginBottom: 30,
        },

        logo: {
            width: 60,
            height: 60,
            borderRadius: 19,
            backgroundColor: theme.accent,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            shadowColor: theme.accent,
            shadowOpacity: 0.25,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 5 },
            elevation: 5,
        },

        logoText: {
            color: "#FFFFFF",
            fontSize: 31,
            fontWeight: "800",
        },

        title: {
            fontSize: theme.fontSize["2xl"],
            fontWeight: "800",
            color: theme.text,
            marginBottom: 9,
            letterSpacing: -0.5,
        },

        subtitle: {
            fontSize: theme.fontSize.sm,
            color: theme.muted,
            textAlign: "center",
            lineHeight: 21,
            maxWidth: 310,
        },

        card: {
            backgroundColor: theme.surface,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 22,
            gap: 21,
        },

        cardHeader: {
            gap: 6,
            marginBottom: 2,
        },

        cardTitle: {
            color: theme.text,
            fontSize: theme.fontSize.lg,
            fontWeight: "700",
        },

        cardDescription: {
            color: theme.muted,
            fontSize: theme.fontSize.sm,
            lineHeight: 19,
        },

        fieldGroup: {
            gap: 9,
        },

        label: {
            fontSize: theme.fontSize.sm,
            fontWeight: "600",
            color: theme.text,
        },

        inputWrapper: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.surfaceAlt,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 13,
            paddingHorizontal: 14,
            minHeight: 54,
            gap: 11,
        },

        input: {
            flex: 1,
            minWidth: 0,
            height: 52,
            color: theme.text,
            fontSize: theme.fontSize.base,
        },

        eyeButton: {
            padding: 7,
        },

        submitButton: {
            width: "100%",
            minHeight: 54,
            borderRadius: 16,
            backgroundColor: "#8B5CF6",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
            marginTop: 12,
        },

        submitContent: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
        },

        submitText: {
            color: "#000000",
            fontSize: 16,
            fontWeight: "700",
            textAlign: "center",
        },

        buttonDisabled: {
            opacity: 0.65,
        },

        buttonPressed: {
            opacity: 0.85,
            transform: [{ scale: 0.98 }],
        },

        securityNote: {
            textAlign: "center",
            color: theme.muted,
            fontSize: 11,
            marginTop: -7,
        },

        errorBanner: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.surfaceElevated,
            borderWidth: 1,
            borderColor: theme.danger,
            padding: 13,
            borderRadius: 12,
            marginBottom: 18,
            gap: 10,
        },

        errorText: {
            flex: 1,
            color: theme.danger,
            fontSize: theme.fontSize.sm,
            fontWeight: "500",
            lineHeight: 19,
        },

        footerRow: {
            flexDirection: "row",
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 27,
            gap: 3,
        },

        footerText: {
            fontSize: theme.fontSize.sm,
            color: theme.muted,
        },

        footerLink: {
            fontSize: theme.fontSize.sm,
            fontWeight: "700",
            color: theme.accent,
        },

        guestButton: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            marginTop: 19,
            padding: 10,
        },

        guestText: {
            fontSize: theme.fontSize.sm,
            color: theme.muted,
            fontWeight: "500",
        },
    });
}
