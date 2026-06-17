import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, outlineName, focused }: { name: IconName; outlineName: IconName; focused: boolean }) {
  return <Ionicons name={focused ? name : outlineName} size={22} color={focused ? '#0D9488' : '#57534E'} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0D9488',
        tabBarInactiveTintColor: '#57534E',
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(255,255,255,0.08)',
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
