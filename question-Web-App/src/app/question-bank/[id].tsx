
import { useLocalSearchParams, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function QuestionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Question Details' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Question Details</Text>
        <Text style={styles.subtitle}>Question ID: {id}</Text>
      </View>
    </>
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
  title: {
    color: '#F7F4FF',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#A6A1BE',
    marginTop: 12,
  },
});
