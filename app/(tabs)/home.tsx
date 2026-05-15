import { View, Text } from 'react-native';
import { useGameStore } from '../../src/store/useGameStore';

export default function HomeScreen() {
  const { xpTotal, level, streakCurrent, progressTier, consentStatus } = useGameStore();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>ZenQuest</Text>
      <Text>XP: {xpTotal} · Level: {level}</Text>
      <Text>Streak: {streakCurrent} · Tier: {progressTier}</Text>
      <Text>Consent: {consentStatus}</Text>
      <Text>Daily Quest preview shell is ready.</Text>
    </View>
  );
}
