import { View, Text } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Profile</Text>
      <Text>XP, streak, level, and privacy controls coming next.</Text>
    </View>
  );
}
