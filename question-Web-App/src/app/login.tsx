import React, { useState } from 'react';
import { useRouter } from 'expo-router';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import type { AppTheme } from '../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const s = makeStyles(theme);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: trimmedEmail, password });
      router.replace('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header / Brand */}
        <View style={s.headerContainer}>
          <View style={s.logo}>
            <Text style={s.logoText}>Q</Text>
          </View>
          <Text style={s.title}>Welcome Back</Text>
          <Text style={s.subtitle}>
            Sign in to access your Question Web academic account
          </Text>
        </View>

        {/* Error Banner */}
        {errorMessage ? (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} />
            <Text style={s.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Form Card */}
        <View style={s.card}>
          {/* Email Field */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Email Address</Text>
            <View style={s.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={theme.muted}
                style={s.inputIcon}
              />
              <TextInput
                style={s.input}
                placeholder="student@example.com"
                placeholderTextColor={theme.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Password</Text>
            <View style={s.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={theme.muted}
                style={s.inputIcon}
              />
              <TextInput
                style={[s.input, { paddingRight: 40 }]}
                placeholder="••••••••"
                placeholderTextColor={theme.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={s.eyeButton}
                hitSlop={10}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.muted}
                />
              </Pressable>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            style={({ pressed }) => [
              s.submitButton,
              isSubmitting && s.buttonDisabled,
              pressed && !isSubmitting && { opacity: 0.85 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={s.submitText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>

        {/* Switch to Register */}
        <View style={s.footerRow}>
          <Text style={s.footerText}>{"Don't have an account? "}</Text>
          <Pressable onPress={() => router.push('/register' as never)}>
            <Text style={s.footerLink}>Register here</Text>
          </Pressable>
        </View>

        {/* Continue as Guest */}
        <Pressable
          style={s.guestButton}
          onPress={() => router.replace('/')}
          disabled={isSubmitting}
        >
          <Text style={s.guestText}>Continue browsing as guest</Text>
        </Pressable>
      </ScrollView>
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
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 32,
      maxWidth: 440,
      width: '100%',
      alignSelf: 'center',
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: 28,
    },
    logo: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    logoText: {
      color: '#FFFFFF',
      fontSize: 26,
      fontWeight: '800',
    },
    title: {
      fontSize: theme.fontSize['2xl'],
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: theme.fontSize.base,
      color: theme.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceElevated,
      borderLeftWidth: 4,
      borderLeftColor: theme.danger,
      padding: 12,
      borderRadius: theme.radius.md,
      marginBottom: 20,
      gap: 10,
    },
    errorText: {
      flex: 1,
      color: theme.danger,
      fontSize: theme.fontSize.sm,
      fontWeight: '500',
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 24,
      gap: 18,
    },
    fieldGroup: {
      gap: 6,
    },
    label: {
      fontSize: theme.fontSize.sm,
      fontWeight: '600',
      color: theme.text,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: 12,
    },
    inputIcon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      height: 44,
      color: theme.text,
      fontSize: theme.fontSize.base,
    },
    eyeButton: {
      padding: 6,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
      height: 48,
      borderRadius: theme.radius.md,
      gap: 8,
      marginTop: 6,
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    submitText: {
      color: '#FFFFFF',
      fontSize: theme.fontSize.md,
      fontWeight: '600',
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24,
    },
    footerText: {
      fontSize: theme.fontSize.sm,
      color: theme.muted,
    },
    footerLink: {
      fontSize: theme.fontSize.sm,
      fontWeight: '600',
      color: theme.accent,
    },
    guestButton: {
      alignItems: 'center',
      marginTop: 16,
      padding: 8,
    },
    guestText: {
      fontSize: theme.fontSize.sm,
      color: theme.muted,
    },
  });
}
