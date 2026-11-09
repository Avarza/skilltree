import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import {
  DarkTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useAuth } from '../auth/AuthProvider';
import { Loading } from '../components/ui';
import { GenerateScreen } from '../screens/GenerateScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SkillMapScreen } from '../screens/SkillMapScreen';
import { SkillSessionScreen } from '../screens/SkillSessionScreen';
import { TreeDetailScreen } from '../screens/TreeDetailScreen';
import { useTheme } from '../theme/theme';
import { FloatingTabBar } from './FloatingTabBar';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const renderTabBar = (props: BottomTabBarProps) => (
  <FloatingTabBar {...props} />
);

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, animation: 'shift' }}
      tabBar={renderTabBar}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="SkillMap"
        component={SkillMapScreen}
        options={{ title: 'Skill map' }}
      />
      <Tab.Screen
        name="Generate"
        component={GenerateScreen}
        options={{ title: 'Generate' }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ title: 'Progress' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { status } = useAuth();
  const t = useTheme();
  const navTheme: NavTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: t.colors.background,
      card: t.colors.surface,
      text: t.colors.textPrimary,
      border: t.colors.border,
      primary: t.colors.primary,
    },
  };
  if (status === 'loading') {
    return <Loading />;
  }
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.colors.background },
        }}
      >
        {status === 'signedOut' ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="TreeDetail" component={TreeDetailScreen} />
            <Stack.Screen
              name="SkillSession"
              component={SkillSessionScreen}
              options={{
                animation: 'slide_from_bottom',
                gestureEnabled: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
