import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import THEME from '../../src/theme';

const { colors } = THEME;
type IconName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, outlineName, focused }: { name: IconName; outlineName: IconName; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {focused && (
        <View style={{
          position: 'absolute',
          top: -10,
          width: 20, height: 2,
          borderRadius: 1,
          backgroundColor: colors.accent.brand,
        }} />
      )}
      <Feather
        name={focused ? name : outlineName}
        size={22}
        color={focused ? colors.accent.brand : colors.text.muted}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.brand,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.bg.primary,
          borderTopWidth: 0.5,
          borderTopColor: colors.border.subtle,
          height: 60,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="research"
        options={{
          title: 'Research',
          tabBarIcon: ({ focused }) => <TabIcon name="compass" outlineName="compass" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="grid" outlineName="grid" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="headlines"
        options={{
          title: 'Headlines',
          tabBarIcon: ({ focused }) => <TabIcon name="file-text" outlineName="file-text" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ focused }) => <TabIcon name="pie-chart" outlineName="pie-chart" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
