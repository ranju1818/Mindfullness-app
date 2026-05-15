import { View, Text, Pressable } from 'react-native';
import { useAwardXp } from '../../src/hooks/useAwardXp';

export default function PracticeScreen() {
  const { completeActivity, loading, error } = useAwardXp();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Practice</Text>
      <Text>Meditation • Breathwork • Wisdom • RAK</Text>

      <Pressable
        onPress={() => completeActivity('meditation_10', 600)}
        disabled={loading}
        style={{ backgroundColor: '#222', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>{loading ? 'Completing...' : 'Complete 10-min Meditation'}</Text>
      </Pressable>

      {error ? <Text style={{ color: '#b00020' }}>Error: {error}</Text> : null}
    </View>
  );
}
