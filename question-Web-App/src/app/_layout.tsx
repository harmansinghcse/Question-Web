
import { Stack } from 'expo-router';
import { ThemeProvider } from '../providers/ThemeProvider';
import '../../global.css';

export default function RootLayout() {
    console.log('ROOT LAYOUT WITH THEME PROVIDER MOUNTED');
  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </ThemeProvider>
  );
}