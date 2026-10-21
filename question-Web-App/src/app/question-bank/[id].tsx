
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useAppTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../constants/theme';

export default function QuestionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useAppTheme();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>QUESTION DETAIL</Text>
          <Text style={styles.title}>Question</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Question ID: {id}</Text>
          <Text style={styles.cardBody}>
            The Questions API is not yet implemented on the backend. This screen
            will display full question details once the endpoint is available.
          </Text>
          <Pressable
            onPress={() => router.push('/syllabus')}
            style={styles.button}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Browse Syllabus →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      backgroundColor: t.surface,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backText: { color: t.text, fontSize: 32, lineHeight: 34 },
    headerText: { flex: 1 },
    eyebrow: { color: t.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    title: { color: t.text, fontSize: 22, fontWeight: '900' },
    content: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
    card: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 480,
      alignItems: 'center',
    },
    cardTitle: { color: t.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
    cardBody: {
      color: t.muted,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
    },
    button: {
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      marginTop: 20,
    },
    buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  });
}
