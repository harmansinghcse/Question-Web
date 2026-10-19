
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🕷️ Question Web</Text>
      <Text style={styles.heading}>Ready to level up?</Text>
      <Text style={styles.subtitle}>
        Learn. Practice. Master.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Question Bank</Text>
        <Text style={styles.description}>
          Explore questions by subject and chapter.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1FF',
    padding: 24,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#6545D8',
    marginBottom: 30,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#20183A',
  },
  subtitle: {
    fontSize: 16,
    color: '#746B8D',
    marginTop: 8,
    marginBottom: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#30204F',
  },
  description: {
    fontSize: 15,
    color: '#746B8D',
    marginTop: 10,
  },
});
