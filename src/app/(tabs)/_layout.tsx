import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { colors, fonts } from '../../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(active: IconName, inactive: IconName) {
  function TabIcon({ focused, color }: { focused: boolean; color: import('react-native').ColorValue }) {
    return <Ionicons name={focused ? active : inactive} size={24} color={typeof color === 'string' ? color : undefined} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: '#1F1F27', height: 84, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="vagas" options={{ title: 'Vagas', tabBarIcon: icon('briefcase', 'briefcase-outline') }} />
      <Tabs.Screen
        name="postar"
        options={{
          title: '',
          tabBarAccessibilityLabel: 'Postar',
          tabBarIcon: () => (
            <View style={{ width: 52, height: 38, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
              <Ionicons name="add" size={26} color={colors.accentText} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="conversas" options={{ title: 'Chat', tabBarIcon: icon('chatbubble', 'chatbubble-outline') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
