import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>ZenQuest</Text>
      <Text>Daily Quest preview shell is ready.</Text>
    </View>
  );
}
