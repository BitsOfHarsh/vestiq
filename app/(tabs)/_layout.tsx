import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../src/theme';

const { colors } = THEME;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

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
      <Ionicons
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
          tabBarIcon: ({ focused }) => <TabIcon name="bulb" outlineName="bulb-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="grid" outlineName="grid-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="headlines"
        options={{
          title: 'Headlines',
          tabBarIcon: ({ focused }) => <TabIcon name="newspaper" outlineName="newspaper-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ focused }) => <TabIcon name="pie-chart" outlineName="pie-chart-outline" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
