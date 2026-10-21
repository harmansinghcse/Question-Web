
import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../providers/ThemeProvider';
import type { AppTheme } from '../constants/theme';

export default function PromptStudioScreen() {
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
          <Text style={styles.eyebrow}>STUDY TOOLS</Text>
          <Text style={styles.title}>Prompt Studio</Text>
          <Text style={styles.subtitle}>Generate AI study prompts from selected questions.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Selected questions section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>✦ Selected Questions</Text>
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No questions selected</Text>
            <Text style={styles.emptyText}>
              Go to the Question Bank and select questions to generate a study prompt.
            </Text>
            <Pressable
              onPress={() => router.push('/question-bank')}
              style={styles.button}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Open Question Bank →</Text>
            </Pressable>
          </View>
        </View>

        {/* Settings stub */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>⚙ Prompt Settings</Text>
          <View style={styles.settingsCard}>
            {[
              { label: 'Answer Detail', value: 'Detailed (Exam Style)' },
              { label: 'Include Diagram / Code', value: 'Off' },
            ].map((item) => (
              <View key={item.label} style={styles.settingRow}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <View style={styles.settingValue}>
                  <Text style={styles.settingValueText}>{item.value}</Text>
                  <Text style={styles.settingChevron}>▾</Text>
                </View>
              </View>
            ))}
          </View>
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
    content: { padding: 20, gap: 20 },
    section: { gap: 10 },
    sectionLabel: { color: t.text, fontSize: 14, fontWeight: '800' },
    emptyBox: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 18,
      padding: 28,
      alignItems: 'center',
      gap: 8,
    },
    emptyIcon: { fontSize: 40 },
    emptyTitle: { color: t.text, fontSize: 16, fontWeight: '800' },
    emptyText: { color: t.muted, fontSize: 12, textAlign: 'center', lineHeight: 19 },
    button: {
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      marginTop: 8,
    },
    buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    settingsCard: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 16,
      overflow: 'hidden',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    settingLabel: { color: t.text, fontSize: 13, fontWeight: '600' },
    settingValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.surfaceAlt,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    settingValueText: { color: t.muted, fontSize: 12 },
    settingChevron: { color: t.muted, fontSize: 11 },
  });
}
