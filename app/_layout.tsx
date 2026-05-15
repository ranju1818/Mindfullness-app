import { Tabs } from 'expo-router';

export default function RootLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="(tabs)/home" options={{ title: 'Home' }} />
      <Tabs.Screen name="(tabs)/practice" options={{ title: 'Practice' }} />
      <Tabs.Screen name="(tabs)/profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
