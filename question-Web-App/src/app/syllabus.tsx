
import { View, Text, StyleSheet } from 'react-native';

export default function SyllabusScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Syllabus</Text>
      <Text style={styles.subtitle}>Your subjects and syllabus will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10101C',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { color: '#F7F4FF', fontSize: 26, fontWeight: '900' },
  subtitle: { color: '#A6A1BE', marginTop: 12, textAlign: 'center' },
});
