
import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../providers/ThemeProvider';
import type { AppTheme } from '../constants/theme';

export default function ResourcesScreen() {
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
          <Text style={styles.eyebrow}>STUDY MATERIALS</Text>
          <Text style={styles.title}>Resources</Text>
          <Text style={styles.subtitle}>Books, notes and references for your subjects.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>◈</Text>
          <Text style={styles.emptyTitle}>No resources yet</Text>
          <Text style={styles.emptyText}>
            Study resources linked to subjects and chapters will appear here once the
            Resources API is implemented.
          </Text>
          <Pressable
            onPress={() => router.push('/syllabus')}
            style={styles.button}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Browse Syllabus →</Text>
          </Pressable>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
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
    title: { color: t.text, fontSize: 24, fontWeight: '900' },
    subtitle: { color: t.muted, fontSize: 12, marginTop: 4 },
    content: { padding: 20, flex: 1, justifyContent: 'center' },
    emptyBox: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      gap: 10,
    },
    emptyIcon: { color: t.accent, fontSize: 44 },
    emptyTitle: { color: t.text, fontSize: 18, fontWeight: '800' },
    emptyText: { color: t.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
    button: {
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      marginTop: 10,
    },
    buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  });
}
